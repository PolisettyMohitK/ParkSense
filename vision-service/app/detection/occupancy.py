"""Occupancy classification for known parking slots.

Two scoring modes:

* ``difference`` - when a reference photo of the empty lot exists, a slot is
  occupied when the pixels inside it differ enough from the reference. This is
  the most reliable mode for a fixed camera.
* ``texture``    - without a reference, a parked vehicle introduces edges,
  corners and brightness variance that flat asphalt does not have. The score
  blends Laplacian variance, Canny edge density and intensity spread.

The decision threshold is chosen automatically with Otsu's method across the
slots of a single frame, and can be overridden per request.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import cv2
import numpy as np

from ..utils.geometry import Polygon

LAPLACIAN_SCALE = 500.0
EDGE_DENSITY_SCALE = 0.15
STD_SCALE = 60.0
DIFFERENCE_SCALE = 40.0


@dataclass
class ScoredSlot:
    slot_id: str
    space_id: int | None
    polygon: Polygon
    score: float
    method: str


@dataclass
class SlotDetection:
    slot_id: str
    space_id: int | None
    occupied: bool
    score: float
    confidence: float
    method: str


def _mask_for(polygon: Polygon, shape: tuple[int, int]) -> np.ndarray:
    mask = np.zeros(shape, dtype=np.uint8)
    points = np.array([[int(x), int(y)] for x, y in polygon], dtype=np.int32)
    cv2.fillPoly(mask, [points], 255)
    return mask


def _texture_score(gray: np.ndarray, mask: np.ndarray) -> float:
    inside = mask > 0
    if not inside.any():
        return 0.0
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_variance = float(laplacian[inside].var())
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float((edges[inside] > 0).mean())
    intensity_std = float(gray[inside].std())

    laplacian_norm = min(1.0, laplacian_variance / LAPLACIAN_SCALE)
    edge_norm = min(1.0, edge_density / EDGE_DENSITY_SCALE)
    std_norm = min(1.0, intensity_std / STD_SCALE)
    return 0.5 * laplacian_norm + 0.35 * edge_norm + 0.15 * std_norm


def _difference_score(gray: np.ndarray, reference: np.ndarray, mask: np.ndarray) -> float:
    inside = mask > 0
    if not inside.any():
        return 0.0
    difference = cv2.absdiff(gray, reference)
    mean_difference = float(difference[inside].mean())
    return min(1.0, mean_difference / DIFFERENCE_SCALE)


def score_slots(
    image: np.ndarray,
    slots: Sequence[dict],
    reference: np.ndarray | None = None,
) -> list[ScoredSlot]:
    """Compute a raw occupancy score per slot. ``slots`` items need id/polygon/space_id."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    reference_gray = None
    if reference is not None:
        reference_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
        if reference_gray.shape != gray.shape:
            reference_gray = cv2.resize(reference_gray, (gray.shape[1], gray.shape[0]))

    scored: list[ScoredSlot] = []
    for slot in slots:
        polygon = slot["polygon"]
        mask = _mask_for(polygon, gray.shape)
        if reference_gray is not None:
            score = _difference_score(gray, reference_gray, mask)
            method = "difference"
        else:
            score = _texture_score(gray, mask)
            method = "texture"
        scored.append(
            ScoredSlot(
                slot_id=str(slot.get("id") or slot.get("label") or ""),
                space_id=slot.get("space_id"),
                polygon=polygon,
                score=score,
                method=method,
            )
        )
    return scored


def otsu_threshold(scores: Sequence[float]) -> float:
    """Pick a split point between the vacant/occupied score clusters (Otsu)."""
    if not scores:
        return 0.35
    values = np.clip(np.array(scores, dtype=np.float64) * 255.0, 0, 255).astype(np.uint8).reshape(-1, 1)
    if int(values.max()) == int(values.min()):
        return float(values.max()) / 255.0
    threshold, _ = cv2.threshold(values, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return float(threshold) / 255.0


def auto_threshold(scores: Sequence[float], floor: float = 0.30, min_gap: float = 0.15) -> float:
    """Split scores at the largest gap between consecutive values.

    Occupancy scores are naturally bimodal (flat asphalt vs a vehicle) but the
    vacant cluster is much larger, which biases Otsu. Splitting at the widest
    gap is stable for that shape; when no clear gap exists we fall back to a
    mode-specific floor so noise is never reported as a parked car.
    """
    if len(scores) < 3:
        return floor
    ordered = sorted(float(score) for score in scores)
    best_gap = 0.0
    best_midpoint = ordered[0]
    for lower, upper in zip(ordered, ordered[1:]):
        gap = upper - lower
        if gap > best_gap:
            best_gap = gap
            best_midpoint = (lower + upper) / 2.0
    if best_gap >= min_gap:
        return max(floor, best_midpoint)
    return floor


def classify(
    image: np.ndarray,
    slots: Sequence[dict],
    reference: np.ndarray | None = None,
    threshold: float | None = None,
    prior: dict[str, bool] | None = None,
) -> tuple[list[SlotDetection], float]:
    """Classify every slot, returning detections and the threshold used."""
    scored = score_slots(image, slots, reference)
    if not scored:
        return [], threshold if threshold is not None else 0.35

    if threshold is None:
        floor = 0.10 if reference is not None else 0.30
        threshold = auto_threshold([item.score for item in scored], floor=floor)
    threshold = max(0.05, min(0.95, threshold))

    detections: list[SlotDetection] = []
    for item in scored:
        occupied = item.score >= threshold
        confidence = min(1.0, abs(item.score - threshold) / max(threshold, 1.0 - threshold, 1e-6))
        if prior and item.slot_id in prior:
            if prior[item.slot_id] == occupied:
                confidence = min(1.0, confidence + 0.15)
            else:
                confidence = max(0.05, confidence - 0.10)
        detections.append(
            SlotDetection(
                slot_id=item.slot_id,
                space_id=item.space_id,
                occupied=occupied,
                score=round(item.score, 4),
                confidence=round(confidence, 4),
                method=item.method,
            )
        )
    return detections, threshold
