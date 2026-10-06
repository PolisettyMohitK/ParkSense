from app.detection.slots import propose, propose_grid
from tests.synthetic import synthetic_lot


def test_grid_proposal_count():
    slots = propose_grid(800, 400, rows=2, cols=3)
    assert len(slots) == 6
    for slot in slots:
        assert len(slot.polygon) == 4


def test_grid_respects_roi():
    slots = propose_grid(800, 400, rows=1, cols=2, roi=[0.25, 0.5, 0.75, 1.0])
    xs = [point[0] for point in slots[0].polygon]
    ys = [point[1] for point in slots[0].polygon]
    assert min(xs) >= 190
    assert max(xs) <= 610
    assert min(ys) >= 190


def test_line_detection_finds_bays():
    image = synthetic_lot()
    result = propose(image, mode="lines")
    assert result.method == "lines"
    assert len(result.slots) >= 5, result.note
    for slot in result.slots:
        assert len(slot.polygon) == 4


def test_auto_falls_back_to_grid_when_blank():
    import numpy as np

    blank = np.full((300, 300, 3), 128, dtype=np.uint8)
    result = propose(blank, rows=2, cols=2, mode="auto")
    assert result.method == "grid"
    assert len(result.slots) == 4
