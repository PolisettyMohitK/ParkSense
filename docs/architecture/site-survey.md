# Site Survey (Vision v2, phase 1)

Measure, assess and lay out unmarked parking land from a guided phone walk.

## Pipeline

```
bundle (poses + depth + GPS)
   → reconstruct   depth fusion → metric point cloud (COLMAP optional)
   → terrain       ground plane, 10 cm grid, slope, roughness, obstacles
   → boundary      usable area (concave hull − obstacles − exclusions − inset)
   → context       OSM roads/buildings/access points (cached, optional)
   → layout        bay–aisle–bay tiling, connectivity, scoring
   → export        layout.geojson · report.json · ortho.png
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/survey/profiles` | CAR / BIKE / MIXED / BUS bay geometry and limits |
| POST | `/surveys` | Upload a bundle `.zip`, run the survey, return a job |
| GET | `/surveys/{id}` | Job status + full result |
| GET | `/surveys/{id}/artifacts/{name}` | `layout.geojson`, `report.json`, `ortho.png` |
| POST | `/surveys/{id}/layout` | Re-run the layout for another profile (no reconstruction) |

## Bundle format

```
meta.json      plot name, profile hint, GPS pin, device
poses.json     per frame: id, translation, rotation_quaternion, intrinsics
gps.json       averaged GPS + heading samples
keyframes/*.jpg colour frames (optional for the CPU pipeline)
depth/*.png    16-bit millimetre or float32 metre depth, aligned to keyframes
```

## Accuracy

Measured on a synthetic 20 × 12 m plot with a 2% slope, a walked lawnmower path and
1 cm depth noise:

| Quantity | Truth | Measured |
|---|---|---|
| Length | 20.00 m | 20.01 m |
| Breadth | 12.00 m | 12.00 m |
| Slope | 2.0 % | 2.0 % |
| Loop closure | — | < 0.5 m |
| Confidence | — | high |

Confidence drops when the loop drift exceeds 0.5–2 % of the extent, when more than a
third of the grid has no ground data, or when the plot exceeds ~60 m per side — in
those cases the report recommends measuring one edge with a tape.

## Optional / not yet built

- **COLMAP + Open3D** refinement (`pycolmap`, `open3d`) for denser geometry. The
  pipeline runs on depth fusion alone (CPU, seconds on the synthetic plot).
- **Grounded-SAM-2 / VGGT** labelling and dense geometry (GPU).
- **Native AR capture** (ARKit scene depth / ARCore Depth) via an Expo dev build.
- **Backend import**: creating PROPOSED spaces from `layout.geojson`.
- **2D/3D review UI**.

## Tests

```bash
cd vision-service && .venv/bin/python -m pytest tests -q   # 22 passed
```

`tests/synthetic_survey.py` renders a known plot into posed depth frames, so the
whole pipeline can be checked without a device.
