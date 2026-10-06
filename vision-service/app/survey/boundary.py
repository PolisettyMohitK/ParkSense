"""Usable area: the polygon where bays are actually allowed."""

from __future__ import annotations

import numpy as np
from shapely import concave_hull
from shapely.geometry import MultiPoint, Polygon
from shapely.ops import unary_union

from .profiles import ParkingProfile
from .terrain import GroundModel

OBSTACLE_BUFFER_M = 0.35
DEFAULT_INSET_M = 0.30


def usable_polygon(
    ground: GroundModel,
    profile: ParkingProfile,
    exclusions: list[Polygon] | None = None,
    boundary_hint: Polygon | None = None,
    inset_m: float = DEFAULT_INSET_M,
) -> Polygon | None:
    """Concave hull of drivable ground, minus obstacles, exclusions and insets."""
    rows, cols = ground.heights.shape
    xs = ground.origin_x + (np.arange(cols) + 0.5) * ground.cell_size
    ys = ground.origin_y + (np.arange(rows) + 0.5) * ground.cell_size

    drivable = (
        np.isfinite(ground.heights)
        & (ground.slope_pct <= profile.max_slope_pct)
        & (ground.roughness <= profile.max_roughness_m)
        & (~ground.obstacle)
    )
    row_idx, col_idx = np.where(drivable)
    # A usable area must cover a meaningful share of the surveyed ground;
    # scattered low-slope cells should not become a "plot".
    minimum_cells = max(25, int(0.01 * ground.heights.size))
    if len(row_idx) < minimum_cells:
        return None

    points = np.column_stack([xs[col_idx], ys[row_idx]])
    hull = concave_hull(MultiPoint(points), ratio=0.25)
    polygon = hull.buffer(-inset_m) if inset_m > 0 else hull
    if polygon.is_empty:
        return None

    obstacle_rows, obstacle_cols = np.where(ground.obstacle)
    if len(obstacle_rows) > 0:
        obstacle_points = np.column_stack([xs[obstacle_cols], ys[obstacle_rows]])
        obstacle_area = MultiPoint(obstacle_points).buffer(OBSTACLE_BUFFER_M)
        polygon = polygon.difference(obstacle_area)

    for exclusion in exclusions or []:
        polygon = polygon.difference(exclusion)

    if boundary_hint is not None:
        polygon = polygon.intersection(boundary_hint)

    if polygon.is_empty:
        return None
    if polygon.geom_type == "MultiPolygon":
        polygon = max(polygon.geoms, key=lambda geometry: geometry.area)
    return polygon if polygon.geom_type == "Polygon" else None


def entry_points_from_context(context: dict | None, usable: Polygon | None) -> list[tuple[float, float]]:
    """Nearest road/access points from map context, kept inside/near the plot."""
    if not context or usable is None:
        return []
    candidates = context.get("access_points") or []
    result = []
    for point in candidates:
        if "x" in point and "y" in point:
            result.append((float(point["x"]), float(point["y"])))
    return result
