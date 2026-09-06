import io
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch
from PIL import Image
import pytest

from app.models.loader import LazyGroundingSpecialistModel, get_grounding_model
from app.models.placeholders import PlaceholderGroundingModel
from app.models.trained import RemoteCLIPGroundingModel
from app.schemas.image import ImageContext
from app.schemas.model_result import ModelResult
from app.services.pipeline_service import ModelPipelineService
from app.specialists.grounding_adapter import RegionGroundingAdapter
from app.specialists.registry import SpecialistRegistry


def _create_sample_jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(34, 139, 34)).save(buf, format="JPEG")
    return buf.getvalue()


def _create_mock_image_context(image_id: str = "12345678-1234-5678-1234-567812345678") -> ImageContext:
    return ImageContext(
        image_id=image_id,
        file_name="sample_forest.jpg",
        file_type="image/jpeg",
        file_size=2048,
        storage_path=f"satellite-images/uploads/{image_id}.jpg",
        image_bytes=_create_sample_jpeg_bytes(),
        source="Sentinel-2",
        capture_date=None,
        latitude=45.0,
        longitude=10.0,
        resolution_m=10.0,
        metadata={"platform": "Sentinel-2A"},
        created_at=datetime.now(timezone.utc),
    )


def test_get_grounding_model_returns_lazy_specialist():
    """Test that get_grounding_model returns the lazy singleton without eager weight loading."""
    model = get_grounding_model()
    assert isinstance(model, LazyGroundingSpecialistModel)
    assert model.model_name == "RemoteCLIP-ViT-B-32"


def test_lazy_grounding_model_fallback_when_unconfigured():
    """Test that LazyGroundingSpecialistModel falls back to Placeholder when checkpoint unconfigured."""
    lazy = LazyGroundingSpecialistModel()
    with patch("app.models.loader.settings.SATQUERY_MODEL2_CHECKPOINT", ""):
        result = lazy.process({"query": "Locate river", "image_bytes": b"fake"})
        assert isinstance(result, ModelResult)
        assert result.status == "NOT_IMPLEMENTED"
        assert result.model_name == "Placeholder-Grounding-v1"


def test_remoteclip_grounding_model_direct_mocked_execution():
    """Test RemoteCLIPGroundingModel data flow with mocked classifier and retriever."""
    mock_classifier = MagicMock()
    mock_classifier.build_class_embeddings.return_value = None
    mock_classifier.predict.return_value = {
        "label": "forest",
        "label_index": 1,
        "score": 0.82,
        "scores": [0.1, 0.82, 0.08],
    }

    mock_retriever = MagicMock()
    mock_retriever.search.return_value = [
        {"rank": 1, "index": 42, "score": 0.79, "label": "forest"}
    ]

    grounding_model = RemoteCLIPGroundingModel(
        classifier=mock_classifier,
        classes=["annual crop", "forest", "river"],
        retriever=mock_retriever,
    )

    inputs = {
        "query": "find dense green forest canopy",
        "image_bytes": _create_sample_jpeg_bytes(),
    }
    res = grounding_model.process(inputs)

    assert isinstance(res, ModelResult)
    assert res.status == "success"
    assert res.model_name == "RemoteCLIP-ViT-B-32"
    assert res.confidence == 0.82
    assert res.result["predicted_class"] == "forest"
    assert res.result["classification"]["top_label"] == "forest"
    assert len(res.result["retrieval"]) == 1
    assert res.result["retrieval"][0]["index"] == 42


def test_grounding_adapter_with_real_or_mock_model():
    """Test RegionGroundingAdapter integrates with Grounding specialist model."""
    adapter = RegionGroundingAdapter(model=get_grounding_model())
    img = _create_mock_image_context()

    res = adapter.process(query="Locate forest and trees", images=[img])
    assert isinstance(res, ModelResult)
    assert res.model_name in ("RemoteCLIP-ViT-B-32", "Placeholder-Grounding-v1")


def test_grounding_pipeline_end_to_end():
    """Test full pipeline service selecting and executing region_grounding specialist."""
    registry = SpecialistRegistry()
    registry.register("region_grounding", RegionGroundingAdapter(model=get_grounding_model()))

    pipeline = ModelPipelineService(registry=registry)
    img = _create_mock_image_context()

    selection, res = pipeline.run_pipeline(
        query="Highlight agricultural fields and water bodies",
        images=[img],
        force_specialist="region_grounding",
    )

    assert selection.selected_specialist == "region_grounding"
    assert isinstance(res, ModelResult)
    assert res.model_name in ("RemoteCLIP-ViT-B-32", "Placeholder-Grounding-v1")
