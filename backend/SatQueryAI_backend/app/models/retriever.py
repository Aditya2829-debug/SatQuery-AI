"""Text-to-image retrieval over a saved RemoteCLIP embedding index."""

from pathlib import Path

import torch

from .artifacts import artifact_path


class RemoteCLIPRetriever:
    def __init__(self, model, index_path: str | Path | None = None) -> None:
        self.model = model
        self.image_embeddings: torch.Tensor | None = None
        self.labels: torch.Tensor | None = None
        self.classes: list[str] | None = None
        self.image_paths: list[str] | None = None
        if index_path is not None:
            self.load_index(index_path)

    def load_index(self, index_path: str | Path) -> "RemoteCLIPRetriever":
        path = artifact_path(index_path, "SATQUERY_MODEL2_INDEX")
        data = torch.load(path, map_location="cpu", weights_only=True)
        if not isinstance(data, dict):
            raise ValueError("Index must contain a dictionary.")

        embeddings = data.get("embeddings")
        if not isinstance(embeddings, torch.Tensor) or embeddings.ndim != 2:
            raise ValueError("Index must contain a two-dimensional 'embeddings' tensor.")
        embeddings = embeddings.float()
        if min(embeddings.shape) == 0 or not torch.isfinite(embeddings).all():
            raise ValueError("Index embeddings must be nonempty and finite.")
        norms = embeddings.norm(dim=-1, keepdim=True)
        if not torch.isfinite(norms).all() or (norms <= 0).any():
            raise ValueError("Index embeddings must have finite, nonzero norms.")
        labels, classes, paths = (data.get(key) for key in ("labels", "classes", "image_paths"))
        if paths is not None and (
            not isinstance(paths, list)
            or len(paths) != len(embeddings)
            or not all(isinstance(p, str) for p in paths)
        ):
            raise ValueError("image_paths must contain one string per embedding.")
        if classes is not None and (
            not isinstance(classes, list)
            or not classes
            or not all(isinstance(c, str) for c in classes)
        ):
            raise ValueError("classes must be a nonempty list of strings.")
        if labels is not None:
            if (
                not isinstance(labels, torch.Tensor)
                or labels.ndim != 1
                or len(labels) != len(embeddings)
                or labels.dtype
                not in (torch.int8, torch.int16, torch.int32, torch.int64, torch.uint8)
            ):
                raise ValueError("labels must be a one-dimensional integer tensor matching rows.")
            if (labels < 0).any() or (classes is not None and (labels >= len(classes)).any()):
                raise ValueError("Index labels are out of range.")
        # Commit state only after the entire artifact passes validation.
        self.image_embeddings = embeddings / norms
        self.labels, self.classes, self.image_paths = labels, classes, paths
        return self

    @torch.inference_mode()
    def search(self, query: str, top_k: int = 5) -> list[dict[str, object]]:
        if self.image_embeddings is None:
            raise RuntimeError("No image index loaded.")
        if not isinstance(query, str) or not query.strip():
            raise ValueError("Query must not be empty.")
        if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1:
            raise ValueError("top_k must be at least 1.")

        text_feature = self.model.encode_text([query]).cpu().float()
        if text_feature.shape != (1, self.image_embeddings.shape[1]):
            raise ValueError("Query embedding dimension does not match the index model.")
        if not torch.isfinite(text_feature).all() or text_feature.norm() <= 0:
            raise ValueError("Query embedding must be finite and nonzero.")
        text_feature /= text_feature.norm(dim=-1, keepdim=True).clamp_min(1e-12)
        scores = (text_feature @ self.image_embeddings.T).squeeze(0)
        values, indices = torch.topk(scores, k=min(top_k, scores.numel()))

        results = []
        for rank, (index, score) in enumerate(zip(indices.tolist(), values.tolist()), start=1):
            result: dict[str, object] = {
                "rank": rank,
                "index": index,
                "score": float(score),
            }
            if self.image_paths is not None:
                result["image_path"] = self.image_paths[index]
            if self.labels is not None:
                label_index = int(self.labels[index])
                result["label_index"] = label_index
                if self.classes is not None:
                    result["label"] = self.classes[label_index]
            results.append(result)
        return results
