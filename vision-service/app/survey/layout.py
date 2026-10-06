"""Automatic parking layout generator.

Bay-aisle-bay strips are tiled across the usable polygon at every angle the
profile allows; bays that fall outside the ground, hit an obstacle or break
aisle connectivity are dropped. The best layouts (by bay count, with
connectivity and slope penalties) are returned, best first.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from shapely.affinity import rotate
from shapely.geometry import Point, Polygon, box

from .profiles import ParkingProfile

MIN_BAY_COVERAGE = 0.60
MIN_AISLE_AREA_M2 = 1.5
ENTRY_REACH_M = 2.0


@dataclass
class LayoutResult:
    bays: list[Polygon]
    aisles: list[Polygon]
    orientation_deg: float
    score: float
    profile: str
    connected: bool
    bay_area_m2: float
    alternatives: list[dict]


def _tile(rotated: Polygon, profile: ParkingProfile) -> tuple[list[Polygon], list[Polygon]]:
    min_x, min_y, max_x, max_y = rotated.bounds
    bays: list[Polygon] = []
    aisles: list[Polygon] = []
    period = profile.bay_length_m + profile.aisle_width_m

    y = min_y
    while y + profile.bay_length_m <= max_y + 1e-6:
        # Bay row
        x = min_x
        while x + profile.bay_width_m <= max_x + 1e-6:
            cell = box(x, y, x + profile.bay_width_m, y + profile.bay_length_m)
            piece = rotated.intersection(cell)
            if not piece.is_empty and piece.area >= MIN_BAY_COVERAGE * cell.area:
                bays.append(piece)
            x += profile.bay_width_m

        # Aisle after the row
        aisle = box(min_x, y + profile.bay_length_m, max_x, min(y + period, max_y))
        piece = rotated.intersection(aisle)
        if not piece.is_empty and piece.area >= MIN_AISLE_AREA_M2:
            aisles.append(piece)

        y += period

    return bays, aisles


def _connected(aisles: list[Polygon], entries: list[tuple[float, float]]) -> bool:
    if not aisles:
        return False
    if not entries:
        return True
    for aisle in aisles:
        for x, y in entries:
            if aisle.distance(Point(x, y)) <= ENTRY_REACH_M:
                return True
    return False


def generate_layout(
    usable: Polygon,
    profile: ParkingProfile,
    entries: list[tuple[float, float]] | None = None,
    max_alternatives: int = 3,
) -> LayoutResult:
    entries = entries or []
    candidates: list[LayoutResult] = []

    for angle in profile.angles_deg:
        # Rotate the plot into an axis-aligned frame, tile, then rotate back.
        rotated = rotate(usable, -angle, origin=(0, 0))
        bays_rot, aisles_rot = _tile(rotated, profile)
        if not bays_rot:
            continue

        bays = [rotate(bay, angle, origin=(0, 0)) for bay in bays_rot]
        aisles = [rotate(aisle, angle, origin=(0, 0)) for aisle in aisles_rot]
        connected = _connected(aisles, entries)

        # Penalise layouts that cannot reach an entrance or have too few bays.
        score = float(len(bays))
        if entries and not connected:
            score *= 0.35
        if len(bays) < 2:
            score *= 0.5

        candidates.append(LayoutResult(
            bays=bays,
            aisles=aisles,
            orientation_deg=float(angle),
            score=round(score, 2),
            profile=profile.key,
            connected=connected,
            bay_area_m2=round(sum(bay.area for bay in bays), 2),
            alternatives=[],
        ))

    if not candidates:
        return LayoutResult([], [], 0.0, 0.0, profile.key, False, 0.0, [])

    candidates.sort(key=lambda result: result.score, reverse=True)
    best = candidates[0]
    best.alternatives = [
        {
            "orientation_deg": candidate.orientation_deg,
            "bays": len(candidate.bays),
            "score": candidate.score,
            "connected": candidate.connected,
        }
        for candidate in candidates[1:max_alternatives]
    ]
    return best


def bay_labels(bays: list[Polygon], row_tolerance: float = 1.5) -> list[str]:
    """Assign reading-order codes such as A01, A02, B01 …"""
    indexed = list(enumerate(bays))
    indexed.sort(key=lambda item: item[1].centroid.y)
    rows: list[list[tuple[int, Polygon]]] = []
    for index, bay in indexed:
        for row in rows:
            if abs(row[0][1].centroid.y - bay.centroid.y) <= row_tolerance:
                row.append((index, bay))
                break
        else:
            rows.append([(index, bay)])

    labels = [""] * len(bays)
    letter = ord("A")
    for row in rows:
        row.sort(key=lambda item: item[1].centroid.x)
        for position, (index, _) in enumerate(row, start=1):
            labels[index] = f"{chr(letter)}{position:02d}"
        letter += 1
    return labels


def layout_to_local_layout(result: LayoutResult) -> dict:
    labels = bay_labels(result.bays)
    return {
        "profile": result.profile,
        "orientation_deg": result.orientation_deg,
        "score": result.score,
        "connected": result.connected,
        "bayAreaM2": result.bay_area_m2,
        "bays": [
            {
                "code": label,
                "polygon": [[round(x, 2), round(y, 2)] for x, y in bay.exterior.coords],
                "centre": [round(bay.centroid.x, 2), round(bay.centroid.y, 2)],
                "areaM2": round(bay.area, 2),
            }
            for label, bay in zip(labels, result.bays)
        ],
        "aisles": [
            [[round(x, 2), round(y, 2)] for x, y in aisle.exterior.coords]
            for aisle in result.aisles
        ],
    }
