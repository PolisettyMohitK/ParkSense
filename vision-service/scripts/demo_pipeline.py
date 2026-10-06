"""End-to-end camera demo.

Builds a synthetic top-down frame for a real parking zone (using the space
positions stored in the backend), runs the occupancy algorithm, and optionally
pushes the results as occupancy events.

Usage
-----
    python scripts/demo_pipeline.py --push
    python scripts/demo_pipeline.py --occupied A02,A04 --push
"""

from __future__ import annotations

import argparse
import os
import sys

import cv2
import httpx
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.detection.occupancy import classify  # noqa: E402
from app.detection.slots import render_overlay  # noqa: E402
from app.services.bridge import BackendBridge  # noqa: E402

BAY_WIDTH = 84
BAY_HEIGHT = 104


class Slot:
    def __init__(self, label: str, polygon: list[list[int]]) -> None:
        self.label = label
        self.polygon = polygon


def login(email: str, password: str) -> str:
    response = httpx.post(
        f"{settings.backend_url}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["token"]


def load_spaces(token: str, zone_code: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {token}"}
    zones = httpx.get(f"{settings.backend_url}/api/parking/zones", headers=headers, timeout=10).json()
    zone = next((item for item in zones if item["code"] == zone_code), None)
    if zone is None:
        raise SystemExit(f"Zone '{zone_code}' not found. Available: {[z['code'] for z in zones]}")
    spaces = httpx.get(
        f"{settings.backend_url}/api/parking/spaces",
        params={"zoneId": zone["id"]},
        headers=headers,
        timeout=10,
    ).json()
    return [space for space in spaces if space.get("positionX") is not None]


def build_frame(spaces: list[dict], occupied_codes: set[str]) -> tuple[np.ndarray, list[Slot], list[dict]]:
    margin = 40
    width = int(max(space["positionX"] for space in spaces) + BAY_WIDTH + margin)
    height = int(max(space["positionY"] for space in spaces) + BAY_HEIGHT + margin)
    frame = np.full((height, width, 3), 88, dtype=np.uint8)
    frame += np.random.randint(0, 12, frame.shape, dtype=np.uint8)

    slots: list[Slot] = []
    definitions: list[dict] = []
    for space in spaces:
        x = int(space["positionX"])
        y = int(space["positionY"])
        polygon = [[x, y], [x + BAY_WIDTH, y], [x + BAY_WIDTH, y + BAY_HEIGHT], [x, y + BAY_HEIGHT]]
        slots.append(Slot(space["code"] or f"#{space['id']}", polygon))
        definitions.append({"id": space["code"], "polygon": polygon, "space_id": space["id"]})

        cv2.polylines(frame, [np.array(polygon, dtype=np.int32)], True, (150, 150, 150), 1)
        if (space["code"] or "") in occupied_codes:
            cv2.rectangle(frame, (x + 10, y + 12), (x + BAY_WIDTH - 10, y + BAY_HEIGHT - 12), (35, 35, 40), -1)
            cv2.rectangle(frame, (x + 10, y + 12), (x + BAY_WIDTH - 10, y + BAY_HEIGHT - 12), (205, 205, 215), 3)
            cv2.rectangle(frame, (x + 22, y + 30), (x + BAY_WIDTH - 22, y + BAY_HEIGHT - 34), (120, 140, 165), 2)
            noise = np.random.randint(0, 70, (BAY_HEIGHT - 24, BAY_WIDTH - 20, 3), dtype=np.uint8)
            patch = frame[y + 12:y + BAY_HEIGHT - 12, x + 10:x + BAY_WIDTH - 10]
            frame[y + 12:y + BAY_HEIGHT - 12, x + 10:x + BAY_WIDTH - 10] = np.clip(
                patch.astype(int) + noise, 0, 255
            ).astype(np.uint8)
    return frame, slots, definitions


def main() -> None:
    parser = argparse.ArgumentParser(description="Synthetic camera -> occupancy events demo")
    parser.add_argument("--zone-code", default="L1")
    parser.add_argument("--occupied", default="A02,A04", help="comma separated space codes with cars")
    parser.add_argument("--push", action="store_true", help="send events to the backend")
    parser.add_argument("--camera", default=settings.camera_code)
    parser.add_argument("--frame", default="demo-0001")
    parser.add_argument("--overlay", default="/tmp/vision_overlay.png")
    parser.add_argument("--email", default=settings.backend_user)
    parser.add_argument("--password", default=settings.backend_password)
    args = parser.parse_args()

    occupied_codes = {code.strip().upper() for code in args.occupied.split(",") if code.strip()}

    token = login(args.email, args.password)
    spaces = load_spaces(token, args.zone_code)
    if not spaces:
        raise SystemExit("No positioned spaces found for the zone.")

    frame, slots, definitions = build_frame(spaces, occupied_codes)
    detections, threshold = classify(frame, definitions)

    print(f"\nCamera {args.camera} | frame {args.frame} | zone {args.zone_code} | threshold {threshold:.3f}")
    print(f"{'slot':<8}{'spaceId':<9}{'state':<10}{'score':<8}{'conf':<7}method")
    for detection in detections:
        print(
            f"{detection.slot_id:<8}{detection.space_id:<9}"
            f"{'OCCUPIED' if detection.occupied else 'VACANT':<10}"
            f"{detection.score:<8.3f}{detection.confidence:<7.2f}{detection.method}"
        )

    overlay = render_overlay(frame, slots, {d.slot_id: d.occupied for d in detections})
    cv2.imwrite(args.overlay, overlay)
    print(f"\nOverlay written to {args.overlay}")

    if not args.push:
        print("Run with --push to send these detections to the backend.")
        return

    bridge = BackendBridge()
    results = bridge.push_detections(detections, token, camera_code=args.camera, frame_id=args.frame)
    print(f"\nPushed {len(results)} event(s):")
    for result in results:
        detail = f" ({result.detail})" if result.detail else ""
        print(
            f"  slot {result.slot_id:<6} space {result.space_id:<4} {result.state:<9}"
            f"HTTP {result.status_code} eventId={result.event_id}{detail}"
        )


if __name__ == "__main__":
    main()
