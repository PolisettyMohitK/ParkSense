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


def test_propose_slots_endpoint():
    image = synthetic_lot()
    response = client.post(
        "/slots/propose",
        files={"file": ("lot.png", _png_bytes(image), "image/png")},
        data={"mode": "lines", "return_overlay": "true"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["method"] == "lines"
    assert payload["count"] >= 5
    assert payload["slots"][0]["label"]
    assert payload["overlay"]


def test_detect_endpoint():
    image = synthetic_lot(occupied_bays=(0,))
    slots = [
        {"id": f"R1C{index + 1}", "space_id": index + 1, "polygon": polygon}
        for index, polygon in enumerate(bay_polygons())
    ]
    response = client.post(
        "/occupancy/detect",
        files={"file": ("lot.png", _png_bytes(image), "image/png")},
        data={"slots": json.dumps(slots)},
    )
    assert response.status_code == 200
    payload = response.json()
    states = {item["slotId"]: item["state"] for item in payload["detections"]}
    assert states["R1C1"] == "OCCUPIED"
    assert states["R1C2"] == "VACANT"


def test_detect_rejects_bad_slots():
    image = synthetic_lot()
    response = client.post(
        "/occupancy/detect",
        files={"file": ("lot.png", _png_bytes(image), "image/png")},
        data={"slots": "not-json"},
    )
    assert response.status_code == 400
