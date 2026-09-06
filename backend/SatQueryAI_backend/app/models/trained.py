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


class ChangeDetectionModel(BaseSpecialistModel):
    def __init__(self, detector):
        super().__init__("CD003-UNet-ResNet34")
        self.detector = detector

    def process(self, inputs):
        result = self.detector.detect(inputs["before_image_bytes"], inputs["after_image_bytes"])
        result = {key: value for key, value in result.items() if key != "mask"}
        return ModelResult(status="success", result=result, model_name=self.model_name, confidence=None, limitations=["Requires aligned before/after RGB imagery; change percentage is pixel-based at model resolution."])


class OpticalSARFusionModel(BaseSpecialistModel):
    """Bridge for trained Model 4; expects a preprocessed six-channel tensor."""

    def __init__(self, predictor):
        super().__init__("Model4-Optical-SAR-Fusion")
        self.predictor = predictor

    def process(self, inputs):
        prediction = self.predictor.predict(inputs["fusion_tensor"])
        return ModelResult(
            status="success",
            result={
                "bands": self.predictor.output_bands,
                "shape": list(prediction.shape),
                "tensor": prediction.tolist(),
            },
            model_name=self.model_name,
            confidence=None,
            limitations=["Requires co-registered B4/B3/B2/B8 optical and VV/VH SAR tensors in the exact training preprocessing space."],
        )
