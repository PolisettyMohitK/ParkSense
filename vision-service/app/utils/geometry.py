"""Pure-python geometry helpers for parking-slot polygons."""

from __future__ import annotations

from typing import Iterable, Sequence

Point = tuple[float, float]
Polygon = Sequence[Point]


def polygon_area(polygon: Polygon) -> float:
    """Signed area via the shoelace formula (absolute value returned)."""
    if len(polygon) < 3:
        return 0.0
    total = 0.0
    for index in range(len(polygon)):
        x1, y1 = polygon[index]
        x2, y2 = polygon[(index + 1) % len(polygon)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def polygon_centroid(polygon: Polygon) -> Point:
    if not polygon:
        return (0.0, 0.0)
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def bounding_box(polygon: Polygon) -> tuple[float, float, float, float]:
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    return (min(xs), min(ys), max(xs), max(ys))


def rectangle(x: float, y: float, width: float, height: float) -> list[Point]:
    return [
        (x, y),
        (x + width, y),
        (x + width, y + height),
        (x, y + height),
    ]


def normalize(polygon: Polygon, image_width: int, image_height: int) -> list[Point]:
    """Convert pixel coordinates to 0..1 fractions so clients stay resolution-independent."""
    if image_width <= 0 or image_height <= 0:
        return [(0.0, 0.0) for _ in polygon]
    return [(x / image_width, y / image_height) for x, y in polygon]


def denormalize(polygon: Polygon, image_width: int, image_height: int) -> list[Point]:
    return [(x * image_width, y * image_height) for x, y in polygon]


def order_reading_order(polygons: Iterable[Polygon], row_tolerance: float = 0.04) -> list[int]:
    """Return indices of polygons sorted top-to-bottom, left-to-right."""
    items = []
    for index, polygon in enumerate(polygons):
        cx, cy = polygon_centroid(polygon)
        items.append((index, cx, cy))
    if not items:
        return []
    items.sort(key=lambda item: item[2])
    rows: list[list[tuple[int, float, float]]] = []
    row_height_guess = row_tolerance
    for item in items:
        placed = False
        for row in rows:
            if abs(row[0][2] - item[2]) <= row_height_guess:
                row.append(item)
                placed = True
                break
        if not placed:
            rows.append([item])
    ordered: list[int] = []
    for row in rows:
        row.sort(key=lambda item: item[1])
        ordered.extend(item[0] for item in row)
    return ordered
