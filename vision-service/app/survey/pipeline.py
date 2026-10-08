"""Survey pipeline: bundle in, metrics + layout out."""

from __future__ import annotations

import json
from pathlib import Path

from .boundary import usable_polygon
from .bundle import SurveyBundle, average_gps
from .context import fetch_context
from .export import layout_geojson, ortho_png, terrain_glb
from .layout import generate_layout, layout_to_local_layout
from .profiles import get_profile
from .reconstruct import reconstruct
from .terrain import build_ground_model

MANUAL_MEASURE_EXTENT_M = 60.0
DRIFT_HIGH = 0.005
DRIFT_MEDIUM = 0.02


def _confidence(extent_m: float, loop_error_m: float | None, frames: int,
                unknown_cells: int, total_cells: int) -> dict:
    drift_ratio = None if not extent_m else (loop_error_m or 0.0) / extent_m
    reasons: list[str] = []

    if drift_ratio is None:
        grade = "low"
        reasons.append("no loop-closure measurement")
    elif drift_ratio <= DRIFT_HIGH and frames >= 30:
        grade = "high"
    elif drift_ratio <= DRIFT_MEDIUM:
        grade = "medium"
        reasons.append(f"loop drift {drift_ratio * 100:.2f}% of extent")
    else:
        grade = "low"
        reasons.append(f"loop drift {drift_ratio * 100:.2f}% of extent")

    unknown_ratio = unknown_cells / total_cells if total_cells else 1.0
    if unknown_ratio > 0.35:
        grade = "low" if grade != "high" else "medium"
        reasons.append(f"{unknown_ratio * 100:.0f}% of the grid has no ground data")

    if extent_m > MANUAL_MEASURE_EXTENT_M:
        grade = "low" if grade == "medium" else grade
        reasons.append("plot larger than 60 m; measure one edge with a tape to anchor scale")

    if grade != "high" and not reasons:
        reasons.append("limited coverage")

    return {
        "grade": grade,
        "driftRatio": None if drift_ratio is None else round(drift_ratio, 5),
        "manualFallbackRecommended": grade == "low" or extent_m > MANUAL_MEASURE_EXTENT_M,
        "reasons": reasons,
    }


def run_survey(
    bundle: SurveyBundle,
    profile_key: str | None = None,
    include_context: bool = True,
    artefacts_dir: Path | None = None,
) -> dict:
    profile = get_profile(profile_key or bundle.meta.profile)
    notes: list[str] = []

    reconstruction = reconstruct(bundle)
    ground = build_ground_model(reconstruction.points)

    usable = usable_polygon(ground, profile)
    if usable is None:
        return {
            "status": "failed",
            "profile": profile.key,
            "notes": ["No usable area survived the slope/obstacle limits"],
            "terrain": ground.stats,
        }

    latitude, longitude = (average_gps(bundle) or (None, None))
    context = fetch_context(latitude, longitude) if include_context else None
    context_payload = {
        "available": bool(context and context.available),
        "buildings": len(context.buildings) if context else 0,
        "roads": len(context.roads) if context else 0,
        "accessPoints": len(context.access_points) if context else 0,
        "notes": (context.notes if context else []) + [
            "Map context is not yet geo-registered to the AR frame; entry points are "
            "shown for orientation but not used for aisle connectivity."
        ],
    }

    entries: list[tuple[float, float]] = []  # see note above
    layout = generate_layout(usable, profile, entries=entries)
    layout_json = layout_to_local_layout(layout)

    # Plot size comes from the measured ground extent (orientation independent);
    # the usable polygon is inset and may clip edges.
    extent_x = ground.stats["extent_x_m"]
    extent_y = ground.stats["extent_y_m"]
    dimensions = {
        "lengthM": round(max(extent_x, extent_y), 2),
        "breadthM": round(min(extent_x, extent_y), 2),
        "usableAreaM2": round(usable.area, 2),
    }

    confidence = _confidence(
        extent_m=max(dimensions["lengthM"], dimensions["breadthM"]),
        loop_error_m=reconstruction.loop_error_m,
        frames=reconstruction.frames_used,
        unknown_cells=ground.stats.get("unknown_cells", 0),
        total_cells=int(ground.heights.size),
    )
    if confidence["manualFallbackRecommended"]:
        notes.append("Confidence is limited — measure one plot edge and scale the survey.")

    result = {
        "status": "completed",
        "profile": profile.key,
        "plotName": bundle.meta.plot_name,
        "dimensions": dimensions,
        "terrain": ground.stats,
        "layout": layout_json,
        "context": context_payload,
        "confidence": confidence,
        "reconstruction": {
            "method": reconstruction.method,
            "framesUsed": reconstruction.frames_used,
            "loopErrorM": None if reconstruction.loop_error_m is None else round(reconstruction.loop_error_m, 3),
            "points": int(len(reconstruction.points)),
            "notes": reconstruction.notes,
        },
        "usablePolygon": [[round(x, 2), round(y, 2)] for x, y in usable.exterior.coords],
        "origin": {"lat": latitude, "lng": longitude},
        "notes": notes,
    }

    if artefacts_dir is not None:
        artefacts_dir = Path(artefacts_dir)
        artefacts_dir.mkdir(parents=True, exist_ok=True)
        geojson = layout_geojson(usable, layout_json, latitude, longitude)
        (artefacts_dir / "layout.geojson").write_text(json.dumps(geojson, indent=2), encoding="utf-8")
        (artefacts_dir / "report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        ortho_png(ground, layout_json, artefacts_dir / "ortho.png")
        terrain_glb(ground, artefacts_dir / "terrain.glb", layout_json)
        result["artifacts"] = ["layout.geojson", "report.json", "ortho.png", "terrain.glb"]

    return result


def relayout(previous_result: dict, profile_key: str, bundle: SurveyBundle) -> dict:
    """Re-run only the layout stage for a different profile."""
    profile = get_profile(profile_key)
    from shapely.geometry import Polygon

    usable = Polygon(previous_result["usablePolygon"])
    layout = generate_layout(usable, profile, entries=[])
    layout_json = layout_to_local_layout(layout)
    updated = dict(previous_result)
    updated["profile"] = profile.key
    updated["layout"] = layout_json
    updated["dimensions"] = {
        **previous_result.get("dimensions", {}),
        "usableAreaM2": round(usable.area, 2),
    }
    return updated
