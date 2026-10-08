"""Survey pipeline tests.

* terrain + layout are unit-tested on synthetic point clouds / polygons;
* the full pipeline runs on a synthetic walked bundle with a known plot, which
  is what proves the metric accuracy end to end.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pytest
from shapely.geometry import Point, Polygon, box

from app.survey.boundary import usable_polygon
from app.survey.bundle import load_bundle
from app.survey.layout import generate_layout, layout_to_local_layout
from app.survey.pipeline import relayout, run_survey
from app.survey.profiles import get_profile
from app.survey.reconstruct import reconstruct
from app.survey.terrain import build_ground_model
from tests.synthetic_survey import write_synthetic_bundle

PLOT_LENGTH = 20.0
PLOT_BREADTH = 12.0
PLOT_SLOPE = 0.02
OBSTACLE = (9.0, 5.0, 1.0, 1.0, 0.8)


# ---------------------------------------------------------------- terrain ----

def _synthetic_cloud(length=PLOT_LENGTH, breadth=PLOT_BREADTH, slope=PLOT_SLOPE,
                     with_obstacle=True, seed=1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    count = 30000
    x = rng.uniform(0.0, length, count)
    y = rng.uniform(0.0, breadth, count)
    z = slope * x + rng.normal(0.0, 0.005, count)
    cloud = [np.column_stack([x, y, z])]
    if with_obstacle:
        ox, oy, half_x, half_y, height = OBSTACLE
        obstacle_count = 6000
        ox_pts = rng.uniform(ox - half_x, ox + half_x, obstacle_count)
        oy_pts = rng.uniform(oy - half_y, oy + half_y, obstacle_count)
        oz_pts = rng.uniform(0.25, height, obstacle_count)
        cloud.append(np.column_stack([ox_pts, oy_pts, oz_pts]))
    return np.concatenate(cloud).astype(np.float32)


def test_terrain_measures_plot_and_slope():
    ground = build_ground_model(_synthetic_cloud())
    stats = ground.stats
    assert abs(stats["extent_x_m"] - PLOT_LENGTH) < 0.5
    assert abs(stats["extent_y_m"] - PLOT_BREADTH) < 0.5
    assert abs(stats["global_slope_pct"] - PLOT_SLOPE * 100) < 0.5
    assert abs(stats["slope_pct_mean"] - PLOT_SLOPE * 100) < 1.5
    assert math.isfinite(stats["slope_pct_mean"])


def test_terrain_detects_obstacle():
    ground = build_ground_model(_synthetic_cloud(with_obstacle=True))
    assert ground.stats["obstacle_cells"] > 0
    obstacle_rows, obstacle_cols = np.where(ground.obstacle)
    xs = ground.origin_x + (obstacle_cols + 0.5) * ground.cell_size
    ys = ground.origin_y + (obstacle_rows + 0.5) * ground.cell_size
    assert 8.0 <= xs.mean() <= 10.5
    assert 4.0 <= ys.mean() <= 6.5
    assert ground.obstacle_height.max() >= 0.2


def test_terrain_without_obstacle_is_clear():
    ground = build_ground_model(_synthetic_cloud(with_obstacle=False))
    # A little noise must not be reported as a structure.
    assert ground.stats["obstacle_cells"] <= 2


# ----------------------------------------------------------------- layout ----

def test_layout_rectangle_car_profile():
    usable = Polygon(box(0, 0, PLOT_LENGTH, PLOT_BREADTH))
    layout = generate_layout(usable, get_profile("CAR"))
    assert len(layout.bays) >= 6
    assert layout.connected
    assert layout.orientation_deg in get_profile("CAR").angles_deg
    for bay in layout.bays:
        assert bay.area > 0.5
        assert usable.buffer(0.05).contains(bay.centroid)


def test_invalid_layouts_for_l_shape_and_hole():
    l_shape = Polygon([(0, 0), (20, 0), (20, 6), (8, 6), (8, 12), (0, 12)])
    assert l_shape.is_valid
    layout = generate_layout(l_shape, get_profile("CAR"))
    assert len(layout.bays) >= 4
    for bay in layout.bays:
        assert l_shape.buffer(0.05).contains(bay.centroid)

    holed = Polygon(box(0, 0, 20, 12), [[box(8, 4, 12, 8)]])
    assert holed.is_valid
    holed_layout = generate_layout(holed, get_profile("CAR"))
    assert len(holed_layout.bays) >= 4
    for bay in holed_layout.bays:
        assert not box(8, 4, 12, 8).contains(bay.centroid)


def test_bike_profile_fits_more_bays_than_bus():
    usable = Polygon(box(0, 0, PLOT_LENGTH, PLOT_BREADTH))
    bike = generate_layout(usable, get_profile("BIKE"))
    car = generate_layout(usable, get_profile("CAR"))
    bus = generate_layout(usable, get_profile("BUS"))
    assert len(bike.bays) > len(car.bays) > len(bus.bays)
    assert len(bus.bays) >= 1


def test_layout_labels_are_reading_order():
    usable = Polygon(box(0, 0, PLOT_LENGTH, PLOT_BREADTH))
    layout = generate_layout(usable, get_profile("CAR"))
    payload = layout_to_local_layout(layout)
    codes = [bay["code"] for bay in payload["bays"]]
    assert len(set(codes)) == len(codes)
    assert all(len(code) == 3 and code[0].isalpha() and code[1:].isdigit() for code in codes)


# --------------------------------------------------------------- pipeline ----

@pytest.fixture(scope="module")
def walked_bundle(tmp_path_factory):
    root: Path = tmp_path_factory.mktemp("walk") / "bundle"
    write_synthetic_bundle(root, length_m=PLOT_LENGTH, breadth_m=PLOT_BREADTH,
                           slope=PLOT_SLOPE, obstacle=OBSTACLE)
    return load_bundle(root)


def test_reconstruction_uses_depth(walked_bundle):
    reconstruction = reconstruct(walked_bundle)
    assert reconstruction.method == "depth-fusion"
    assert reconstruction.frames_used >= 30
    assert len(reconstruction.points) > 5000
    assert reconstruction.loop_error_m is not None
    assert reconstruction.loop_error_m < 0.5  # closed loop


def test_pipeline_recovers_dimensions_within_half_metre(walked_bundle, tmp_path):
    result = run_survey(walked_bundle, artefacts_dir=tmp_path)
    assert result["status"] == "completed"
    assert abs(result["dimensions"]["lengthM"] - PLOT_LENGTH) <= 0.5
    assert abs(result["dimensions"]["breadthM"] - PLOT_BREADTH) <= 0.5
    assert abs(result["terrain"]["global_slope_pct"] - PLOT_SLOPE * 100) < 1.0
    assert result["confidence"]["grade"] in {"high", "medium"}
    assert (tmp_path / "layout.geojson").exists()
    assert (tmp_path / "report.json").exists()
    assert (tmp_path / "ortho.png").exists()
    glb_file = tmp_path / "terrain.glb"
    assert glb_file.exists()
    assert glb_file.stat().st_size > 500
    with open(glb_file, "rb") as f:
        assert f.read(4) == b"glTF"


def test_relayout_switches_profile(walked_bundle, tmp_path):
    car = run_survey(walked_bundle, profile_key="CAR")
    bike = relayout(car, "BIKE", walked_bundle)
    assert bike["profile"] == "BIKE"
    assert len(bike["layout"]["bays"]) > len(car["layout"]["bays"])


def test_usable_polygon_respects_slope_limit():
    ground = build_ground_model(_synthetic_cloud(with_obstacle=False))
    steep = get_profile("BUS")
    steep = type(steep)(
        key="STEEP_TEST", label="test", bay_width_m=2.5, bay_length_m=5.0,
        aisle_width_m=6.0, angles_deg=(90,), max_slope_pct=0.5, max_roughness_m=0.01,
    )
    assert usable_polygon(ground, steep) is None
    assert usable_polygon(ground, get_profile("CAR")) is not None
