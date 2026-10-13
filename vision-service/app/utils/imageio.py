"""Upload validation plus image decode/encode helpers for the HTTP layer."""

from __future__ import annotations

import base64

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile

from ..config import settings

_ZIP_SIGNATURES = (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")


def _sniff(data: bytes) -> str | None:
    """Identify the payload from its magic bytes; never trust the client's content type."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:4] in _ZIP_SIGNATURES:
        return "zip"
    return None


async def read_upload(upload: UploadFile, *, allow_zip: bool = False) -> bytes:
    """Read an upload with a hard size cap and content-sniffing, rejecting junk early."""
    limit = int(settings.max_upload_mb * 1024 * 1024)
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_mb:g} MB upload limit",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    kind = _sniff(data)
    if kind is None or (kind == "zip" and not allow_zip):
        expected = "PNG, JPEG or WebP" + (" or ZIP" if allow_zip else "")
        raise HTTPException(status_code=415, detail=f"Unsupported file type; expected {expected}")
    return data


def decode_image(data: bytes) -> np.ndarray:
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=422, detail="Could not decode image; expected PNG, JPEG or WebP bytes")
    if image.shape[0] * image.shape[1] > settings.max_image_pixels:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the {settings.max_image_pixels:,} pixel limit",
        )
    return image


def encode_png_base64(image: np.ndarray) -> str:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise ValueError("Could not encode image")
    return base64.b64encode(buffer.tobytes()).decode("ascii")
