"""Reconstruction: turn posed depth frames into a metric point cloud.

Level 0 (default, always available): back-project each depth map through the
camera intrinsics and pose. Enough for plots up to ~60 m and fully testable.

Level 1 (optional): if ``pycolmap`` and ``open3d`` are installed, refine poses
and fuse a denser cloud. The rest of the pipeline is unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from .bundle import SurveyBundle

MIN_DEPTH_M = 0.25
MAX_DEPTH_M = 14.0


@dataclass
class Reconstruction:
    points: np.ndarray
    method: str
    frames_used: int
    loop_error_m: float | None
    notes: str = ""


def _load_depth(path) -> np.ndarray | None:
    raw = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if raw is None:
        return None
    if raw.dtype == np.uint16:
        return raw.astype(np.float32) / 1000.0          # millimetres
    if raw.dtype == np.float32:
        return raw
    if raw.dtype == np.float64:
        return raw.astype(np.float32)
    # 8-bit depth (rare) treated as centimetres for robustness
    return raw.astype(np.float32) * 0.01


def fuse_depth(bundle: SurveyBundle, stride: int = 2, max_points: int = 400_000) -> Reconstruction:
    chunks: list[np.ndarray] = []
    frames_used = 0

    for keyframe in bundle.keyframes:
        if keyframe.depth_path is None:
            continue
        depth = _load_depth(keyframe.depth_path)
        if depth is None:
            continue
        depth = cv2.resize(depth, (keyframe.intrinsics.width, keyframe.intrinsics.height),
                           interpolation=cv2.INTER_NEAREST)

        v_coords, u_coords = np.mgrid[0:keyframe.intrinsics.height:stride,
                                      0:keyframe.intrinsics.width:stride]
        z = depth[0:keyframe.intrinsics.height:stride, 0:keyframe.intrinsics.width:stride]
        valid = np.isfinite(z) & (z > MIN_DEPTH_M) & (z < MAX_DEPTH_M)
        if not valid.any():
            continue

        u = u_coords[valid].astype(np.float32)
        v = v_coords[valid].astype(np.float32)
        z = z[valid]

        x_cam = (u - keyframe.intrinsics.cx) / keyframe.intrinsics.fx * z
        y_cam = (v - keyframe.intrinsics.cy) / keyframe.intrinsics.fy * z
        camera_points = np.stack([x_cam, y_cam, z], axis=1)

        rotation = keyframe.pose.rotation_matrix()
        world = camera_points @ rotation.T + np.array(keyframe.pose.translation)
        chunks.append(world.astype(np.float32))
        frames_used += 1

    if not chunks:
        raise ValueError("Bundle contains no usable depth frames")

    points = np.concatenate(chunks, axis=0)
    if len(points) > max_points:
        rng = np.random.default_rng(3)
        points = points[rng.choice(len(points), max_points, replace=False)]

    return Reconstruction(
        points=points,
        method="depth-fusion",
        frames_used=frames_used,
        loop_error_m=loop_error_m(bundle),
    )


def loop_error_m(bundle: SurveyBundle) -> float | None:
    """Distance between the first and last camera positions — a drift proxy."""
    if len(bundle.keyframes) < 2:
        return None
    first = np.array(bundle.keyframes[0].pose.translation)
    last = np.array(bundle.keyframes[-1].pose.translation)
    return float(np.linalg.norm(last - first))


def reconstruct(bundle: SurveyBundle) -> Reconstruction:
    """Prefer COLMAP refinement when available, otherwise fuse depth."""
    try:  # pragma: no cover - optional heavy dependency
        import pycolmap  # noqa: F401
        import open3d  # noqa: F401

        refined = _reconstruct_colmap(bundle)
        if refined is not None:
            return refined
    except Exception:
        pass

    if not bundle.has_depth:
        raise ValueError("Bundle has no depth maps and COLMAP is unavailable")
    result = fuse_depth(bundle)
    result.notes = "AR depth fused with poses; COLMAP refinement skipped"
    return result


def _reconstruct_colmap(bundle: SurveyBundle):  # pragma: no cover - needs pycolmap
    """Placeholder for the optional COLMAP/Open3D path.

    Kept explicit so the upgrade path is obvious: run pycolmap feature
    extraction + matching with the AR poses as priors, triangulate, then fuse
    depth frames with Open3D's ScalableTSDFVolume. Returns None when the
    environment is not set up, letting the caller fall back to depth fusion.
    """
    return None
