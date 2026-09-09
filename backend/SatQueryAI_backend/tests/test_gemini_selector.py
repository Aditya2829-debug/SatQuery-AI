"""
Focused unit tests for GeminiModelSelector.

Covers all 7 required scenarios:
  1. Successful Gemini JSON response.
  2. Invalid JSON response.
  3. Invalid specialist returned by Gemini.
  4. Confidence outside 0..1.
  5. Metadata extraction from ImageContext.
  6. Gemini API failure.
  7. Verify raw image_bytes are NOT sent to Gemini selector.
"""

from datetime import date, datetime, timezone
from typing import Any
from unittest.mock import MagicMock, patch
import json
import pytest

from app.core.exceptions import ValidationException
from app.router.gemini_selector import (
    GeminiModelSelector,
    _extract_image_metadata,
    _parse_and_validate,
)
from app.schemas.image import ImageContext
from app.schemas.model_result import ModelSelectionResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_client(text: str) -> MagicMock:
    """Build a mock google.genai.Client whose generate_content returns text."""
    mock_response = MagicMock()
    mock_response.text = text

    mock_models = MagicMock()
    mock_models.generate_content.return_value = mock_response

    mock_client = MagicMock()
    mock_client.models = mock_models
    return mock_client


def _make_image_context(
    image_id: str = "aaaa-1111",
    file_name: str = "scene.tif",
    file_type: str = "image/tiff",
    source: str = "Sentinel-2",
    image_bytes: bytes = b"\x89PNG\r\n\x1a\n",
) -> ImageContext:
    """Create a minimal ImageContext with image_bytes populated."""
    return ImageContext(
        image_id=image_id,
        file_name=file_name,
        file_type=file_type,
        file_size=len(image_bytes),
        storage_path=f"satellite-images/uploads/{image_id}.tif",
        image_bytes=image_bytes,
        source=source,
        capture_date=date(2024, 4, 12),
        latitude=37.7749,
        longitude=-122.4194,
        resolution_m=10.0,
        metadata={"satellite_name": source, "sensor": "MSI"},
        created_at=datetime.now(timezone.utc),
    )


_VALID_JSON = json.dumps(
    {
        "selected_specialist": "vqa",
        "confidence": 0.92,
        "reason": "Single optical image with a descriptive question.",
        "signals": {"image_count": 1, "modality": "optical"},
    }
)


# ---------------------------------------------------------------------------
# 1. Successful Gemini JSON response
# ---------------------------------------------------------------------------

class TestSuccessfulGeminiResponse:
    def test_returns_model_selection_result(self):
        mock_client = _make_mock_client(_VALID_JSON)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context()
        result = selector.select_specialist(query="What is visible?", images=[img])

        assert isinstance(result, ModelSelectionResult)
        assert result.selected_specialist == "vqa"
        assert result.confidence == pytest.approx(0.92)
        assert "optical" in result.reason.lower() or "single" in result.reason.lower()

    def test_wrapped_in_markdown_fence_is_parsed(self):
        """Gemini sometimes wraps JSON in markdown code fences."""
        fenced = f"```json\n{_VALID_JSON}\n```"
        mock_client = _make_mock_client(fenced)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context()
        result = selector.select_specialist(query="Describe the scene.", images=[img])
        assert result.selected_specialist == "vqa"

    def test_all_four_specialists_accepted(self):
        """Every valid specialist identifier should be accepted."""
        for specialist in ("vqa", "region_grounding", "change_detection", "optical_sar_fusion"):
            payload = json.dumps(
                {
                    "selected_specialist": specialist,
                    "confidence": 0.80,
                    "reason": "Test reason.",
                    "signals": {},
                }
            )
            mock_client = _make_mock_client(payload)
            selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")
            img = _make_image_context()
            result = selector.select_specialist(query="test query", images=[img])
            assert result.selected_specialist == specialist


# ---------------------------------------------------------------------------
# 2. Invalid JSON response
# ---------------------------------------------------------------------------

class TestInvalidJsonResponse:
    def test_raises_validation_exception(self):
        mock_client = _make_mock_client("This is not JSON at all!")
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context()
        with pytest.raises(ValidationException, match="invalid JSON"):
            selector.select_specialist(query="What is visible?", images=[img])

    def test_partial_json_raises_validation_exception(self):
        mock_client = _make_mock_client('{"selected_specialist": "vqa"')
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context()
        with pytest.raises(ValidationException, match="invalid JSON"):
            selector.select_specialist(query="test", images=[img])


# ---------------------------------------------------------------------------
# 3. Invalid specialist returned by Gemini
# ---------------------------------------------------------------------------

class TestInvalidSpecialist:
    def test_unknown_specialist_raises_validation_exception(self):
        bad_payload = json.dumps(
            {
                "selected_specialist": "super_model",
                "confidence": 0.99,
                "reason": "Looks good.",
                "signals": {},
            }
        )
        mock_client = _make_mock_client(bad_payload)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context()
        with pytest.raises(ValidationException, match="unrecognised specialist"):
            selector.select_specialist(query="test", images=[img])

    def test_null_specialist_raises_validation_exception(self):
        bad_payload = json.dumps(
            {
                "selected_specialist": None,
                "confidence": 0.5,
                "reason": "Cannot decide.",
                "signals": {},
            }
        )
        mock_client = _make_mock_client(bad_payload)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        with pytest.raises(ValidationException, match="unrecognised specialist"):
            selector.select_specialist(query="test", images=[_make_image_context()])


# ---------------------------------------------------------------------------
# 4. Confidence outside 0..1
# ---------------------------------------------------------------------------

class TestConfidenceValidation:
    @pytest.mark.parametrize("bad_conf", [-0.1, 1.01, 2.5, -100.0])
    def test_out_of_range_confidence_raises_validation_exception(self, bad_conf):
        payload = json.dumps(
            {
                "selected_specialist": "vqa",
                "confidence": bad_conf,
                "reason": "Bad confidence.",
                "signals": {},
            }
        )
        mock_client = _make_mock_client(payload)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        with pytest.raises(ValidationException, match="confidence"):
            selector.select_specialist(query="test", images=[_make_image_context()])

    def test_boundary_values_accepted(self):
        for conf in (0.0, 1.0):
            payload = json.dumps(
                {
                    "selected_specialist": "vqa",
                    "confidence": conf,
                    "reason": "Boundary test.",
                    "signals": {},
                }
            )
            mock_client = _make_mock_client(payload)
            selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")
            result = selector.select_specialist("test", [_make_image_context()])
            assert result.confidence == pytest.approx(conf)


# ---------------------------------------------------------------------------
# 5. Metadata extraction from ImageContext
# ---------------------------------------------------------------------------

class TestMetadataExtraction:
    def test_returns_expected_fields(self):
        img = _make_image_context(
            image_id="test-id-123",
            file_name="my_scene.tif",
            file_type="image/tiff",
            source="Sentinel-1",
            image_bytes=b"binary_payload_here",
        )
        metadata_list = _extract_image_metadata([img])
        assert len(metadata_list) == 1
        entry = metadata_list[0]

        assert entry["image_id"] == "test-id-123"
        assert entry["file_name"] == "my_scene.tif"
        assert entry["file_type"] == "image/tiff"
        assert entry["source"] == "Sentinel-1"
        assert entry["capture_date"] == "2024-04-12"
        assert entry["latitude"] == pytest.approx(37.7749)
        assert entry["longitude"] == pytest.approx(-122.4194)
        assert entry["resolution_m"] == pytest.approx(10.0)
        assert "satellite_name" in entry["metadata"]
        assert entry["image_count"] == 1

    def test_image_bytes_are_absent_from_extraction(self):
        img = _make_image_context(image_bytes=b"secret_binary_data")
        metadata_list = _extract_image_metadata([img])
        entry = metadata_list[0]

        # Neither the key "image_bytes" nor the actual bytes should appear.
        assert "image_bytes" not in entry
        for value in entry.values():
            if isinstance(value, (bytes, bytearray)):
                pytest.fail("image_bytes found in extracted metadata!")

    def test_multiple_images_all_extracted(self):
        imgs = [
            _make_image_context(image_id=f"id-{i}") for i in range(3)
        ]
        metadata_list = _extract_image_metadata(imgs)
        assert len(metadata_list) == 3
        assert all(entry["image_count"] == 3 for entry in metadata_list)

    def test_optional_fields_with_none_values(self):
        img = ImageContext(
            image_id="bare-id",
            file_name="bare.tif",
            file_type="image/tiff",
            storage_path="bucket/bare.tif",
        )
        metadata_list = _extract_image_metadata([img])
        entry = metadata_list[0]
        assert entry["source"] is None
        assert entry["capture_date"] is None
        assert entry["latitude"] is None
        assert entry["longitude"] is None


# ---------------------------------------------------------------------------
# 6. Gemini API failure
# ---------------------------------------------------------------------------

class TestGeminiApiFailure:
    def test_api_exception_raises_validation_exception(self):
        mock_models = MagicMock()
        mock_models.generate_content.side_effect = RuntimeError("Network timeout")

        mock_client = MagicMock()
        mock_client.models = mock_models

        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")
        img = _make_image_context()

        with pytest.raises(ValidationException, match="API call failed"):
            selector.select_specialist(query="test", images=[img])

    def test_api_exception_details_preserved(self):
        mock_models = MagicMock()
        mock_models.generate_content.side_effect = ConnectionError("API key invalid")

        mock_client = MagicMock()
        mock_client.models = mock_models

        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        with pytest.raises(ValidationException) as exc_info:
            selector.select_specialist(query="test", images=[_make_image_context()])

        assert "API key invalid" in exc_info.value.details.get("error", "")


# ---------------------------------------------------------------------------
# 7. Verify raw image_bytes are NOT sent to Gemini
# ---------------------------------------------------------------------------

class TestImageBytesNotSentToGemini:
    def test_generate_content_call_excludes_image_bytes(self):
        """Inspect the actual contents string passed to generate_content."""
        mock_client = _make_mock_client(_VALID_JSON)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context(image_bytes=b"\x89PNG\r\n\x1a\nSECRET_BINARY")
        selector.select_specialist(query="Describe the scene.", images=[img])

        call_args = mock_client.models.generate_content.call_args
        contents_arg: str = call_args.kwargs.get("contents") or call_args.args[1]

        # The raw bytes must not appear in the prompt (even as repr/escaped).
        assert "SECRET_BINARY" not in contents_arg
        assert "image_bytes" not in contents_arg

    def test_storage_path_not_sent_to_gemini(self):
        """storage_path is an internal infrastructure detail and must not be sent."""
        mock_client = _make_mock_client(_VALID_JSON)
        selector = GeminiModelSelector(client=mock_client, model_name="gemini-test")

        img = _make_image_context()
        selector.select_specialist(query="test", images=[img])

        call_args = mock_client.models.generate_content.call_args
        contents_arg: str = call_args.kwargs.get("contents") or call_args.args[1]

        assert "satellite-images/uploads" not in contents_arg
