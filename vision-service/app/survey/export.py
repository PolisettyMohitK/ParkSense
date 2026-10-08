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


def terrain_glb(ground: GroundModel, path: str | Path, layout: dict | None = None) -> None:
    """Generate a 2.5D GLB mesh of the ground terrain and parking bays using trimesh."""
    import trimesh

    height_grid = ground.heights
    rows, cols = height_grid.shape
    scene = trimesh.Scene()

    if rows < 2 or cols < 2:
        scene.export(str(path), file_type="glb")
        return

    step = 1
    if rows * cols > 60000:
        step = 2

    valid_mask = np.isfinite(height_grid)
    base_height = float(np.nanmin(height_grid)) if valid_mask.any() else 0.0
    filled_heights = np.nan_to_num(height_grid, nan=base_height)
    slopes = np.nan_to_num(ground.slope_pct, nan=0.0)

    vertex_map: dict[tuple[int, int], int] = {}
    vertices: list[list[float]] = []
    vertex_colors: list[list[int]] = []

    for r in range(0, rows, step):
        for c in range(0, cols, step):
            x = ground.origin_x + c * ground.cell_size
            y = ground.origin_y + r * ground.cell_size
            z = float(filled_heights[r, c])
            slope = float(slopes[r, c])
            is_obstacle = bool(ground.obstacle[r, c]) if ground.obstacle is not None else False

            if is_obstacle:
                color = [137, 68, 171, 255]  # Status proposed / obstacle purple
            elif slope < 2.0:
                color = [220, 222, 226, 255]  # Polished silver ground
            elif slope < 5.0:
                color = [178, 94, 0, 255]    # Moderate slope amber
            else:
                color = [215, 0, 21, 255]     # Steep slope occupied/red

            idx = len(vertices)
            vertex_map[(r, c)] = idx
            vertices.append([round(x, 4), round(z, 4), round(-y, 4)])
            vertex_colors.append(color)

    faces: list[list[int]] = []
    for r in range(0, rows - step, step):
        for c in range(0, cols - step, step):
            if (
                (r, c) in vertex_map
                and (r + step, c) in vertex_map
                and (r, c + step) in vertex_map
                and (r + step, c + step) in vertex_map
            ):
                v00 = vertex_map[(r, c)]
                v10 = vertex_map[(r + step, c)]
                v01 = vertex_map[(r, c + step)]
                v11 = vertex_map[(r + step, c + step)]
                faces.append([v00, v10, v01])
                faces.append([v01, v10, v11])

    if vertices and faces:
        terrain_mesh = trimesh.Trimesh(
            vertices=np.array(vertices, dtype=np.float32),
            faces=np.array(faces, dtype=np.int32),
            vertex_colors=np.array(vertex_colors, dtype=np.uint8),
            process=False,
        )
        scene.add_geometry(terrain_mesh, node_name="terrain")

    if layout and "bays" in layout:
        for bay in layout["bays"]:
            coords = bay.get("polygon", [])
            if len(coords) >= 4:
                pts = coords[:4]
                elevations = []
                for bx, by in pts:
                    c = int(np.clip((bx - ground.origin_x) / ground.cell_size, 0, cols - 1))
                    r = int(np.clip((by - ground.origin_y) / ground.cell_size, 0, rows - 1))
                    elevations.append(float(filled_heights[r, c]))
                mean_z = (sum(elevations) / len(elevations)) + 0.05

                p = np.array([[bx, mean_z, -by] for bx, by in pts], dtype=np.float32)
                b_faces = np.array([[0, 1, 2], [0, 2, 3]], dtype=np.int32)
                b_colors = np.array([[26, 127, 55, 220]] * 4, dtype=np.uint8)  # statusFree green
                bay_mesh = trimesh.Trimesh(
                    vertices=p,
                    faces=b_faces,
                    vertex_colors=b_colors,
                    process=False,
                )
                scene.add_geometry(bay_mesh, node_name=f"bay_{bay.get('code', 'slot')}")

    scene.export(str(path), file_type="glb")

