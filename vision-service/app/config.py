"""Runtime configuration for the vision service, driven by environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _origins(name: str, default: str) -> tuple[str, ...]:
    raw = os.getenv(name, default)
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


@dataclass(frozen=True)
class Settings:
    backend_url: str = os.getenv("PARKING_API_URL", "http://localhost:8080")
    backend_user: str = os.getenv("PARKING_USER", "manager@parking.dev")
    backend_password: str = os.getenv("PARKING_PASSWORD", "")
    camera_code: str = os.getenv("CAMERA_CODE", "CAM-L1")
    request_timeout_seconds: float = float(os.getenv("PARKING_HTTP_TIMEOUT", "10"))

    # Same secret as the Java backend (app.jwt.secret) - used to verify each
    # request's bearer token. Tokens ride in the Authorization header, or in an
    # access_token query parameter for artifact URLs loaded via <img>/<a>.
    jwt_secret: str = os.getenv("JWT_SECRET", "")

    # Browser origins allowed to call this service.
    allowed_origins: tuple[str, ...] = _origins(
        "VISION_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:8081",
    )

    # Upload limits: reject anything larger before decoding.
    max_upload_mb: float = float(os.getenv("MAX_UPLOAD_MB", "10"))
    max_image_pixels: int = int(os.getenv("MAX_IMAGE_PIXELS", "30000000"))


settings = Settings()
