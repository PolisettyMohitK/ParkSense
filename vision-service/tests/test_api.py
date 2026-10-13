import json

import cv2
from fastapi.testclient import TestClient

from app.main import app
from tests.synthetic import bay_polygons, synthetic_lot

client = TestClient(app)


def _png_bytes(image) -> bytes:
    success, buffer = cv2.imencode(".png", image)
    assert success
    return buffer.tobytes()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"


def test_propose_slots_endpoint(staff_headers):
    image = synthetic_lot()
    response = client.post(
        "/slots/propose",
        files={"file": ("lot.png", _png_bytes(image), "image/png")},
        data={"mode": "lines", "return_overlay": "true"},
        headers=staff_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["method"] == "lines"
    assert payload["count"] >= 5
    assert payload["slots"][0]["label"]
    assert payload["overlay"]


def test_detect_endpoint(staff_headers):
    image = synthetic_lot(occupied_bays=(0,))
    slots = [
        {"id": f"R1C{index + 1}", "space_id": index + 1, "polygon": polygon}
        for index, polygon in enumerate(bay_polygons())
    ]
    response = client.post(
        "/occupancy/detect",
        files={"file": ("lot.png", _png_bytes(image), "image/png")},
        data={"slots": json.dumps(slots)},
        headers=staff_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    states = {item["slotId"]: item["state"] for item in payload["detections"]}
    assert states["R1C1"] == "OCCUPIED"
    assert states["R1C2"] == "VACANT"


def test_detect_rejects_bad_slots(staff_headers):
    image = synthetic_lot()
    response = client.post(
        "/occupancy/detect",
        files={"file": ("lot.png", _png_bytes(image), "image/png")},
        data={"slots": "not-json"},
        headers=staff_headers,
    )
    assert response.status_code == 400


def test_propose_rejects_non_image_upload(staff_headers):
    response = client.post(
        "/slots/propose",
        files={"file": ("notes.txt", b"this is not an image", "image/png")},
        data={"mode": "lines"},
        headers=staff_headers,
    )
    assert response.status_code == 415


def test_propose_rejects_oversized_upload(staff_headers):
    # A valid PNG header followed by junk larger than the configured cap.
    payload = b"\x89PNG\r\n\x1a\n" + b"\x00" * (11 * 1024 * 1024)
    response = client.post(
        "/slots/propose",
        files={"file": ("huge.png", payload, "image/png")},
        data={"mode": "lines"},
        headers=staff_headers,
    )
    assert response.status_code == 413
