"""Parking-slot proposal.

Two strategies, matching the two kinds of parking area in the platform:

* ``grid``  - regular bays: split the region of interest into rows x columns.
* ``lines`` - marked bays: find the painted divider lines and cut bays between
  consecutive dividers that sit on a common rail line.

``auto`` runs line detection first and falls back to a grid when the photo does
not contain enough markings. Every proposal is returned as a polygon with a
confidence so an operator can verify or reject it in the platform.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence

import cv2
import numpy as np

from ..utils.geometry import (
    Point,
    bounding_box,
    polygon_area,
    polygon_centroid,
    rectangle,
)

Polygon = list[Point]


@dataclass
class ProposedSlot:
    polygon: Polygon
    confidence: float
    method: str
    label: str | None = None


@dataclass
class SlotProposalResult:
    slots: list[ProposedSlot] = field(default_factory=list)
    method: str = "grid"
    note: str = ""


def _roi_mask(shape: tuple[int, int], roi: Sequence[float] | None) -> np.ndarray:
    """Boolean mask of the region of interest (normalized x1,y1,x2,y2)."""
    height, width = shape
    mask = np.ones((height, width), dtype=np.uint8) * 255
    if roi and len(roi) == 4:
        x1, y1, x2, y2 = (int(roi[0] * width), int(roi[1] * height), int(roi[2] * width), int(roi[3] * height))
        mask[:] = 0
        mask[max(0, y1):min(height, y2), max(0, x1):min(width, x2)] = 255
    return mask


def apply_roi(image: np.ndarray, roi: Sequence[float] | None) -> np.ndarray:
    mask = _roi_mask(image.shape[:2], roi)
    masked = image.copy()
    masked[mask == 0] = 0
    return masked


def propose_grid(
    image_width: int,
    image_height: int,
    rows: int,
    cols: int,
    roi: Sequence[float] | None = None,
    padding: float = 0.02,
) -> list[ProposedSlot]:
    """Split the ROI into an evenly spaced grid of candidate bays."""
    rows = max(1, rows)
    cols = max(1, cols)
    if roi and len(roi) == 4:
        x1, y1, x2, y2 = roi
    else:
        x1, y1, x2, y2 = 0.0, 0.0, 1.0, 1.0

    region_width = (x2 - x1) * image_width
    region_height = (y2 - y1) * image_height
    cell_width = region_width / cols
    cell_height = region_height / rows
    pad_x = cell_width * padding
    pad_y = cell_height * padding

    slots: list[ProposedSlot] = []
    for row in range(rows):
        for col in range(cols):
            left = x1 * image_width + col * cell_width + pad_x
            top = y1 * image_height + row * cell_height + pad_y
            slots.append(
                ProposedSlot(
                    polygon=rectangle(left, top, cell_width - 2 * pad_x, cell_height - 2 * pad_y),
                    confidence=0.55,
                    method="grid",
                )
            )
    return slots


def _orientation(segment: Sequence[int]) -> str:
    x1, y1, x2, y2 = segment
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    if dx >= dy * 2.2:
        return "h"
    if dy >= dx * 2.2:
        return "v"
    return "diag"


def _merge_parallel(segments: list[Sequence[int]], orientation: str, tolerance: float) -> list[dict]:
    """Group collinear segments (same line offset) into a single span."""
    groups: list[dict] = []
    for segment in segments:
        x1, y1, x2, y2 = segment
        if orientation == "h":
            offset = (y1 + y2) / 2.0
            start, end = sorted((x1, x2))
        else:
            offset = (x1 + x2) / 2.0
            start, end = sorted((y1, y2))
        for group in groups:
            if abs(group["offset"] - offset) <= tolerance:
                group["start"] = min(group["start"], start)
                group["end"] = max(group["end"], end)
                group["offset"] = (group["offset"] + offset) / 2.0
                break
        else:
            groups.append({"offset": offset, "start": start, "end": end})
    return groups


def propose_from_lines(
    image: np.ndarray,
    roi: Sequence[float] | None = None,
    min_bay_width_ratio: float = 0.02,
    max_bay_width_ratio: float = 0.30,
    max_slots: int = 200,
) -> SlotProposalResult:
    """Detect painted divider lines and cut bays between consecutive dividers."""
    height, width = image.shape[:2]
    masked = apply_roi(image, roi)
    gray = cv2.cvtColor(masked, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)

    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=45,
        minLineLength=int(width * 0.10),
        maxLineGap=int(width * 0.02),
    )
    if lines is None:
        return SlotProposalResult([], "lines", "no line segments detected")

    segments: list[tuple[int, int, int, int]] = []
    for line in lines:
        values = [int(v) for v in np.asarray(line).reshape(-1).tolist()]
        if len(values) >= 4:
            segments.append((values[0], values[1], values[2], values[3]))
    diagonals = [s for s in segments if _orientation(s) == "diag"]
    horizontals = [s for s in segments if _orientation(s) == "h"]
    verticals = [s for s in segments if _orientation(s) == "v"]
    if diagonals and not verticals and not horizontals:
        verticals = diagonals

    if len(verticals) < 2:
        return SlotProposalResult([], "lines", "fewer than two dividers detected")

    dividers = _merge_parallel(verticals, "v", tolerance=max(3.0, width * 0.012))
    # Keep dividers long enough to be real markings.
    lengths = [group["end"] - group["start"] for group in dividers]
    if not lengths:
        return SlotProposalResult([], "lines", "no usable dividers")
    median_length = float(np.median(lengths))
    dividers = [group for group in dividers if (group["end"] - group["start"]) >= median_length * 0.45]
    dividers.sort(key=lambda group: group["offset"])

    rail_top: float | None = None
    if horizontals:
        rails = _merge_parallel(horizontals, "h", tolerance=max(3.0, height * 0.012))
        rails.sort(key=lambda group: group["end"] - group["start"], reverse=True)
        rail_top = float(rails[0]["offset"])

    min_width = width * min_bay_width_ratio
    max_width = width * max_bay_width_ratio
    slots: list[ProposedSlot] = []
    for left_divider, right_divider in zip(dividers, dividers[1:]):
        bay_width = right_divider["offset"] - left_divider["offset"]
        if bay_width < min_width or bay_width > max_width:
            continue
        top = max(left_divider["start"], right_divider["start"])
        bottom = min(left_divider["end"], right_divider["end"])
        if rail_top is not None and top <= rail_top <= bottom:
            top = rail_top
        if bottom - top < height * 0.02:
            continue
        polygon = rectangle(left_divider["offset"], top, bay_width, bottom - top)
        if polygon_area(polygon) <= 0:
            continue
        slots.append(ProposedSlot(polygon=polygon, confidence=0.7, method="lines"))
        if len(slots) >= max_slots:
            break

    note = "bays cut between painted dividers" if slots else "no valid bays between dividers"
    return SlotProposalResult(slots, "lines", note)


def propose(
    image: np.ndarray,
    rows: int = 3,
    cols: int = 4,
    roi: Sequence[float] | None = None,
    mode: str = "auto",
) -> SlotProposalResult:
    """Entry point used by the API: choose a strategy and return slots."""
    height, width = image.shape[:2]
    if mode == "grid":
        slots = propose_grid(width, height, rows, cols, roi)
        return SlotProposalResult(slots, "grid", "uniform grid over region of interest")

    if mode in ("auto", "lines"):
        result = propose_from_lines(image, roi)
        if result.slots:
            return result
        if mode == "lines":
            return result

    slots = propose_grid(width, height, rows, cols, roi)
    return SlotProposalResult(slots, "grid", "fallback grid (markings not detected)")


def order_slots(slots: list[ProposedSlot]) -> list[ProposedSlot]:
    """Sort slots into reading order and assign bay labels (R1C1, R1C2, ...)."""
    if not slots:
        return slots
    indexed = list(enumerate(slots))
    indexed.sort(key=lambda item: polygon_centroid(item[1].polygon)[1])
    heights = [bounding_box(slot.polygon)[3] - bounding_box(slot.polygon)[1] for _, slot in indexed]
    row_tolerance = float(np.median(heights)) * 0.6 if heights else 10.0

    rows: list[list[tuple[int, ProposedSlot]]] = []
    for index, slot in indexed:
        _, y = polygon_centroid(slot.polygon)
        for row in rows:
            if abs(polygon_centroid(row[0][1].polygon)[1] - y) <= row_tolerance:
                row.append((index, slot))
                break
        else:
            rows.append([(index, slot)])

    ordered: list[ProposedSlot] = []
    for row_number, row in enumerate(rows, start=1):
        row.sort(key=lambda item: polygon_centroid(item[1].polygon)[0])
        for column_number, (_, slot) in enumerate(row, start=1):
            slot.label = f"R{row_number}C{column_number}"
            ordered.append(slot)
    return ordered


def render_overlay(
    image: np.ndarray,
    slots: list[ProposedSlot],
    detections: dict[str, bool] | None = None,
) -> np.ndarray:
    """Draw slot polygons (and optional occupancy) on a copy of the image."""
    overlay = image.copy()
    detections = detections or {}
    for slot in slots:
        points = np.array([[int(x), int(y)] for x, y in slot.polygon], dtype=np.int32)
        occupied = detections.get(slot.label or "")
        if occupied is None:
            color = (255, 191, 0)
        else:
            color = (60, 60, 235) if occupied else (60, 200, 90)
        cv2.polylines(overlay, [points], isClosed=True, color=color, thickness=2)
        if slot.label:
            cx, cy = polygon_centroid(slot.polygon)
            cv2.putText(overlay, slot.label, (int(cx) - 14, int(cy)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)
    return overlay
