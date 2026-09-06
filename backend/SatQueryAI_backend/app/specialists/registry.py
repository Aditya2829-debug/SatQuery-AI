from typing import Dict, List, Optional
from app.specialists.base import BaseSpecialistAdapter
from app.specialists.vqa_adapter import VisualVQAAdapter
from app.specialists.grounding_adapter import RegionGroundingAdapter
from app.specialists.change_detection_adapter import ChangeDetectionAdapter
from app.specialists.optical_sar_fusion_adapter import OpticalSARFusionAdapter


class SpecialistRegistry:
    """
    Registry for managing available specialist adapters.
    Allows runtime registration and dependency injection of custom adapters or models.
    """

    def __init__(self):
        self._adapters: Dict[str, BaseSpecialistAdapter] = {}

    def register(self, key: str, adapter: BaseSpecialistAdapter) -> None:
        """Registers a specialist adapter under a unique string key."""
        self._adapters[key.lower()] = adapter

    def get(self, key: str) -> BaseSpecialistAdapter:
        """Retrieves a registered specialist adapter by key."""
        key_clean = key.lower()
        if key_clean not in self._adapters:
            raise KeyError(f"Specialist adapter '{key}' is not registered in SpecialistRegistry.")
        return self._adapters[key_clean]

    def has(self, key: str) -> bool:
        """Checks if a specialist adapter is registered."""
        return key.lower() in self._adapters

    def list_specialists(self) -> List[str]:
        """Lists all registered specialist adapter keys."""
        return list(self._adapters.keys())


def create_default_specialist_registry() -> SpecialistRegistry:
    """Factory creating a SpecialistRegistry with default adapters.

    The VQA adapter uses real QwenVQAModel when SATQUERY_MODEL1_ADAPTER is set.
    The RegionGrounding adapter uses real RemoteCLIPGroundingModel when SATQUERY_MODEL2_CHECKPOINT is set.
    The ChangeDetection adapter uses real CD003-UNet-ResNet34 when SATQUERY_MODEL3_CHECKPOINT is set.
    All other specialists fall back to their placeholder models until further integration.
    """
    from app.models.loader import get_change_detection_model, get_grounding_model, get_vqa_model  # local import avoids circular deps

    registry = SpecialistRegistry()
    registry.register("vqa", VisualVQAAdapter(model=get_vqa_model()))
    registry.register("region_grounding", RegionGroundingAdapter(model=get_grounding_model()))
    registry.register("change_detection", ChangeDetectionAdapter(model=get_change_detection_model()))
    registry.register("optical_sar_fusion", OpticalSARFusionAdapter())
    return registry

