"""
Gemini-powered implementation of BaseModelSelector.

Uses the google-genai SDK to delegate specialist selection entirely to the
Gemini model.  Only image *metadata* is sent -- raw image_bytes are never
included in the prompt.

Design notes:
- All Gemini-specific code is isolated here so the provider can be swapped
  without touching ModelPipelineService, SpecialistRegistry, or adapters.
- The Gemini client can be injected at construction time to allow unit-testing
  without real API calls.
- Any invalid/unusable response from Gemini raises ValidationException rather
  than silently defaulting to a specialist.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from google import genai

from app.core.config import settings
from app.core.exceptions import ValidationException
from app.core.logging import get_logger
from app.router.model_selector import BaseModelSelector
from app.schemas.image import ImageContext
from app.schemas.model_result import ModelSelectionResult

logger = get_logger(__name__)

# The four valid specialist identifiers the selector is allowed to return.
_ALLOWED_SPECIALISTS = frozenset(
    {"vqa", "region_grounding", "change_detection", "optical_sar_fusion"}
)

_SYSTEM_PROMPT = """\
You are a satellite imagery analysis router.

Your ONLY job is to read the user's query and the provided image metadata, then
choose EXACTLY ONE specialist that should process the request.

Available specialists:

1. "vqa"
   Use for general visual question answering: describing scene content,
   identifying objects/features, classification, or any question about
   what is visible in the image.

2. "region_grounding"
   Use when the query asks to LOCATE, HIGHLIGHT, or IDENTIFY the
   position/region/bounding area of a specific object or feature within the
   image (e.g. "where is the river?", "show the urban area").

3. "change_detection"
   Use when the query requires COMPARING two satellite images -- especially
   for temporal or spatial change analysis (e.g. "how has the coastline
   changed?", "detect deforestation"). Normally requires exactly 2 images.

4. "optical_sar_fusion"
   Use when the query requires COMBINED analysis of BOTH optical and SAR
   imagery together. You MUST base this decision on explicit modality
   information present in the image metadata (source field or metadata
   field). Do NOT guess the modality.

Rules:
- Choose exactly one specialist from the list above.
- Return ONLY a valid JSON object -- no markdown fences, no explanation outside
  the JSON.
- "confidence" must be a float between 0.0 and 1.0.
- "reason" must be a concise one-sentence justification.
- "signals" is a free-form dict of key observations that led to your decision.

Required output format (strict JSON):
{
  "selected_specialist": "vqa | region_grounding | change_detection | optical_sar_fusion",
  "confidence": 0.0,
  "reason": "short explanation",
  "signals": {}
}
"""


def _extract_image_metadata(images: List[ImageContext]) -> List[Dict[str, Any]]:
    """
    Convert a list of ImageContext objects into metadata-only dicts.

    Explicitly excludes image_bytes and storage_path so no binary or
    internal-infra data leaks into the Gemini prompt.
    """
    result = []
    for img in images:
        capture_date_str = img.capture_date.isoformat() if img.capture_date else None
        result.append(
            {
                "image_id": img.image_id,
                "file_name": img.file_name,
                "file_type": img.file_type,
                "source": img.source,
                "capture_date": capture_date_str,
                "latitude": img.latitude,
                "longitude": img.longitude,
                "resolution_m": img.resolution_m,
                "metadata": img.metadata,
                "image_count": len(images),
            }
        )
    return result


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` fences if present."""
    stripped = text.strip()
    match = re.match(r"^```[a-z]*\s*(.*?)\s*```$", stripped, re.DOTALL)
    if match:
        return match.group(1).strip()
    return stripped


def _parse_and_validate(raw_text: str) -> ModelSelectionResult:
    """
    Parse Gemini's text response into a validated ModelSelectionResult.

    Raises:
        ValidationException: If JSON is malformed, specialist is not in the
            allowed set, or confidence is outside [0.0, 1.0].
    """
    cleaned = _strip_markdown_fences(raw_text)
    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValidationException(
            message="Gemini returned invalid JSON for specialist selection.",
            details={"raw_response": raw_text[:500], "error": str(exc)},
        ) from exc

    # Validate required field: selected_specialist
    specialist = data.get("selected_specialist")
    if not isinstance(specialist, str) or specialist not in _ALLOWED_SPECIALISTS:
        raise ValidationException(
            message=(
                f"Gemini returned an unrecognised specialist: {specialist!r}. "
                f"Allowed values: {sorted(_ALLOWED_SPECIALISTS)}"
            ),
            details={"raw_response": raw_text[:500]},
        )

    # Validate required field: confidence
    confidence = data.get("confidence")
    if not isinstance(confidence, (int, float)):
        raise ValidationException(
            message="Gemini response missing or non-numeric 'confidence' field.",
            details={"raw_response": raw_text[:500]},
        )
    confidence = float(confidence)
    if not (0.0 <= confidence <= 1.0):
        raise ValidationException(
            message=f"Gemini returned confidence={confidence} which is outside [0.0, 1.0].",
            details={"raw_response": raw_text[:500]},
        )

    # Validate required field: reason
    reason = data.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        raise ValidationException(
            message="Gemini response missing or empty 'reason' field.",
            details={"raw_response": raw_text[:500]},
        )

    signals: Dict[str, Any] = data.get("signals") or {}

    return ModelSelectionResult(
        selected_specialist=specialist,
        confidence=confidence,
        reason=reason.strip(),
        signals=signals,
    )


class GeminiModelSelector(BaseModelSelector):
    """
    Gemini-powered implementation of BaseModelSelector.

    Sends query text and sanitised image metadata to a Gemini model and
    interprets its structured JSON response to produce a ModelSelectionResult.

    Args:
        client: Optional pre-built google.genai.Client instance.  When
            None (default), a client is created using the API key from
            app.core.config.settings.  Pass a mock client in tests to
            avoid real network calls.
        model_name: Gemini model identifier.  Defaults to the value of
            settings.GEMINI_MODEL_NAME.
    """

    def __init__(
        self,
        client: Optional[genai.Client] = None,
        model_name: Optional[str] = None,
    ) -> None:
        self._client: genai.Client = client or genai.Client(
            api_key=settings.GEMINI_API_KEY
        )
        self._model_name: str = model_name or settings.GEMINI_MODEL_NAME

    # ------------------------------------------------------------------
    # Public API (implements BaseModelSelector)
    # ------------------------------------------------------------------

    def select_specialist(
        self, query: str, images: List[ImageContext]
    ) -> ModelSelectionResult:
        """
        Calls Gemini with query text and image metadata to select a specialist.

        Raw image_bytes are never included in the request -- only the
        structured metadata extracted by _extract_image_metadata is sent.

        Args:
            query: Natural language request from the user.
            images: List of loaded ImageContext objects.

        Returns:
            ModelSelectionResult with the selected specialist and confidence.

        Raises:
            ValidationException: If Gemini returns an unusable response or the
                API call itself fails.
        """
        image_metadata = _extract_image_metadata(images)

        user_message = json.dumps(
            {
                "query": query,
                "image_count": len(images),
                "images": image_metadata,
            },
            default=str,
            indent=2,
        )

        logger.info(
            f"GeminiModelSelector: calling model='{self._model_name}' "
            f"for query='{query[:80]}' with {len(images)} image(s)."
        )

        try:
            response = self._client.models.generate_content(
                model=self._model_name,
                contents=f"{_SYSTEM_PROMPT}\n\nInput:\n{user_message}",
            )
            raw_text: str = response.text
        except Exception as exc:
            logger.error(f"GeminiModelSelector: API call failed -- {exc}")
            raise ValidationException(
                message="Gemini API call failed during specialist selection.",
                details={"error": str(exc)},
            ) from exc

        logger.debug(f"GeminiModelSelector: raw response -- {raw_text[:300]}")

        return _parse_and_validate(raw_text)
