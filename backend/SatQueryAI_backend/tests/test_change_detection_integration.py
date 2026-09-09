"""
Integration tests for the Change Detection specialist (CD003-UNet-ResNet34).

Coverage:
  - Lazy singleton loading returns correct type without eager weight loading
  - Fallback to PlaceholderChangeDetectionModel when checkpoint unconfigured
  - ChangeDetectionModel data-flow with mocked ChangeDetector
  - ChangeDetectionAdapter validates 2-image constraint
  - Full pipeline service end-to-end for change_detection specialist
"""

import io
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from PIL import Image

from app.models.loader import LazyChangeDetectionSpecialistModel, get_change_detection_model
from app.models.placeholders import PlaceholderChangeDetectionModel
from app.models.trained import ChangeDetectionModel
from app.schemas.image import ImageContext
from app.schemas.model_result import ModelResult
from app.services.pipeline_service import ModelPipelineService
from app.specialists.change_detection_adapter import ChangeDetectionAdapter
from app.specialists.registry import SpecialistRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _jpeg_bytes(color: tuple = (50, 150, 50), size: tuple = (64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color=color).save(buf, format="JPEG")
    return buf.getvalue()


def _mock_image_context(image_id: str = "aaaabbbb-cccc-dddd-eeee-ffffffffffff") -> ImageContext:
    return ImageContext(
        image_id=image_id,
        file_name="scene.jpg",
        file_type="image/jpeg",
        file_size=2048,
        storage_path=f"satellite-images/uploads/{image_id}.jpg",
        image_bytes=_jpeg_bytes(),
        source="Sentinel-2",
        capture_date=None,
        latitude=48.8566,
        longitude=2.3522,
        resolution_m=10.0,
        metadata={"platform": "Sentinel-2A"},
        created_at=datetime.now(timezone.utc),
    )


def _fake_detect_result(changed: bool = False, change_percent: float = 0.0) -> dict:
    """Return a minimal dict matching ChangeDetector.detect() output."""
    mask = np.zeros((256, 256), dtype=np.uint8)
    return {
        "changed": changed,
        "change_percent": change_percent,
        "threshold": 0.75,
        "num_regions": 1 if changed else 0,
        "regions": [{"bbox": [10, 10, 50, 50], "area": 400}] if changed else [],
        "mask": mask,
        "source_size": {"width": 64, "height": 64},
        "mask_size": {"width": 256, "height": 256},
    }


# ---------------------------------------------------------------------------
# 1. Lazy singleton
# ---------------------------------------------------------------------------

def test_get_change_detection_model_returns_lazy_specialist():
    """get_change_detection_model() returns LazyChangeDetectionSpecialistModel without loading weights."""
    model = get_change_detection_model()
    assert isinstance(model, LazyChangeDetectionSpecialistModel)
    assert model.model_name == "CD003-UNet-ResNet34"


def test_lazy_change_detection_model_is_singleton():
    """Calling get_change_detection_model() twice returns the same object."""
    m1 = get_change_detection_model()
    m2 = get_change_detection_model()
    assert m1 is m2


# ---------------------------------------------------------------------------
# 2. Fallback when checkpoint not configured
# ---------------------------------------------------------------------------

def test_lazy_change_detection_falls_back_when_unconfigured():
    """LazyChangeDetectionSpecialistModel uses Placeholder when SATQUERY_MODEL3_CHECKPOINT is empty."""
    lazy = LazyChangeDetectionSpecialistModel()
    with patch("app.models.loader.settings.SATQUERY_MODEL3_CHECKPOINT", ""):
        inputs = {
            "image_1": {"image_bytes": _jpeg_bytes()},
            "image_2": {"image_bytes": _jpeg_bytes((180, 50, 50))},
        }
        result = lazy.process(inputs)
    assert isinstance(result, ModelResult)
    assert result.status == "NOT_IMPLEMENTED"
    assert result.model_name == "Placeholder-ChangeDetection-v1"


# ---------------------------------------------------------------------------
# 3. ChangeDetectionModel with mocked detector
# ---------------------------------------------------------------------------

def test_change_detection_model_image_1_2_input_format():
    """ChangeDetectionModel.process reads image_1 / image_2 dict inputs (adapter format)."""
    mock_detector = MagicMock()
    mock_detector.detect.return_value = _fake_detect_result(changed=True, change_percent=8.3)

    model = ChangeDetectionModel(detector=mock_detector)
    inputs = {
        "query": "Has deforestation occurred?",
        "image_1": {"image_bytes": _jpeg_bytes(), "image_id": "img-before"},
        "image_2": {"image_bytes": _jpeg_bytes((180, 50, 50)), "image_id": "img-after"},
    }
    res = model.process(inputs)

    assert isinstance(res, ModelResult)
    assert res.status == "success"
    assert res.model_name == "CD003-UNet-ResNet34"
    assert res.result["changed"] is True
    assert res.result["num_regions"] == 1
    assert "mask" not in res.result  # must be stripped — not JSON serialisable
    mock_detector.detect.assert_called_once()


def test_change_detection_model_direct_bytes_input_format():
    """ChangeDetectionModel.process accepts legacy before_image_bytes / after_image_bytes keys."""
    mock_detector = MagicMock()
    mock_detector.detect.return_value = _fake_detect_result(changed=False)

    model = ChangeDetectionModel(detector=mock_detector)
    before = _jpeg_bytes()
    after = _jpeg_bytes()
    inputs = {
        "before_image_bytes": before,
        "after_image_bytes": after,
    }
    res = model.process(inputs)

    assert res.status == "success"
    assert res.result["changed"] is False
    mock_detector.detect.assert_called_once_with(before, after)


def test_change_detection_model_no_change_has_max_confidence():
    """When there is no change, confidence returned is 1.0 (certainty of no change)."""
    mock_detector = MagicMock()
    mock_detector.detect.return_value = _fake_detect_result(changed=False, change_percent=0.0)

    model = ChangeDetectionModel(detector=mock_detector)
    inputs = {"before_image_bytes": _jpeg_bytes(), "after_image_bytes": _jpeg_bytes()}
    res = model.process(inputs)
    assert res.confidence == 1.0


def test_change_detection_model_metadata_populated():
    """Metadata contains changed, num_regions, and threshold keys."""
    mock_detector = MagicMock()
    mock_detector.detect.return_value = _fake_detect_result(changed=True, change_percent=15.5)

    model = ChangeDetectionModel(detector=mock_detector)
    inputs = {"before_image_bytes": _jpeg_bytes(), "after_image_bytes": _jpeg_bytes((180, 50, 50))}
    res = model.process(inputs)
    assert res.metadata is not None
    assert "changed" in res.metadata
    assert "num_regions" in res.metadata
    assert "threshold" in res.metadata


# ---------------------------------------------------------------------------
# 4. ChangeDetectionAdapter — input validation
# ---------------------------------------------------------------------------

def test_change_detection_adapter_requires_exactly_two_images():
    """ChangeDetectionAdapter raises ValidationException when image count != 2."""
    from app.core.exceptions import ValidationException

    adapter = ChangeDetectionAdapter()
    img = _mock_image_context()

    with pytest.raises(ValidationException):
        adapter.process(query="Compare these scenes", images=[img])  # 1 image -> must fail


def test_change_detection_adapter_accepts_exactly_two_images():
    """ChangeDetectionAdapter correctly prepares inputs for 2 images and calls model.process."""
    mock_model = MagicMock(spec=["process", "model_name", "model_version"])
    mock_model.model_name = "CD003-UNet-ResNet34"
    mock_model.process.return_value = ModelResult(
        status="success",
        result={"changed": False},
        model_name="CD003-UNet-ResNet34",
        confidence=1.0,
    )

    img1 = _mock_image_context("img-before-001")
    img2 = _mock_image_context("img-after-002")
    img2 = img2.model_copy(update={"image_bytes": _jpeg_bytes((180, 50, 50))})

    adapter = ChangeDetectionAdapter(model=mock_model)
    result = adapter.process(query="Detect land-use changes", images=[img1, img2])

    assert isinstance(result, ModelResult)
    assert result.status == "success"
    mock_model.process.assert_called_once()
    call_inputs = mock_model.process.call_args[0][0]
    assert "image_1" in call_inputs
    assert "image_2" in call_inputs
    assert call_inputs["image_1"]["image_id"] == "img-before-001"
    assert call_inputs["image_2"]["image_id"] == "img-after-002"


# ---------------------------------------------------------------------------
# 5. Full pipeline routing via force_specialist
# ---------------------------------------------------------------------------

def test_change_detection_pipeline_end_to_end():
    """Full ModelPipelineService end-to-end for change_detection specialist with mocked model."""
    mock_model = MagicMock(spec=["process", "model_name", "model_version"])
    mock_model.model_name = "CD003-UNet-ResNet34"
    mock_model.process.return_value = ModelResult(
        status="success",
        result={"changed": True, "change_percent": 5.2, "num_regions": 1, "regions": []},
        model_name="CD003-UNet-ResNet34",
        confidence=0.052,
        metadata={"changed": True, "num_regions": 1, "threshold": 0.75},
    )

    registry = SpecialistRegistry()
    registry.register("change_detection", ChangeDetectionAdapter(model=mock_model))
    pipeline = ModelPipelineService(registry=registry)

    img1 = _mock_image_context("before-scene")
    img2 = _mock_image_context("after-scene")

    selection, res = pipeline.run_pipeline(
        query="Detect deforestation between two dates",
        images=[img1, img2],
        force_specialist="change_detection",
    )

    assert selection.selected_specialist == "change_detection"
    assert isinstance(res, ModelResult)
    assert res.status == "success"
    assert res.model_name == "CD003-UNet-ResNet34"
    assert res.result["changed"] is True
