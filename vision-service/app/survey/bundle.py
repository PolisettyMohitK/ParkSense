"""Survey bundle: the payload captured during a guided walk.

A bundle is a directory (or zip) containing:

    meta.json          survey metadata (pin, profile hint, device, app version)
    poses.json         camera pose + intrinsics per keyframe
    gps.json           averaged GPS + heading samples
    keyframes/0001.jpg colour keyframes
    depth/0001.png     metric depth maps aligned to the keyframes (optional)

Depth maps may be 16-bit millimetres (iPhone/ARCore style) or float32 metres.
Everything metric is in the world frame of the AR session (metres).
"""

from __future__ import annotations

import json
import math
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np


@dataclass
class CameraIntrinsics:
    fx: float
    fy: float
    cx: float
    cy: float
    width: int
    height: int


@dataclass
class Pose:
    frame_id: str
    translation: tuple[float, float, float]
    # quaternion (x, y, z, w), camera -> world
    rotation: tuple[float, float, float, float]

    def rotation_matrix(self) -> np.ndarray:
        x, y, z, w = self.rotation
        xx, yy, zz = x * x, y * y, z * z
        xy, xz, yz = x * y, x * z, y * z
        wx, wy, wz = w * x, w * y, w * z
        return np.array([
            [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy)],
            [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx)],
            [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)],
        ])


@dataclass
class Keyframe:
    frame_id: str
    image_path: Path | None
    depth_path: Path | None
    pose: Pose
    intrinsics: CameraIntrinsics


@dataclass
class SurveyMeta:
    plot_name: str = "Unnamed plot"
    profile: str = "CAR"
    pin_latitude: float | None = None
    pin_longitude: float | None = None
    device: str | None = None
    notes: str | None = None
    walk_style: str = "perimeter_loop"


@dataclass
class GpsSample:
    latitude: float
    longitude: float
    heading_deg: float | None = None


@dataclass
class SurveyBundle:
    meta: SurveyMeta
    keyframes: list[Keyframe] = field(default_factory=list)
    gps: list[GpsSample] = field(default_factory=list)
    source: str | None = None

    @property
    def has_depth(self) -> bool:
        return any(keyframe.depth_path is not None for keyframe in self.keyframes)


def _read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_bundle(path: str | Path) -> SurveyBundle:
    """Load a bundle from a directory or a .zip archive."""
    root = Path(path)
    if root.is_file() and root.suffix.lower() == ".zip":
        extract_root = root.with_suffix("")
        extract_root.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(root) as archive:
            archive.extractall(extract_root)
        root = extract_root

    if not root.is_dir():
        raise FileNotFoundError(f"Survey bundle not found: {path}")

    meta_raw = _read_json(root / "meta.json") if (root / "meta.json").exists() else {}
    meta = SurveyMeta(
        plot_name=meta_raw.get("plot_name", "Unnamed plot"),
        profile=meta_raw.get("profile", "CAR"),
        pin_latitude=meta_raw.get("pin_latitude"),
        pin_longitude=meta_raw.get("pin_longitude"),
        device=meta_raw.get("device"),
        notes=meta_raw.get("notes"),
        walk_style=meta_raw.get("walk_style", "perimeter_loop"),
    )

    poses_raw = _read_json(root / "poses.json")
    keyframes: list[Keyframe] = []
    for entry in poses_raw.get("frames", []):
        intrinsics_raw = entry["intrinsics"]
        intrinsics = CameraIntrinsics(
            fx=float(intrinsics_raw["fx"]),
            fy=float(intrinsics_raw["fy"]),
            cx=float(intrinsics_raw["cx"]),
            cy=float(intrinsics_raw["cy"]),
            width=int(intrinsics_raw["width"]),
            height=int(intrinsics_raw["height"]),
        )
        pose = Pose(
            frame_id=entry["id"],
            translation=tuple(float(v) for v in entry["translation"]),
            rotation=tuple(float(v) for v in entry["rotation_quaternion"]),
        )
        image_path = root / "keyframes" / f"{entry['id']}.jpg"
        depth_path = root / "depth" / f"{entry['id']}.png"
        keyframes.append(Keyframe(
            frame_id=entry["id"],
            image_path=image_path if image_path.exists() else None,
            depth_path=depth_path if depth_path.exists() else None,
            pose=pose,
            intrinsics=intrinsics,
        ))

    gps: list[GpsSample] = []
    if (root / "gps.json").exists():
        for entry in _read_json(root / "gps.json").get("samples", []):
            gps.append(GpsSample(
                latitude=float(entry["latitude"]),
                longitude=float(entry["longitude"]),
                heading_deg=entry.get("heading_deg"),
            ))

    return SurveyBundle(meta=meta, keyframes=keyframes, gps=gps, source=str(root))


def average_gps(bundle: SurveyBundle) -> tuple[float, float] | None:
    if bundle.meta.pin_latitude is not None and bundle.meta.pin_longitude is not None:
        return bundle.meta.pin_latitude, bundle.meta.pin_longitude
    if not bundle.gps:
        return None
    lat = sum(sample.latitude for sample in bundle.gps) / len(bundle.gps)
    lon = sum(sample.longitude for sample in bundle.gps) / len(bundle.gps)
    return lat, lon


def local_metres_to_latlng(x: float, y: float, origin_lat: float, origin_lon: float) -> tuple[float, float]:
    """Convert local ENU metres to lat/lng (small-area approximation)."""
    metres_per_deg_lat = 111_320.0
    metres_per_deg_lon = 111_320.0 * max(0.01, math.cos(math.radians(origin_lat)))
    return origin_lat + y / metres_per_deg_lat, origin_lon + x / metres_per_deg_lon
