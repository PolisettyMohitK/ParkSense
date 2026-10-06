"""Image decode/encode helpers for the HTTP layer."""

from __future__ import annotations

import base64

import cv2
import numpy as np


def decode_image(data: bytes) -> np.ndarray:
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image; expected PNG or JPEG bytes")
    return image


def encode_png_base64(image: np.ndarray) -> str:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise ValueError("Could not encode image")
    return base64.b64encode(buffer.tobytes()).decode("ascii")
