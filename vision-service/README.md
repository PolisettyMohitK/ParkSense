# Vision Service — Parking

Turns camera frames or photos into occupancy events for the Java backend.
Classical computer vision (OpenCV), no trained model required.

## What it does

1. **Proposes parking slots** from a photo — by detecting painted divider lines,
   or by proposing a grid over a region of interest for unmarked areas. Proposals
   become PROPOSED spaces that staff verify in the platform.
2. **Classifies occupancy** per slot — comparing against a reference photo of the
   empty lot (best), or using edge/texture analysis when no reference exists.
3. **Pushes occupancy events** to the backend with an idempotency key, so repeated
   frames never create duplicate events.

See `docs/architecture/camera-algorithm.md` for the full algorithm.

## Run

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
JWT_SECRET=<same as backend app.jwt.secret> .venv/bin/uvicorn app.main:app --port 8001
```

API docs: `http://localhost:8001/docs`

All endpoints except `/health` require a staff (ADMIN or MANAGER) JWT issued by
the Java backend, sent as `Authorization: Bearer <token>`. The web player sends
the signed-in user's token; `JWT_SECRET` must match the backend's
`app.jwt.secret`, otherwise every request is rejected with 401. Uploads are
sniffed by magic bytes and capped (see `MAX_UPLOAD_MB`).

## Test

```bash
.venv/bin/python -m pytest tests -q
```

Tests run against synthetic parking-lot images, so they need no camera or
dataset.

## End-to-end demo

With the backend running on `localhost:8080`:

```bash
.venv/bin/python scripts/demo_pipeline.py --occupied A06,A08 --push
```

This builds a synthetic frame for a real zone (using the space positions stored
in the backend), classifies each bay, writes an annotated overlay to
`/tmp/vision_overlay.png`, and posts occupancy events.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | _(empty — required)_ | Must match the backend's `app.jwt.secret`; tokens are verified with it |
| `VISION_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8081` | Browser origins allowed to call this service |
| `PARKING_API_URL` | `http://localhost:8080` | Backend base URL |
| `PARKING_USER` | `manager@parking.dev` | Account used when pushing events |
| `PARKING_PASSWORD` | _(empty — required only for push)_ | Password for that account; there is no built-in default |
| `CAMERA_CODE` | `CAM-L1` | Device code used in `externalId` |
| `MAX_UPLOAD_MB` | `10` | Largest accepted upload |
| `MAX_IMAGE_PIXELS` | `30000000` | Decompression-bomb guard after decoding |

## Scope

The service owns no parking state. It reports observations; the backend decides
what they mean (state, sessions, reservations, analytics).
