"""Runtime configuration for the vision service, driven by environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    backend_url: str = os.getenv("PARKING_API_URL", "http://localhost:8080")
    backend_user: str = os.getenv("PARKING_USER", "manager@parking.dev")
    backend_password: str = os.getenv("PARKING_PASSWORD", "manager123")
    camera_code: str = os.getenv("CAMERA_CODE", "CAM-L1")
    request_timeout_seconds: float = float(os.getenv("PARKING_HTTP_TIMEOUT", "10"))


settings = Settings()
