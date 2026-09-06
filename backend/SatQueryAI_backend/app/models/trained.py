"""Opt-in bridges for trained ML packages; existing registry defaults are preserved."""

from app.models.base import BaseSpecialistModel
from app.schemas.model_result import ModelResult


class QwenVQAModel(BaseSpecialistModel):
    def __init__(self, predictor):
        super().__init__("Qwen3-VL-2B-Instruct-QLoRA")
        self.predictor = predictor

    def process(self, inputs):
        prediction = self.predictor.predict(inputs["image_bytes"], inputs["query"])
        return ModelResult(status="success", result=prediction, model_name=self.model_name, confidence=None, limitations=["Uncalibrated VQA answer; no bounding boxes or geospatial measurements."])


class RemoteCLIPClassifierModel(BaseSpecialistModel):
    def __init__(self, classifier, classes):
        super().__init__("RemoteCLIP-ViT-B-32")
        if not classes:
            raise ValueError("Provide the ordered candidate class labels.")
        self.classifier = classifier
        self.classes = list(classes)
        self.embeddings = classifier.build_class_embeddings(self.classes)

    def process(self, inputs):
        prediction = self.classifier.predict(inputs["image_bytes"], self.classes, class_embeddings=self.embeddings)
        prediction = {**prediction, "scores": prediction["scores"].tolist()}
        return ModelResult(status="success", result=prediction, model_name=self.model_name, confidence=None, limitations=["Cosine similarity is not probability; classification provides no boxes."])


class RemoteCLIPRetrievalModel(BaseSpecialistModel):
    def __init__(self, retriever):
        super().__init__("RemoteCLIP-ViT-B-32")
        self.retriever = retriever

    def process(self, inputs):
        return ModelResult(status="success", model_name=self.model_name, confidence=None, result=self.retriever.search(inputs["query"], top_k=inputs.get("top_k", 5)), limitations=["Results refer to the configured index; scores are cosine similarities."])


class RemoteCLIPGroundingModel(BaseSpecialistModel):
    """
    Unified Region Grounding & Semantic Localization Specialist Model using RemoteCLIP.

    Executes:
    1. Zero-shot scene / land-cover classification on the input satellite image
       against EuroSAT semantic classes.
    2. Text-to-image semantic retrieval matching the user query across the indexed
       satellite imagery knowledge base (if index is loaded).
    """

    def __init__(self, classifier=None, classes=None, retriever=None):
        super().__init__("RemoteCLIP-ViT-B-32")
        self.classifier = classifier
        self.classes = list(classes) if classes else []
        self.embeddings = (
            classifier.build_class_embeddings(self.classes)
            if (classifier and self.classes)
            else None
        )
        self.retriever = retriever

    def process(self, inputs):
        result = {}
        limitations = [
            "Cosine similarity indicates semantic alignment, not spatial bounding polygon.",
            "Retrieval matches refer to the indexed EuroSAT satellite dataset.",
        ]

        # 1. Zero-shot Classification on input satellite image
        if self.classifier and self.classes and inputs.get("image_bytes"):
            prediction = self.classifier.predict(
                inputs["image_bytes"], self.classes, class_embeddings=self.embeddings
            )
            scores = prediction["scores"]
            if hasattr(scores, "tolist"):
                scores = scores.tolist()
            result["classification"] = {
                "top_label": prediction["label"],
                "top_label_index": prediction["label_index"],
                "confidence_score": prediction["score"],
                "class_scores": {
                    cls_name: float(scores[i])
                    for i, cls_name in enumerate(self.classes)
                },
            }

        # 2. Text-to-image Semantic Retrieval matching the query in EuroSAT index
        if self.retriever and inputs.get("query"):
            top_k = inputs.get("top_k", 5)
            try:
                retrieval_matches = self.retriever.search(inputs["query"], top_k=top_k)
                result["retrieval"] = retrieval_matches
            except Exception as e:
                result["retrieval_error"] = str(e)

        # Primary prediction summary for easy consumer access
        confidence_val = None
        if "classification" in result:
            result["predicted_class"] = result["classification"]["top_label"]
            result["similarity_score"] = result["classification"]["confidence_score"]
            confidence_val = result["classification"]["confidence_score"]
        elif "retrieval" in result and result["retrieval"]:
            result["top_retrieval_match"] = result["retrieval"][0]
            confidence_val = result["retrieval"][0].get("score")

        return ModelResult(
            status="success",
            result=result,
            confidence=confidence_val,
            model_name=self.model_name,
            limitations=limitations,
            metadata={
                "has_classification": "classification" in result,
                "has_retrieval": "retrieval" in result,
                "classes_count": len(self.classes),
            },
        )



class ChangeDetectionModel(BaseSpecialistModel):
    def __init__(self, detector):
        super().__init__("CD003-UNet-ResNet34")
        self.detector = detector

    def process(self, inputs):
        before_bytes = inputs.get("before_image_bytes")
        if before_bytes is None and "image_1" in inputs and isinstance(inputs["image_1"], dict):
            before_bytes = inputs["image_1"].get("image_bytes")

        after_bytes = inputs.get("after_image_bytes")
        if after_bytes is None and "image_2" in inputs and isinstance(inputs["image_2"], dict):
            after_bytes = inputs["image_2"].get("image_bytes")

        result = self.detector.detect(before_bytes, after_bytes)
        # The raw numpy mask is useful internally but not JSON serializable. Backend clients
        # receive structured regions, sizes, threshold and change percentage instead.
        result_clean = {key: value for key, value in result.items() if key != "mask"}
        return ModelResult(
            status="success",
            result=result_clean,
            model_name=self.model_name,
            confidence=round(min(1.0, result.get("change_percent", 0.0) / 100.0), 4) if result.get("changed") else 1.0,
            limitations=[
                "Requires aligned before/after RGB imagery; change percentage is pixel-based at model resolution."
            ],
            metadata={
                "changed": result.get("changed", False),
                "num_regions": result.get("num_regions", 0),
                "threshold": result.get("threshold", 0.75),
            },
        )


