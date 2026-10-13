"""Parking Vision Service.

Turns a camera frame into occupancy events for the Java backend.

Endpoints
---------
GET  /health              - liveness probe
POST /slots/propose       - propose parking slots from a photo (grid or line detection)
POST /occupancy/detect    - classify each slot as occupied/vacant
POST /pipeline/run        - propose/detect and, optionally, push events to the backend

The service owns no parking state; the backend remains the source of truth.
"""

from __future__ import annotations

import json
import tempfile
import time
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .auth import require_staff
from .config import settings
from .detection.occupancy import classify
from .detection.slots import order_slots, propose, render_overlay
from fastapi.responses import FileResponse

from .services.bridge import BackendBridge
from .survey.bundle import load_bundle
from .survey.pipeline import relayout, run_survey
from .survey.profiles import list_profiles
from .utils.geometry import normalize
from .utils.imageio import decode_image, encode_png_base64, read_upload

app = FastAPI(title="Parking Vision Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

# Everything except /health requires a staff JWT.
protected = APIRouter(dependencies=[Depends(require_staff)])

bridge = BackendBridge()

SURVEY_JOBS: dict[str, dict] = {}
SURVEY_ROOT = Path(tempfile.gettempdir()) / "parksense-surveys"
SURVEY_ROOT.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health() -> dict:
    return {"status": "UP", "service": "vision-service", "backend": bridge.base_url}


def _parse_roi(raw: str | None) -> list[float] | None:
    if not raw:
        return None
    try:
        values = [float(part) for part in raw.split(",")]
    except ValueError as error:
        raise HTTPException(status_code=400, detail="roi must be 'x1,y1,x2,y2' in 0..1") from error
    if len(values) != 4:
        raise HTTPException(status_code=400, detail="roi must contain four numbers")
    return values


def _parse_slots(raw: str) -> list[dict]:
    try:
        slots = json.loads(raw)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail="slots must be valid JSON") from error
    if not isinstance(slots, list) or not slots:
        raise HTTPException(status_code=400, detail="slots must be a non-empty list")
    for slot in slots:
        if "polygon" not in slot or len(slot["polygon"]) < 3:
            raise HTTPException(status_code=400, detail="each slot needs a polygon with 3+ points")
    return slots


@protected.post("/slots/propose")
async def propose_slots(
    file: UploadFile = File(...),
    mode: str = Form("auto"),
    rows: int = Form(3),
    cols: int = Form(4),
    roi: str | None = Form(None),
    return_overlay: bool = Form(True),
) -> dict:
    """Propose parking slots. mode = auto | lines | grid."""
    image = decode_image(await read_upload(file))
    height, width = image.shape[:2]
    result = propose(image, rows=rows, cols=cols, roi=_parse_roi(roi), mode=mode)
    slots = order_slots(result.slots)

    payload: dict = {
        "method": result.method,
        "note": result.note,
        "imageWidth": width,
        "imageHeight": height,
        "count": len(slots),
        "slots": [
            {
                "id": slot.label,
                "label": slot.label,
                "confidence": round(slot.confidence, 3),
                "polygon": [[round(x, 2), round(y, 2)] for x, y in slot.polygon],
                "normalizedPolygon": [
                    [round(x, 6), round(y, 6)] for x, y in normalize(slot.polygon, width, height)
                ],
            }
            for slot in slots
        ],
    }
    if return_overlay:
        payload["overlay"] = encode_png_base64(render_overlay(image, slots))
    return payload


@protected.post("/occupancy/detect")
async def detect_occupancy(
    file: UploadFile = File(...),
    slots: str = Form(...),
    reference: UploadFile | None = File(None),
    threshold: float | None = Form(None),
) -> dict:
    """Classify each supplied slot as occupied or vacant."""
    image = decode_image(await read_upload(file))
    slot_definitions = _parse_slots(slots)
    reference_image = (
        decode_image(await read_upload(reference)) if reference is not None else None
    )

    detections, used_threshold = classify(
        image, slot_definitions, reference=reference_image, threshold=threshold
    )

    detections_by_id = {detection.slot_id: detection for detection in detections}
    overlay = render_overlay(
        image,
        [
            type("_Slot", (), {"polygon": slot["polygon"], "label": str(slot.get("id") or "")})()
            for slot in slot_definitions
        ],
        {slot_id: det.occupied for slot_id, det in detections_by_id.items()},
    )

    return {
        "threshold": round(used_threshold, 4),
        "occupied": sum(1 for detection in detections if detection.occupied),
        "vacant": sum(1 for detection in detections if not detection.occupied),
        "detections": [
            {
                "slotId": detection.slot_id,
                "spaceId": detection.space_id,
                "state": "OCCUPIED" if detection.occupied else "VACANT",
                "score": detection.score,
                "confidence": detection.confidence,
                "method": detection.method,
            }
            for detection in detections
        ],
        "overlay": encode_png_base64(overlay),
    }


@protected.post("/pipeline/run")
async def run_pipeline(
    file: UploadFile = File(...),
    slots: str = Form(...),
    push: bool = Form(False),
    camera_code: str = Form("CAM-L1"),
    frame_id: str = Form("frame"),
    threshold: float | None = Form(None),
    reference: UploadFile | None = File(None),
) -> dict:
    """Detect occupancy and, when push=true, forward events to the backend."""
    image = decode_image(await read_upload(file))
    slot_definitions = _parse_slots(slots)
    reference_image = (
        decode_image(await read_upload(reference)) if reference is not None else None
    )

    detections, used_threshold = classify(
        image, slot_definitions, reference=reference_image, threshold=threshold
    )

    pushed: list[dict] = []
    if push:
        try:
            token = bridge.login()
        except Exception as error:  # noqa: BLE001 - surface a clean message
            raise HTTPException(status_code=502, detail=f"backend login failed: {error}") from error
        results = bridge.push_detections(
            detections, token, camera_code=camera_code, frame_id=frame_id
        )
        pushed = [
            {
                "slotId": result.slot_id,
                "spaceId": result.space_id,
                "state": result.state,
                "status": result.status_code,
                "eventId": result.event_id,
                "detail": result.detail,
            }
            for result in results
        ]

    return {
        "threshold": round(used_threshold, 4),
        "occupied": sum(1 for detection in detections if detection.occupied),
        "vacant": sum(1 for detection in detections if not detection.occupied),
        "detections": [
            {
                "slotId": detection.slot_id,
                "spaceId": detection.space_id,
                "state": "OCCUPIED" if detection.occupied else "VACANT",
                "score": detection.score,
                "confidence": detection.confidence,
                "method": detection.method,
            }
            for detection in detections
        ],
        "pushed": pushed,
    }


@protected.post("/bridge/reset")
def reset_bridge() -> dict:
    """Clear the last-known-state cache (forces the next push to send everything)."""
    bridge.reset_cache()
    return {"status": "reset"}


# --- Site survey (v2) ---------------------------------------------------------

@protected.get("/survey/profiles")
def survey_profiles() -> list[dict]:
    """Parking layout profiles the admin can pick from."""
    return list_profiles()


@protected.post("/surveys")
async def create_survey(
    file: UploadFile = File(...),
    profile: str | None = Form(None),
    include_context: bool = Form(True),
) -> dict:
    """Run a survey: upload a bundle (.zip or a directory path is not supported over HTTP).

    The pipeline runs synchronously; a real deployment would queue it.
    """
    job_id = f"survey-{int(time.time() * 1000)}"
    job_dir = SURVEY_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    archive_path = job_dir / "bundle.zip"
    archive_path.write_bytes(await read_upload(file, allow_zip=True))

    try:
        with zipfile.ZipFile(archive_path) as archive:
            archive.extractall(job_dir / "bundle")
        bundle = load_bundle(job_dir / "bundle")
        artefacts_dir = job_dir / "artifacts"
        result = run_survey(bundle, profile_key=profile, include_context=include_context,
                            artefacts_dir=artefacts_dir)
        job = {
            "id": job_id,
            "status": result.get("status", "failed"),
            "profile": result.get("profile"),
            "bundlePath": str(job_dir / "bundle"),
            "artefactsDir": str(artefacts_dir),
            "result": result,
        }
    except Exception as error:  # noqa: BLE001 - report failures in the job
        job = {"id": job_id, "status": "failed", "error": f"{type(error).__name__}: {error}"}

    SURVEY_JOBS[job_id] = job
    return job


@protected.get("/surveys/{job_id}")
def get_survey(job_id: str) -> dict:
    job = SURVEY_JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Survey job not found")
    return job


@protected.get("/surveys/{job_id}/artifacts/{name}")
def get_survey_artifact(job_id: str, name: str):
    job = SURVEY_JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Survey job not found")
    path = Path(job["artefactsDir"]) / name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artifact not found")
    return FileResponse(path)


@protected.post("/surveys/{job_id}/layout")
def rerun_layout(job_id: str, profile: str = Form(...)) -> dict:
    """Re-run only the layout stage for another profile (no reconstruction)."""
    job = SURVEY_JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Survey job not found")
    bundle = load_bundle(job["bundlePath"])
    job["result"] = relayout(job["result"], profile, bundle)
    job["profile"] = profile
    return job


app.include_router(protected)
