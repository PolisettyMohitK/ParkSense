"""Synthetic parking-lot image used by the algorithm tests."""

from __future__ import annotations

import cv2
import numpy as np


def synthetic_lot(occupied_bays: tuple[int, ...] = (), width: int = 800, height: int = 400) -> np.ndarray:
    """Draw a top-down marked lot: a rail line and vertical dividers.

    Bays are numbered 0..N-1 left to right. Bays listed in ``occupied_bays``
    get a textured "car" drawn inside them.
    """
    image = np.full((height, width, 3), 85, dtype=np.uint8)
    image += np.random.randint(0, 12, image.shape, dtype=np.uint8)

    rail_y = 100
    bay_depth = 200
    spacing = 100
    margin = 50
    dividers = list(range(margin, width - margin + 1, spacing))

    cv2.line(image, (dividers[0], rail_y), (dividers[-1], rail_y), (245, 245, 245), 3)
    for x in dividers:
        cv2.line(image, (x, rail_y), (x, rail_y + bay_depth), (245, 245, 245), 3)

    bay_count = len(dividers) - 1
    for bay in occupied_bays:
        if bay < 0 or bay >= bay_count:
            continue
        x0 = dividers[bay] + 12
        x1 = dividers[bay + 1] - 12
        y0 = rail_y + 25
        y1 = rail_y + bay_depth - 15
        cv2.rectangle(image, (x0, y0), (x1, y1), (35, 35, 40), -1)
        cv2.rectangle(image, (x0, y0), (x1, y1), (200, 200, 210), 3)
        cv2.rectangle(image, (x0 + 12, y0 + 18), (x1 - 12, y1 - 30), (120, 140, 160), 2)
        noise = np.random.randint(0, 70, (y1 - y0, x1 - x0, 3), dtype=np.uint8)
        image[y0:y1, x0:x1] = np.clip(image[y0:y1, x0:x1].astype(int) + noise, 0, 255).astype(np.uint8)

    return image


def bay_polygons(width: int = 800) -> list[list[list[int]]]:
    """The expected bay rectangles for the synthetic lot above."""
    spacing = 100
    margin = 50
    dividers = list(range(margin, width - margin + 1, spacing))
    polygons = []
    for left, right in zip(dividers, dividers[1:]):
        polygons.append([
            [left + 12, 125],
            [right - 12, 125],
            [right - 12, 285],
            [left + 12, 285],
        ])
    return polygons
