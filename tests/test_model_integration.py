import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
import torch
from PIL import Image

from satquery.models.artifacts import artifact_path
from satquery.models.images import rgb_image
from satquery.models.qwen_vqa import QwenVQA
from satquery.models.remoteclip import RemoteCLIPModel, RemoteCLIPRetriever

ROOT = Path(__file__).resolve().parents[1]


def test_qwen_loads_adapter_on_cpu(monkeypatch, tmp_path):
    (tmp_path / "adapter_config.json").write_text("{}")
    (tmp_path / "adapter_model.safetensors").touch()
    calls = {}

    class Base:
        def to(self, device):
            assert str(device) == "cpu"
            return self

    def load_base(name, **kwargs):
        calls["base"] = name
        assert kwargs["torch_dtype"] == torch.float32
        return Base()

    def load_adapter(base, path):
        assert isinstance(base, Base)
        calls["adapter"] = path
        return SimpleNamespace(eval=lambda: "ready")

    monkeypatch.setitem(
        sys.modules,
        "transformers",
        SimpleNamespace(
            AutoProcessor=SimpleNamespace(from_pretrained=lambda name: "processor"),
            AutoModelForImageTextToText=SimpleNamespace(from_pretrained=load_base),
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "peft",
        SimpleNamespace(
            PeftModel=SimpleNamespace(from_pretrained=load_adapter),
        ),
    )
    model = QwenVQA(tmp_path, device="cpu")
    assert model.model == "ready"
    assert calls == {"base": "Qwen/Qwen3-VL-2B-Instruct", "adapter": str(tmp_path.resolve())}


def test_artifact_paths(monkeypatch, tmp_path):
    monkeypatch.delenv("SATQUERY_MODEL1_ADAPTER", raising=False)
    with pytest.raises(ValueError, match="SATQUERY_MODEL1_ADAPTER"):
        QwenVQA()
    with pytest.raises(FileNotFoundError):
        QwenVQA(tmp_path / "missing")
    with pytest.raises(ValueError, match="adapter_config"):
        QwenVQA(tmp_path)
    artifact = tmp_path / "index.pt"
    artifact.touch()
    monkeypatch.setenv("SATQUERY_MODEL2_INDEX", str(artifact))
    assert artifact_path(None, "SATQUERY_MODEL2_INDEX") == artifact.resolve()
    with pytest.raises(FileNotFoundError):
        artifact_path(tmp_path / "explicit-missing", "SATQUERY_MODEL2_INDEX")


def test_remoteclip_requires_weights_before_loading(monkeypatch):
    monkeypatch.delenv("SATQUERY_MODEL2_CHECKPOINT", raising=False)
    with pytest.raises(ValueError, match="SATQUERY_MODEL2_CHECKPOINT"):
        RemoteCLIPModel()
    with pytest.raises(ValueError, match="not both"):
        RemoteCLIPModel(checkpoint_path="x", pretrained="y")


def test_image_bytes_and_path(tmp_path):
    path = tmp_path / "image.png"
    Image.new("L", (3, 4)).save(path)
    assert rgb_image(path).mode == "RGB"
    assert rgb_image(path.read_bytes()).size == (3, 4)
    with pytest.raises(TypeError):
        rgb_image(None)


def test_qwen_generation_trims_prompt_and_returns_json():
    class Inputs(dict):
        def __init__(self):
            super().__init__(input_ids=torch.tensor([[10, 20]]))
            self.input_ids = self["input_ids"]

        def to(self, device):
            return self

    class Processor:
        def apply_chat_template(self, messages, **kwargs):
            assert "Question: What is visible?" in messages[0]["content"][1]["text"]
            return "prompt"

        def __call__(self, **kwargs):
            assert kwargs["images"][0].mode == "RGB"
            return Inputs()

        def batch_decode(self, outputs, **kwargs):
            assert outputs[0].tolist() == [30]
            return ["Answer: River."]

    def generate(**kwargs):
        assert kwargs["do_sample"] is False
        assert kwargs["max_new_tokens"] == 24
        return torch.tensor([[10, 20, 30]])

    predictor = QwenVQA.__new__(QwenVQA)
    predictor.processor, predictor.device = Processor(), "cpu"
    predictor.model = SimpleNamespace(generate=generate)
    result = predictor.predict(Image.new("RGB", (2, 2)), "What is visible?")
    assert result["answer"] == "river"
    assert result["confidence"] is None
    json.dumps(result)
    with pytest.raises(ValueError):
        predictor.predict(None, " ")


@pytest.mark.parametrize(
    "data",
    [
        [],
        {"embeddings": torch.zeros(0, 2)},
        {"embeddings": torch.zeros(1, 2)},
        {"embeddings": torch.tensor([[float("nan"), 1.0]])},
        {"embeddings": torch.ones(2, 2), "image_paths": ["one.jpg"]},
        {"embeddings": torch.ones(2, 2), "labels": torch.tensor([0.0, 1.0])},
        {"embeddings": torch.ones(2, 2), "labels": torch.tensor([0, 2]), "classes": ["a"]},
    ],
)
def test_reject_invalid_indexes(tmp_path, data):
    path = tmp_path / "bad.pt"
    torch.save(data, path)
    with pytest.raises(ValueError):
        RemoteCLIPRetriever(None, path)


def test_index_query_dimension_and_reload_atomicity(tmp_path):
    path = tmp_path / "index.pt"
    torch.save({"embeddings": torch.eye(2)}, path)
    model = SimpleNamespace(encode_text=lambda texts: torch.ones(1, 3))
    retriever = RemoteCLIPRetriever(model, path)
    with pytest.raises(ValueError, match="dimension"):
        retriever.search("river")
    torch.save({"embeddings": torch.ones(1, 2), "image_paths": []}, path)
    with pytest.raises(ValueError):
        retriever.load_index(path)
    assert torch.equal(retriever.image_embeddings, torch.eye(2))


def test_backend_bridges(monkeypatch):
    monkeypatch.syspath_prepend(str(ROOT / "backend/SatQueryAI_backend"))
    from app.models.trained import (
        QwenVQAModel,
        RemoteCLIPClassifierModel,
        RemoteCLIPRetrievalModel,
    )
    from app.specialists.vqa_adapter import VisualVQAAdapter

    def predict(image, question):
        assert image == b"image" and question == "river?"
        return {"answer": "yes", "confidence": None}

    bridge = QwenVQAModel(SimpleNamespace(predict=predict))
    adapter = VisualVQAAdapter(bridge)
    image = SimpleNamespace(
        image_id="1",
        file_name="a.png",
        storage_path="a.png",
        image_bytes=b"image",
        source="optical",
        resolution_m=10,
        metadata={},
    )
    result = adapter.process("river?", [image])
    assert result.status == "success" and result.result["answer"] == "yes"
    assert result.confidence is None
    json.loads(result.model_dump_json())
    classifier = SimpleNamespace(
        build_class_embeddings=lambda classes: torch.eye(2),
        predict=lambda *args, **kwargs: {
            "label": "river",
            "score": -0.1,
            "scores": torch.tensor([-0.1, -0.2]),
        },
    )
    result = RemoteCLIPClassifierModel(classifier, ["river", "forest"]).process(
        {"image_bytes": b"image"}
    )
    assert result.confidence is None
    assert isinstance(json.loads(result.model_dump_json())["result"]["scores"], list)
    retriever = SimpleNamespace(search=lambda query, top_k: [{"rank": 1, "score": 0.5}])
    result = RemoteCLIPRetrievalModel(retriever).process({"query": "river"})
    assert result.result[0]["rank"] == 1


def test_recorded_model1_accuracy():
    rows = [
        json.loads(line)
        for line in (ROOT / "outputs/qwen3vl_lora_vrsbench100.jsonl").read_text().splitlines()
    ]
    metrics = json.loads((ROOT / "outputs/model1_metrics.json").read_text())
    assert len(rows) == 100
    assert sum(row["correct"] for row in rows) == metrics["qlora_accuracy"]


def test_build_index_roundtrip(tmp_path):
    spec = importlib.util.spec_from_file_location(
        "builder", ROOT / "scripts/build_remoteclip_index.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    (tmp_path / "a.png").touch()
    model = SimpleNamespace(
        encode_image=lambda path: torch.tensor([[1.0, 0.0]]),
        encode_text=lambda texts: torch.tensor([[1.0, 0.0]]),
    )
    data = module.build_index(model, [{"image_path": "a.png", "label": "river"}], tmp_path)
    path = tmp_path / "index.pt"
    torch.save(data, path)
    assert RemoteCLIPRetriever(model, path).search("river", 10)[0]["label"] == "river"
