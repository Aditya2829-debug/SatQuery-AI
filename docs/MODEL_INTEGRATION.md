# Models 1–3 backend handoff

Models 1, 2, and 3 all live on team `main` and expose backend-facing Python interfaces.
Large trained artifacts stay outside Git and are injected through environment variables or explicit paths.

| Model | Purpose | Python entry point | External artifact |
| --- | --- | --- | --- |
| Model 1 | Qwen3-VL satellite VQA | `satquery.models.qwen_vqa.QwenVQA` | trained LoRA adapter directory |
| Model 2 | RemoteCLIP classification / retrieval | `satquery.models.remoteclip` | official RemoteCLIP checkpoint; retrieval also needs index |
| Model 3 | bi-temporal change detection | `satquery.models.change_detection.ChangeDetector` | `cd003_fixedmask_best.pt` |

Details and metrics:

- [MODEL1.md](MODEL1.md) · [Model 1 metrics](../outputs/model1_metrics.json)
- [MODEL2.md](MODEL2.md) · [Model 2 summary](../outputs/model2/remoteclip_model2_summary.json)
- [MODEL3.md](MODEL3.md) · [Model 3 metrics](../outputs/model3/model3_metrics.json)

## Install

From the repository root:

```bash
python -m pip install -r requirements-models.txt
python -m pip install -e .
```

For the existing backend also install:

```bash
python -m pip install -r backend/SatQueryAI_backend/requirements.txt
```

## Required artifact environment variables

```bash
SATQUERY_MODEL1_ADAPTER=/absolute/path/to/qwen3vl_vrsbench_lora
SATQUERY_MODEL2_CHECKPOINT=/absolute/path/to/RemoteCLIP-ViT-B-32.pt
SATQUERY_MODEL2_INDEX=/absolute/path/to/eurosat_remoteclip_vitb32_index.pt
SATQUERY_MODEL3_CHECKPOINT=/absolute/path/to/cd003_fixedmask_best.pt
```

`SATQUERY_MODEL2_INDEX` is only required for retrieval. Model 2 classification only needs the RemoteCLIP checkpoint.
The historical Model 2 index is still marked `restore_required`; regenerate or restore the real embedding index rather than fabricating one.

## Unified runnable CLI

```bash
python examples/model_inference.py vqa --image /data/scene.png --query "Is there a river?"
python examples/model_inference.py classify --image /data/scene.png --classes river forest urban
python examples/model_inference.py retrieve --query "a satellite image of a river" --top-k 5
python examples/model_inference.py change --before /data/t1.png --after /data/t2.png
```

Optional flags include `--adapter`, `--checkpoint`, `--index`, and `--device cpu|cuda`.

## Python interfaces

### Model 1

```python
from satquery.models.qwen_vqa import QwenVQA

vqa = QwenVQA()
result = vqa.predict(image_bytes, "Is there a river?")
```

### Model 2

```python
from satquery.models.remoteclip import RemoteCLIPModel, RemoteCLIPZeroShotClassifier

remoteclip = RemoteCLIPModel()
classifier = RemoteCLIPZeroShotClassifier(remoteclip)
classes = ["river", "forest", "urban"]
class_embeddings = classifier.build_class_embeddings(classes)
result = classifier.predict(image_bytes, classes, class_embeddings=class_embeddings)
```

Retrieval:

```python
from satquery.models.remoteclip import RemoteCLIPRetriever

retriever = RemoteCLIPRetriever(remoteclip, None)  # reads SATQUERY_MODEL2_INDEX
results = retriever.search("a satellite image of a river", top_k=5)
```

### Model 3

```python
from satquery.models.change_detection import ChangeDetector

change = ChangeDetector()  # reads SATQUERY_MODEL3_CHECKPOINT
result = change.detect(before_image_bytes, after_image_bytes)
```

Model 3 accepts local paths, encoded image bytes, or PIL images. The raw `mask` is a NumPy array; remove it or encode it before returning JSON from an HTTP API.

## Existing backend bridges

`backend/SatQueryAI_backend/app/models/trained.py` exposes:

- `QwenVQAModel`
- `RemoteCLIPClassifierModel`
- `RemoteCLIPRetrievalModel`
- `ChangeDetectionModel`

These implement the existing `BaseSpecialistModel.process(inputs) -> ModelResult` contract.

Example startup injection for VQA:

```python
from satquery.models.qwen_vqa import QwenVQA
from app.models.trained import QwenVQAModel
from app.specialists.vqa_adapter import VisualVQAAdapter
from app.services.pipeline_service import pipeline_service

pipeline_service.registry.register("vqa", VisualVQAAdapter(QwenVQAModel(QwenVQA())))
```

Model 2 classification bridge expects `{"image_bytes": ...}`. Retrieval expects `{"query": ..., "top_k": 5}`.
Model 3 bridge expects `{"before_image_bytes": ..., "after_image_bytes": ...}` and removes the non-JSON NumPy mask while preserving change percentage, threshold, regions, source size, and mask size.

## Integration status

- **Model 1 code/docs/metrics:** ready on `main`; deployment still needs the trained LoRA adapter provisioned.
- **Model 2 code/docs/metrics/classification:** ready on `main`; deployment needs the official RemoteCLIP checkpoint. Retrieval additionally needs the real restored/regenerated embedding index.
- **Model 3 code/docs/metrics/live inference:** ready on `main`; deployment needs the trained `cd003_fixedmask_best.pt` checkpoint.

Do not commit large weights or fabricated indexes. Initialize each model once per worker process and reuse it across requests.
