"""Shared test setup.

The app reads its settings at import time, so the JWT secret must exist before
any test module imports ``app.main``.
"""

from __future__ import annotations

import os
import time

os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret-test-secret-0123456789")
os.environ.setdefault("PARKING_PASSWORD", "test-password")
os.environ.setdefault("VISION_ALLOWED_ORIGINS", "http://localhost:5173")

import jwt  # noqa: E402
import pytest  # noqa: E402

TEST_SECRET = os.environ["JWT_SECRET"]


def make_token(
    role: str = "MANAGER",
    *,
    secret: str | None = None,
    expires_in: int = 3600,
    algorithm: str = "HS256",
) -> str:
    claims = {
        "sub": "manager@parking.dev",
        "uid": 1,
        "role": role,
        "exp": int(time.time()) + expires_in,
    }
    return jwt.encode(claims, secret or TEST_SECRET, algorithm=algorithm)


@pytest.fixture(scope="session")
def staff_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token('MANAGER')}"}


@pytest.fixture(scope="session")
def driver_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token('USER')}"}
