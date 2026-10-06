"""Synthetic survey bundles: a known plot rendered into posed depth frames.

The scene is a rectangular plot ``length_m`` x ``breadth_m`` with a chosen
ground slope and one cylindrical obstacle (a tree). A camera walks the
perimeter at eye height looking at the centre; each frame gets an exact depth
map rendered analytically, so the pipeline can be checked against ground truth.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np


def _look_at_quaternion(camera: np.ndarray, target: np.ndarray) -> tuple[float, float, float, float]:
    """Quaternion for a camera at ``camera`` looking at ``target`` (y-down convention)."""
    forward = target - camera
    forward /= np.linalg.norm(forward)
    world_up = np.array([0.0, 0.0, 1.0])
    # Camera looks along +z, with +y down, so right = forward x up gives a
    # conventional OpenGL-style basis when the camera is above the ground.
    right = np.cross(forward, world_up)
    right /= np.linalg.norm(right)
    down = np.cross(forward, right)

    rotation = np.stack([right, down, forward], axis=1)  # camera -> world

    trace = rotation[0, 0] + rotation[1, 1] + rotation[2, 2]
    if trace > 0:
        s = math.sqrt(trace + 1.0) * 2
        w = 0.25 * s
        x = (rotation[2, 1] - rotation[1, 2]) / s
        y = (rotation[0, 2] - rotation[2, 0]) / s
        z = (rotation[1, 0] - rotation[0, 1]) / s
    elif rotation[0, 0] > rotation[1, 1] and rotation[0, 0] > rotation[2, 2]:
        s = math.sqrt(1.0 + rotation[0, 0] - rotation[1, 1] - rotation[2, 2]) * 2
        w = (rotation[2, 1] - rotation[1, 2]) / s
        x = 0.25 * s
        y = (rotation[0, 1] + rotation[1, 0]) / s
        z = (rotation[0, 2] + rotation[2, 0]) / s
    else:
        s = math.sqrt(1.0 + rotation[1, 1] - rotation[0, 0] - rotation[2, 2]) * 2
        w = (rotation[0, 2] - rotation[2, 0]) / s
        x = (rotation[0, 1] + rotation[1, 0]) / s
        y = 0.25 * s
        z = (rotation[1, 2] + rotation[2, 1]) / s
    return float(x), float(y), float(z), float(w)


def _render_depth(
    camera: np.ndarray,
    rotation: np.ndarray,
    intrinsics: dict,
    length_m: float,
    breadth_m: float,
    slope: float,
    obstacle: tuple[float, float, float, float] | None,
    noise_std: float = 0.01,
    seed: int = 0,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    width, height = intrinsics["width"], intrinsics["height"]
    fx, fy, cx, cy = intrinsics["fx"], intrinsics["fy"], intrinsics["cx"], intrinsics["cy"]

    u, v = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    dirs_cam = np.stack([(u - cx) / fx, (v - cy) / fy, np.ones_like(u)], axis=-1)
    lengths = np.linalg.norm(dirs_cam, axis=-1, keepdims=True)
    dirs_cam /= lengths
    dirs_world = dirs_cam @ rotation.T  # camera -> world

    # Ray vs bounded ground plane z = slope * x, inside the rectangle.
    origin_z = camera[2]
    denom = dirs_world[..., 2] - slope * dirs_world[..., 0]
    with np.errstate(divide="ignore", invalid="ignore"):
        t_ground = (slope * camera[0] - origin_z) / denom
    hit = np.isfinite(t_ground) & (t_ground > 0)
    px = camera[0] + t_ground * dirs_world[..., 0]
    py = camera[1] + t_ground * dirs_world[..., 1]
    inside = hit & (px >= 0.0) & (px <= length_m) & (py >= 0.0) & (py <= breadth_m)
    t = np.where(inside, t_ground, np.inf)

    # Ray vs an axis-aligned box (a mound / structure / debris pile).
    if obstacle is not None:
        ox, oy, half_x, half_y, height_z = obstacle
        bounds_min = np.array([ox - half_x, oy - half_y, 0.0])
        bounds_max = np.array([ox + half_x, oy + half_y, height_z])
        safe_dir = np.where(np.abs(dirs_world) < 1e-9, 1e-9, dirs_world)
        t1 = (bounds_min - camera) / safe_dir
        t2 = (bounds_max - camera) / safe_dir
        t_near = np.max(np.minimum(t1, t2), axis=-1)
        t_far = np.min(np.maximum(t1, t2), axis=-1)
        valid_box = (t_far >= np.maximum(t_near, 0.0)) & (t_far > 0)
        t_box = np.where(t_near > 0, t_near, t_far)
        hits = valid_box & (t_box > 0) & (t_box < t)
        t = np.where(hits, t_box, t)

    depth_z = t * (1.0 / lengths[..., 0])  # camera-space z (metres)
    depth_z[~np.isfinite(depth_z)] = 0.0
    depth_z += rng.normal(0.0, noise_std, depth_z.shape).astype(np.float32) * np.where(depth_z > 0, 1.0, 0.0)
    return np.clip(depth_z, 0.0, None).astype(np.float32)


def write_synthetic_bundle(
    root: str | Path,
    length_m: float = 20.0,
    breadth_m: float = 12.0,
    slope: float = 0.02,
    obstacle: tuple[float, float, float, float, float] | None = (9.0, 5.0, 1.0, 1.0, 0.8),
    frames_per_side: int = 6,
    camera_height: float = 1.5,
    noise_std: float = 0.01,
    pin_lat: float = 12.9756,
    pin_lng: float = 77.6053,
    profile: str = "CAR",
) -> Path:
    root = Path(root)
    (root / "depth").mkdir(parents=True, exist_ok=True)
    intrinsics = {"fx": 44.0, "fy": 44.0, "cx": 32.0, "cy": 24.0, "width": 64, "height": 48}

    # Lawnmower path: lanes along x, then two lanes along y for the outer edges.
    # The phone is pitched down (~37 deg) looking 2 m ahead, like a real walk.
    samples: list[tuple[float, float, float]] = []  # x, y, heading (radians)
    lane_offset = 0.6
    lane_spacing = 3.6
    y = lane_offset
    forward = True
    while y <= breadth_m - lane_offset + 1e-6:
        xs = np.arange(lane_offset, length_m - lane_offset + 1e-6, 2.0) if forward else \
            np.arange(length_m - lane_offset, lane_offset - 1e-6, -2.0)
        for x in xs:
            samples.append((float(x), float(y), 0.0 if forward else math.pi))
        forward = not forward
        y += lane_spacing

    for x in (lane_offset, length_m - lane_offset):
        ys = np.arange(lane_offset, breadth_m - lane_offset + 1e-6, 2.0)
        for lane_y in ys:
            samples.append((float(x), float(lane_y), math.pi / 2))
    # Close the loop: a real walk ends where it started (drift check).
    samples.append((lane_offset, lane_offset, 0.0))

    frames = []
    for frame_index, (x, y_pos, heading) in enumerate(samples):
        camera = np.array([x, y_pos, camera_height], dtype=float)
        target = np.array([x + 2.0 * math.cos(heading), y_pos + 2.0 * math.sin(heading), 0.0])
        quaternion = _look_at_quaternion(camera, target)
        rotation = _rotation_from_quaternion(quaternion)
        depth = _render_depth(
            camera, rotation, intrinsics, length_m, breadth_m, slope, obstacle,
            noise_std=noise_std, seed=frame_index)
        frame_id = f"{frame_index:04d}"
        cv2.imwrite(str(root / "depth" / f"{frame_id}.png"),
                    np.clip(depth * 1000.0, 0, 65535).astype(np.uint16))
        frames.append({
            "id": frame_id,
            "translation": [float(v) for v in camera],
            "rotation_quaternion": [float(v) for v in quaternion],
            "intrinsics": intrinsics,
        })

    (root / "meta.json").write_text(json.dumps({
        "plot_name": "Synthetic plot",
        "profile": profile,
        "pin_latitude": pin_lat,
        "pin_longitude": pin_lng,
        "device": "synthetic",
        "walk_style": "perimeter_loop",
    }, indent=2), encoding="utf-8")
    (root / "poses.json").write_text(json.dumps({"frames": frames}, indent=2), encoding="utf-8")
    (root / "gps.json").write_text(json.dumps({"samples": [
        {"latitude": pin_lat, "longitude": pin_lng, "heading_deg": 0.0},
    ]}, indent=2), encoding="utf-8")
    return root


def _rotation_from_quaternion(q: tuple[float, float, float, float]) -> np.ndarray:
    x, y, z, w = q
    xx, yy, zz = x * x, y * y, z * z
    xy, xz, yz = x * y, x * z, y * z
    wx, wy, wz = w * x, w * y, w * z
    return np.array([
        [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy)],
        [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx)],
        [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)],
    ])


def ground_truth_area(length_m: float, breadth_m: float) -> float:
    return length_m * breadth_m
