"""OpenCLIP-compatible wrapper used with the official RemoteCLIP checkpoint."""

from pathlib import Path
from typing import Sequence

import torch

from ..artifacts import artifact_path
from ..images import rgb_image


class RemoteCLIPModel:
    """Load RemoteCLIP and expose normalized image and text embeddings.

    ``checkpoint_path`` should point to an official RemoteCLIP checkpoint.  A
    named OpenCLIP pretrained weight may be supplied instead for smoke tests.
    """

    def __init__(
        self,
        model_name: str = "ViT-B-32",
        *,
        checkpoint_path: str | Path | None = None,
        pretrained: str | None = None,
        device: str | torch.device | None = None,
    ) -> None:
        if checkpoint_path is not None and pretrained is not None:
            raise ValueError("Provide checkpoint_path or pretrained, not both.")
        if pretrained is None:
            checkpoint_path = artifact_path(checkpoint_path, "SATQUERY_MODEL2_CHECKPOINT")
        try:
            import open_clip
        except ImportError as exc:  # pragma: no cover - depends on optional runtime package
            raise ImportError(
                "RemoteCLIP requires open_clip_torch. Install the project requirements first."
            ) from exc

        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model_name = model_name
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            model_name,
            pretrained=pretrained,
        )
        if checkpoint_path is not None:
            checkpoint_path = Path(checkpoint_path)
            if not checkpoint_path.is_file():
                raise FileNotFoundError(f"RemoteCLIP checkpoint not found: {checkpoint_path}")
            open_clip.load_checkpoint(self.model, str(checkpoint_path))

        self.tokenizer = open_clip.get_tokenizer(model_name)
        self.model = self.model.to(self.device).eval()

    @staticmethod
    def _normalize(features: torch.Tensor) -> torch.Tensor:
        return features / features.norm(dim=-1, keepdim=True).clamp_min(1e-12)

    @torch.inference_mode()
    def encode_image(self, image) -> torch.Tensor:
        image_tensor = self.preprocess(rgb_image(image)).unsqueeze(0).to(self.device)
        return self._normalize(self.model.encode_image(image_tensor))

    @torch.inference_mode()
    def encode_text(self, texts: Sequence[str]) -> torch.Tensor:
        tokens = self.tokenizer(list(texts)).to(self.device)
        return self._normalize(self.model.encode_text(tokens))

    @torch.inference_mode()
    def similarity(self, image, texts: Sequence[str]) -> torch.Tensor:
        return (self.encode_image(image) @ self.encode_text(texts).T).squeeze(0)
