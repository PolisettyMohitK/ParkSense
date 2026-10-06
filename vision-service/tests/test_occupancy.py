from app.detection.occupancy import classify
from tests.synthetic import bay_polygons, synthetic_lot


def _slots():
    return [
        {"id": f"R1C{index + 1}", "polygon": polygon, "space_id": index + 1}
        for index, polygon in enumerate(bay_polygons())
    ]


def test_classifies_occupied_and_vacant_without_reference():
    image = synthetic_lot(occupied_bays=(1, 3))
    detections, threshold = classify(image, _slots())

    by_id = {detection.slot_id: detection for detection in detections}
    assert by_id["R1C2"].occupied is True
    assert by_id["R1C4"].occupied is True
    assert by_id["R1C1"].occupied is False
    assert by_id["R1C3"].occupied is False
    assert 0.0 < threshold < 1.0


def test_reference_image_mode_detects_change():
    empty = synthetic_lot(occupied_bays=())
    current = synthetic_lot(occupied_bays=(2,))
    detections, _ = classify(current, _slots(), reference=empty)

    by_id = {detection.slot_id: detection for detection in detections}
    assert by_id["R1C3"].occupied is True
    assert by_id["R1C1"].occupied is False
    assert by_id["R1C3"].method == "difference"


def test_confidence_is_bounded():
    image = synthetic_lot(occupied_bays=(0, 5))
    detections, _ = classify(image, _slots())
    for detection in detections:
        assert 0.0 <= detection.confidence <= 1.0
        assert 0.0 <= detection.score <= 1.0
