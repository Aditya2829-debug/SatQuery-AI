"""
Lazy singleton loaders for trained specialist models.

Bridges raw ML model implementations (QwenVQA, RemoteCLIP, ChangeDetector) with the
BaseSpecialistModel interface used by the specialist adapters.

Design Principles:
------------------
1. Non-blocking Startup: Heavy model checkpoints (torch, open_clip, transformers)
   are NEVER loaded during application startup or test discovery.
2. Lazy Evaluation: Checkpoints are loaded once into memory on the FIRST `process()`
   call and cached for subsequent inferences.
3. Safe Fallback: If environment variables are empty or dependencies missing,
   the model seamlessly falls back to the placeholder model without raising unhandled errors.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.core.config import settings
from app.models.base import BaseSpecialistModel
from app.models.placeholders import (
    PlaceholderChangeDetectionModel,
    PlaceholderGroundingModel,
    PlaceholderVQAModel,
)
from app.schemas.model_result import ModelResult

logger = logging.getLogger(__name__)


class LazyVQASpecialistModel(BaseSpecialistModel):
    """
    Lazy wrapper for QwenVQA model.
    Defers importing and loading Qwen3-VL-2B + LoRA adapter until the first process() call.
    """

    def __init__(self):
        super().__init__(model_name="Qwen3-VL-2B-Instruct-QLoRA", model_version="1.0.0")
        self._loaded_model: Optional[BaseSpecialistModel] = None
        self._placeholder = PlaceholderVQAModel()

    def _get_or_load_model(self) -> BaseSpecialistModel:
        if self._loaded_model is not None:
            return self._loaded_model

        adapter_path: str = settings.SATQUERY_MODEL1_ADAPTER.strip()
        if not adapter_path:
            logger.info("SATQUERY_MODEL1_ADAPTER not configured — using PlaceholderVQAModel.")
            self._loaded_model = self._placeholder
            return self._loaded_model

        try:
            from app.models.qwen_vqa import QwenVQA
            from app.models.trained import QwenVQAModel

            logger.info(f"Loading QwenVQA from adapter path: {adapter_path}")
            predictor = QwenVQA(adapter_path=adapter_path)
            self._loaded_model = QwenVQAModel(predictor=predictor)
            logger.info(
                f"QwenVQA loaded successfully on device: {predictor.device} — VQA ready."
            )
            return self._loaded_model

        except FileNotFoundError as exc:
            logger.warning(f"QwenVQA adapter not found ({exc}). Using PlaceholderVQAModel.")
        except ValueError as exc:
            logger.warning(f"QwenVQA adapter invalid ({exc}). Using PlaceholderVQAModel.")
        except ImportError as exc:
            logger.warning(
                f"ML dependency missing ({exc}). "
                "Install torch, transformers, peft to enable real VQA inference."
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Unexpected error loading QwenVQA ({exc}). Using PlaceholderVQAModel.")

        self._loaded_model = self._placeholder
        return self._loaded_model

    def process(self, inputs: Dict[str, Any]) -> ModelResult:
        model = self._get_or_load_model()
        return model.process(inputs)


class LazyGroundingSpecialistModel(BaseSpecialistModel):
    """
    Lazy wrapper for RemoteCLIP Grounding model.
    Defers importing and loading RemoteCLIP checkpoint and EuroSAT index until first process() call.
    """

    def __init__(self):
        super().__init__(model_name="RemoteCLIP-ViT-B-32", model_version="1.0.0")
        self._loaded_model: Optional[BaseSpecialistModel] = None
        self._placeholder = PlaceholderGroundingModel()

    def _get_or_load_model(self) -> BaseSpecialistModel:
        if self._loaded_model is not None:
            return self._loaded_model

        checkpoint_path: str = settings.SATQUERY_MODEL2_CHECKPOINT.strip()
        index_path: str = settings.SATQUERY_MODEL2_INDEX.strip()

        if not checkpoint_path:
            logger.info(
                "SATQUERY_MODEL2_CHECKPOINT not configured — using PlaceholderGroundingModel."
            )
            self._loaded_model = self._placeholder
            return self._loaded_model

        try:
            from app.models.classifier import RemoteCLIPZeroShotClassifier
            from app.models.prompts import SEMANTIC_PROMPTS
            from app.models.remote_clip import RemoteCLIPModel
            from app.models.retriever import RemoteCLIPRetriever
            from app.models.trained import RemoteCLIPGroundingModel

            logger.info(f"Loading RemoteCLIP from checkpoint: {checkpoint_path}")
            clip_model = RemoteCLIPModel(checkpoint_path=checkpoint_path)
            classifier = RemoteCLIPZeroShotClassifier(clip_model)

            retriever = None
            classes = list(SEMANTIC_PROMPTS.keys())

            if index_path:
                logger.info(f"Loading EuroSAT retrieval index: {index_path}")
                retriever = RemoteCLIPRetriever(clip_model, index_path=index_path)
                if retriever.classes:
                    classes = retriever.classes

            self._loaded_model = RemoteCLIPGroundingModel(
                classifier=classifier,
                classes=classes,
                retriever=retriever,
            )
            logger.info(
                f"RemoteCLIP Grounding model loaded on device: {clip_model.device} "
                f"with {len(classes)} classes (retrieval index: {'active' if retriever else 'none'})."
            )
            return self._loaded_model

        except FileNotFoundError as exc:
            logger.warning(
                f"RemoteCLIP checkpoint/index not found ({exc}). Using PlaceholderGroundingModel."
            )
        except ValueError as exc:
            logger.warning(
                f"RemoteCLIP configuration invalid ({exc}). Using PlaceholderGroundingModel."
            )
        except ImportError as exc:
            logger.warning(
                f"ML dependency missing ({exc}). "
                "Install open_clip_torch and torchvision to enable real Grounding inference."
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                f"Unexpected error loading RemoteCLIP ({exc}). Using PlaceholderGroundingModel."
            )

        self._loaded_model = self._placeholder
        return self._loaded_model

    def process(self, inputs: Dict[str, Any]) -> ModelResult:
        model = self._get_or_load_model()
        return model.process(inputs)


class LazyChangeDetectionSpecialistModel(BaseSpecialistModel):
    """
    Lazy wrapper for the CD003-UNet-ResNet34 Change Detection model.
    Defers importing and loading the segmentation checkpoint until the first process() call.
    The loaded model is retained for subsequent calls (singleton per instance).
    """

    def __init__(self):
        super().__init__(model_name="CD003-UNet-ResNet34", model_version="1.0.0")
        self._loaded_model: Optional[BaseSpecialistModel] = None
        self._placeholder = PlaceholderChangeDetectionModel()

    def _get_or_load_model(self) -> BaseSpecialistModel:
        if self._loaded_model is not None:
            return self._loaded_model

        checkpoint_path: str = settings.SATQUERY_MODEL3_CHECKPOINT.strip()

        if not checkpoint_path:
            logger.info(
                "SATQUERY_MODEL3_CHECKPOINT not configured — using PlaceholderChangeDetectionModel."
            )
            self._loaded_model = self._placeholder
            return self._loaded_model

        try:
            from app.models.detector import ChangeDetector
            from app.models.trained import ChangeDetectionModel

            logger.info(f"Loading ChangeDetector from checkpoint: {checkpoint_path}")
            detector = ChangeDetector(checkpoint_path=checkpoint_path)
            self._loaded_model = ChangeDetectionModel(detector=detector)
            logger.info(
                f"ChangeDetector loaded successfully on device: {detector.device} — Change Detection ready."
            )
            return self._loaded_model

        except FileNotFoundError as exc:
            logger.warning(
                f"Change Detection checkpoint not found ({exc}). Using PlaceholderChangeDetectionModel."
            )
        except ValueError as exc:
            logger.warning(
                f"Change Detection checkpoint invalid ({exc}). Using PlaceholderChangeDetectionModel."
            )
        except ImportError as exc:
            logger.warning(
                f"ML dependency missing ({exc}). "
                "Install segmentation-models-pytorch, torchvision, and opencv-python-headless "
                "to enable real Change Detection inference."
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                f"Unexpected error loading ChangeDetector ({exc}). Using PlaceholderChangeDetectionModel."
            )

        self._loaded_model = self._placeholder
        return self._loaded_model

    def process(self, inputs: Dict[str, Any]) -> ModelResult:
        model = self._get_or_load_model()
        return model.process(inputs)


_vqa_singleton = LazyVQASpecialistModel()
_grounding_singleton = LazyGroundingSpecialistModel()
_change_detection_singleton = LazyChangeDetectionSpecialistModel()


def get_vqa_model() -> BaseSpecialistModel:
    """Returns the lazy singleton BaseSpecialistModel for Visual Question Answering."""
    return _vqa_singleton


def get_grounding_model() -> BaseSpecialistModel:
    """Returns the lazy singleton BaseSpecialistModel for Region Grounding & Semantic Localization."""
    return _grounding_singleton


def get_change_detection_model() -> BaseSpecialistModel:
    """Returns the lazy singleton BaseSpecialistModel for Change Detection."""
    return _change_detection_singleton
