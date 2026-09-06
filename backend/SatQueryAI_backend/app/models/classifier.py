"""Zero-shot RemoteCLIP classification."""

from collections.abc import Callable, Sequence

import torch

from .prompts import build_prompts


class RemoteCLIPZeroShotClassifier:
    def __init__(self, model) -> None:
        self.model = model

    @torch.inference_mode()
    def build_class_embeddings(
        self,
        classes: Sequence[str],
        *,
        use_prompt_ensemble: bool = False,
        prompt_builder: Callable[[str], Sequence[str]] = build_prompts,
    ) -> torch.Tensor:
        embeddings = []
        for label in classes:
            texts = list(prompt_builder(label)) if use_prompt_ensemble else [label]
            features = self.model.encode_text(texts)
            feature = features.mean(dim=0, keepdim=True)
            feature = feature / feature.norm(dim=-1, keepdim=True).clamp_min(1e-12)
            embeddings.append(feature)
        return torch.cat(embeddings, dim=0)

    @torch.inference_mode()
    def predict(
        self,
        image,
        classes: Sequence[str],
        *,
        class_embeddings: torch.Tensor | None = None,
    ) -> dict[str, object]:
        if not classes:
            raise ValueError("At least one class is required.")
        embeddings = class_embeddings
        if embeddings is None:
            embeddings = self.build_class_embeddings(classes)
        image_embedding = self.model.encode_image(image).to(embeddings.device)
        scores = (image_embedding @ embeddings.T).squeeze(0)
        index = int(scores.argmax().item())
        return {
            "label": classes[index],
            "label_index": index,
            "score": float(scores[index].item()),
            "scores": scores.detach().cpu(),
        }
