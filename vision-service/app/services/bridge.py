"""Pushes occupancy detections into the Java backend as occupancy events.

The backend is the source of truth; the vision service only reports what it
sees. Each event carries an ``externalId`` so re-sending the same frame is
idempotent on the backend.
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from ..config import settings


@dataclass
class PushResult:
    slot_id: str
    space_id: int
    state: str
    status_code: int
    event_id: int | None = None
    detail: str | None = None


class BackendBridge:
    def __init__(self, base_url: str | None = None, timeout: float | None = None) -> None:
        self.base_url = (base_url or settings.backend_url).rstrip("/")
        self.timeout = timeout or settings.request_timeout_seconds
        self._last_state: dict[int, str] = {}

    def login(self, email: str | None = None, password: str | None = None) -> str:
        resolved_password = password or settings.backend_password
        if not resolved_password:
            raise RuntimeError(
                "PARKING_PASSWORD is not set; configure a staff account before pushing events"
            )
        payload = {
            "email": email or settings.backend_user,
            "password": resolved_password,
        }
        response = httpx.post(f"{self.base_url}/api/auth/login", json=payload, timeout=self.timeout)
        response.raise_for_status()
        return response.json()["token"]

    def push_detections(
        self,
        detections,
        token: str,
        camera_code: str | None = None,
        frame_id: str | None = None,
        only_changes: bool = True,
    ) -> list[PushResult]:
        """Send one occupancy event per mapped slot and return per-slot results."""
        camera = camera_code or settings.camera_code
        frame = frame_id or "frame"
        headers = {"Authorization": f"Bearer {token}"}
        results: list[PushResult] = []

        for detection in detections:
            if detection.space_id is None:
                continue
            state = "OCCUPIED" if detection.occupied else "VACANT"
            if only_changes and self._last_state.get(detection.space_id) == state:
                continue
            payload = {
                "spaceId": detection.space_id,
                "state": state,
                "source": "CAMERA",
                "confidence": detection.confidence,
                "externalId": f"{camera}:{frame}:{detection.space_id}",
                "note": f"vision:{detection.method}",
            }
            try:
                response = httpx.post(
                    f"{self.base_url}/api/occupancy/events",
                    json=payload,
                    headers=headers,
                    timeout=self.timeout,
                )
                event_id = None
                detail = None
                if response.status_code in (200, 201):
                    event_id = response.json().get("id")
                    self._last_state[detection.space_id] = state
                else:
                    detail = response.text[:180]
                results.append(
                    PushResult(
                        slot_id=detection.slot_id,
                        space_id=detection.space_id,
                        state=state,
                        status_code=response.status_code,
                        event_id=event_id,
                        detail=detail,
                    )
                )
            except httpx.HTTPError as error:  # network failure should not crash the pipeline
                results.append(
                    PushResult(
                        slot_id=detection.slot_id,
                        space_id=detection.space_id,
                        state=state,
                        status_code=0,
                        detail=str(error)[:180],
                    )
                )
        return results

    def reset_cache(self) -> None:
        self._last_state.clear()
