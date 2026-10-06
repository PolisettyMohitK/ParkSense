"""Export survey artefacts: GeoJSON, report JSON and a top-down PNG."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import Polygon

from .bundle import local_metres_to_latlng
from .terrain import GroundModel


def _polygon_to_latlng(polygon: Polygon, origin_lat: float, origin_lon: float) -> list[list[float]]:
    return [
        list(local_metres_to_latlng(x, y, origin_lat, origin_lon))
        for x, y in polygon.exterior.coords
    ]


def layout_geojson(
    usable: Polygon,
    layout: dict,
    origin_lat: float | None,
    origin_lon: float | None,
) -> dict:
    features = []
    if origin_lat is not None and origin_lon is not None:
        features.append({
            "type": "Feature",
            "properties": {"kind": "usable_area"},
            "geometry": {"type": "Polygon", "coordinates": [_polygon_to_latlng(usable, origin_lat, origin_lon)]},
        })
        for bay in layout.get("bays", []):
            polygon = Polygon(bay["polygon"])
            features.append({
                "type": "Feature",
                "properties": {"kind": "bay", "code": bay["code"], "areaM2": bay["areaM2"]},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [_polygon_to_latlng(polygon, origin_lat, origin_lon)],
                },
            })
    return {
        "type": "FeatureCollection",
        "properties": {
            "localFrame": "metres, origin at reported GPS",
            "origin": {"lat": origin_lat, "lng": origin_lon},
        },
        "features": features,
    }


def report_json(result_dict: dict) -> str:
    return json.dumps(result_dict, indent=2)


def ortho_png(ground: GroundModel, layout: dict, path: str | Path) -> None:
    """Top-down rendering with slope shading and bays outlined."""
    height_grid = ground.heights
    rows, cols = height_grid.shape
    normalised = np.nan_to_num(height_grid, nan=float(np.nanmin(height_grid) if np.isfinite(height_grid).any() else 0.0))
    span = float(normalised.max() - normalised.min()) or 1.0
    grey = ((normalised - normalised.min()) / span * 200 + 30).astype(np.uint8)
    image = cv2.cvtColor(grey, cv2.COLOR_GRAY2BGR)

    def to_pixel(x: float, y: float) -> tuple[int, int]:
        col = int((x - ground.origin_x) / ground.cell_size)
        row = int((y - ground.origin_y) / ground.cell_size)
        return col, row

    for bay in layout.get("bays", []):
        points = np.array([[to_pixel(x, y)] for x, y in bay["polygon"]], dtype=np.int32)
        cv2.polylines(image, [points.reshape(-1, 1, 2)], True, (80, 180, 90), 1)
        centre = to_pixel(bay["centre"][0], bay["centre"][1])
        cv2.putText(image, bay["code"], (centre[0] - 8, centre[1]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (240, 240, 240), 1, cv2.LINE_AA)

    for aisle in layout.get("aisles", []):
        points = np.array([[to_pixel(x, y)] for x, y in aisle], dtype=np.int32)
        cv2.polylines(image, [points.reshape(-1, 1, 2)], True, (60, 120, 220), 1)

    cv2.imwrite(str(path), image)
