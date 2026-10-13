"""Staff authentication for the vision service.

Verifies the same HS256 JWTs the Java backend issues, so the web and mobile
apps authenticate with the token they already hold.
"""

from __future__ import annotations

import jwt
from fastapi import HTTPException, Request

from .config import settings

STAFF_ROLES = {"ADMIN", "MANAGER"}
# The backend (JJWT) picks HS256/HS384/HS512 based on the secret's length.
_HMAC_ALGORITHMS = ["HS256", "HS384", "HS512"]
_BEARER_PREFIX = "bearer "


def _token_from_request(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith(_BEARER_PREFIX):
        return header[len(_BEARER_PREFIX):].strip()
    # <img>/<a> tags cannot set headers, so artifact URLs carry the token here.
    return request.query_params.get("access_token")


def require_staff(request: Request) -> dict:
    """FastAPI dependency: only authenticated ADMIN/MANAGER accounts pass."""
    token = _token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=503,
            detail="JWT_SECRET is not configured for the vision service",
        )
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=_HMAC_ALGORITHMS)
    except jwt.PyJWTError as error:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    if claims.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Staff access required")
    return claims
