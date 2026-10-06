"""Terrain: ground extraction and a metric 10 cm ground model.

Pure numpy/shapely so the pipeline runs on CPU without COLMAP/Open3D. If
``pycolmap``/``open3d`` become available, :mod:`app.survey.reconstruct` will
produce a denser cloud, but this module is unchanged.
"""

from __future__ import annotations

import math
import warnings
from dataclasses import dataclass, field

import cv2
import numpy as np

CELL_SIZE_M = 0.10
GROUND_BAND_M = 0.08
OBSTACLE_HEIGHT_M = 0.20
MIN_OBSTACLE_POINTS = 4


@dataclass
class GroundModel:
    cell_size: float
    origin_x: float
    origin_y: float
    heights: np.ndarray          # (rows, cols) ground height, NaN where unknown
    slope_pct: np.ndarray        # (rows, cols) slope in percent
    roughness: np.ndarray        # (rows, cols) local height deviation in metres
    obstacle: np.ndarray         # (rows, cols) bool
    obstacle_height: np.ndarray  # (rows, cols) metres above ground
    plane: tuple[float, float, float, float] | None
    points: np.ndarray
    ground_points: np.ndarray
    stats: dict = field(default_factory=dict)

    @property
    def width_m(self) -> float:
        return self.heights.shape[1] * self.cell_size

    @property
    def length_m(self) -> float:
        return self.heights.shape[0] * self.cell_size


def _fit_plane_ransac(points: np.ndarray, threshold: float = GROUND_BAND_M,
                      iterations: int = 400, seed: int = 7):
    rng = np.random.default_rng(seed)
    count = len(points)
    if count < 3:
        return None
    sample = points if count <= 4000 else points[rng.choice(count, 4000, replace=False)]
    best_normal, best_d, best_inliers = None, None, -1
    for _ in range(iterations):
        idx = rng.choice(len(sample), 3, replace=False)
        p0, p1, p2 = sample[idx]
        normal = np.cross(p1 - p0, p2 - p0)
        norm = np.linalg.norm(normal)
        if norm < 1e-6:
            continue
        normal = normal / norm
        d = -float(normal.dot(p0))
        inliers = int((np.abs(sample.dot(normal) + d) < threshold).sum())
        if inliers > best_inliers:
            best_normal, best_d, best_inliers = normal, d, inliers
    if best_normal is None:
        return None
    # Keep the normal pointing up so signed distances are heights.
    if best_normal[2] < 0:
        best_normal, best_d = -best_normal, -best_d
    # Least-squares refinement on the inlier set. The plane normal is the
    # eigenvector of the 3x3 covariance with the smallest eigenvalue, which is
    # equivalent to an SVD but orders of magnitude cheaper.
    distances = np.abs(points.dot(best_normal) + best_d)
    inliers = points[distances < threshold]
    if len(inliers) >= 3:
        centre = inliers.mean(axis=0)
        covariance = np.cov((inliers - centre).T)
        _, eigenvectors = np.linalg.eigh(covariance)
        normal = eigenvectors[:, 0]
        if normal[2] < 0:
            normal = -normal
        d = -float(normal.dot(centre))
        best_normal, best_d = normal, d
    return best_normal, best_d


def _grid_index(points: np.ndarray, origin_x: float, origin_y: float, cell: float,
                rows: int, cols: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    col = np.floor((points[:, 0] - origin_x) / cell).astype(np.int64)
    row = np.floor((points[:, 1] - origin_y) / cell).astype(np.int64)
    valid = (row >= 0) & (row < rows) & (col >= 0) & (col < cols)
    return row[valid], col[valid], valid


def _fill_gaps(grid: np.ndarray, rounds: int = 6) -> np.ndarray:
    """Nearest-neighbour gap filling so slope is continuous across the plot."""
    filled = grid.copy()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        for _ in range(rounds):
            nan = np.isnan(filled)
            if not nan.any():
                break
            padded = np.pad(filled, 1, constant_values=np.nan)
            neighbours = np.stack([
                padded[:-2, 1:-1], padded[2:, 1:-1], padded[1:-1, :-2], padded[1:-1, 2:],
            ])
            mean = np.nanmean(neighbours, axis=0)
            filled[nan] = mean[nan]
    return filled


def _absolute_heights(heights: np.ndarray, origin_x: float, origin_y: float, cell: float,
                      plane_normal: np.ndarray, plane_d: float) -> np.ndarray:
    """Residual grid + fitted plane -> true ground elevation per cell."""
    rows, cols = heights.shape
    xs = origin_x + (np.arange(cols) + 0.5) * cell
    ys = origin_y + (np.arange(rows) + 0.5) * cell
    grid_x, grid_y = np.meshgrid(xs, ys)
    a, b, c = plane_normal
    denominator = c if abs(c) > 1e-9 else 1e-9
    plane_z = -(a * grid_x + b * grid_y + plane_d) / denominator
    return plane_z + heights


def build_ground_model(points: np.ndarray, cell: float = CELL_SIZE_M) -> GroundModel:
    """Extract the ground and rasterise it into a metric grid."""
    if len(points) < 50:
        raise ValueError("Not enough points to build a terrain model")

    plane = _fit_plane_ransac(points)
    if plane is None:
        raise ValueError("Could not determine a ground plane")

    normal, d = plane
    distances = points.dot(normal) + d
    ground_mask = np.abs(distances) < GROUND_BAND_M
    ground_points = points[ground_mask]
    if len(ground_points) < 50:
        ground_points = points
        ground_mask = np.ones(len(points), dtype=bool)

    # Align to the ground plane: height = signed distance from the plane
    # (positive above the ground, with an upward normal).
    height_above_plane = distances

    min_x, min_y = points[:, 0].min(), points[:, 1].min()
    max_x, max_y = points[:, 0].max(), points[:, 1].max()
    cols = max(2, int(np.ceil((max_x - min_x) / cell)) + 1)
    rows = max(2, int(np.ceil((max_y - min_y) / cell)) + 1)

    heights = np.full((rows, cols), np.nan)
    roughness = np.zeros((rows, cols))
    obstacle = np.zeros((rows, cols), dtype=bool)
    obstacle_height = np.zeros((rows, cols))

    row_idx, col_idx, _ = _grid_index(ground_points, min_x, min_y, cell, rows, cols)
    ground_heights = height_above_plane[ground_mask].astype(np.float64)

    # Vectorised per-cell statistics (sum, sum of squares, count).
    total = np.zeros((rows, cols))
    total_sq = np.zeros((rows, cols))
    counts = np.zeros((rows, cols))
    np.add.at(total, (row_idx, col_idx), ground_heights)
    np.add.at(total_sq, (row_idx, col_idx), ground_heights ** 2)
    np.add.at(counts, (row_idx, col_idx), 1.0)

    known = counts > 0
    heights[known] = total[known] / counts[known]
    variance = np.zeros_like(total)
    variance[known] = np.maximum(total_sq[known] / counts[known] - heights[known] ** 2, 0.0)
    roughness[known] = np.sqrt(variance[known])

    # Obstacles: points well above the ground surface.
    all_rows, all_cols, all_valid = _grid_index(points, min_x, min_y, cell, rows, cols)
    ground_reference = np.where(np.isfinite(heights[all_rows, all_cols]), heights[all_rows, all_cols], 0.0)
    above = height_above_plane[all_valid] - ground_reference

    high_mask = above > OBSTACLE_HEIGHT_M
    high_counts = np.zeros((rows, cols))
    high_max = np.zeros((rows, cols))
    np.add.at(high_counts, (all_rows[high_mask], all_cols[high_mask]), 1.0)
    np.maximum.at(high_max, (all_rows[high_mask], all_cols[high_mask]), above[high_mask])
    obstacle = high_counts >= MIN_OBSTACLE_POINTS
    obstacle_height = np.where(obstacle, high_max, 0.0)

    unknown_before_fill = int(np.isnan(heights).sum())
    heights = _fill_gaps(heights)

    # True ground slope = plane tilt + residual relief. Smoothing over ~0.5 m
    # removes per-cell sampling noise while keeping real undulations.
    absolute = _absolute_heights(heights, float(min_x), float(min_y), cell, normal, d)
    smoothed = cv2.blur(absolute.astype(np.float32), (5, 5))
    grad_y, grad_x = np.gradient(smoothed, cell)
    slope_pct = np.sqrt(grad_x ** 2 + grad_y ** 2) * 100.0

    # Global tilt: angle between the fitted plane normal and vertical.
    tilt = math.degrees(math.acos(min(1.0, abs(float(normal[2])))))
    global_slope_pct = math.tan(math.radians(tilt)) * 100.0

    # Gradient spreads NaN to neighbours, so the slope stats use the slope's
    # own finite mask rather than the smoothed grid's.
    valid = np.isfinite(slope_pct)
    stats = {
        "extent_x_m": float(max_x - min_x),
        "extent_y_m": float(max_y - min_y),
        "ground_points": int(len(ground_points)),
        "total_points": int(len(points)),
        "global_slope_pct": float(global_slope_pct),
        "slope_pct_mean": float(np.mean(slope_pct[valid])) if valid.any() else 0.0,
        "slope_pct_p95": float(np.percentile(slope_pct[valid], 95)) if valid.any() else 0.0,
        "roughness_m_p95": float(np.percentile(roughness[roughness > 0], 95))
        if (roughness > 0).any() else 0.0,
        "obstacle_cells": int(obstacle.sum()),
        "unknown_cells": unknown_before_fill,
        "plane_normal": [float(v) for v in normal],
    }
    return GroundModel(
        cell_size=cell,
        origin_x=float(min_x),
        origin_y=float(min_y),
        heights=heights,
        slope_pct=slope_pct,
        roughness=roughness,
        obstacle=obstacle,
        obstacle_height=obstacle_height,
        plane=(float(normal[0]), float(normal[1]), float(normal[2]), float(d)),
        points=points,
        ground_points=ground_points,
        stats=stats,
    )
