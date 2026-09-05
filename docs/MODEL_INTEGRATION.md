# Model 1 and Model 2: backend handoff

Both implementations live on team `main`. Model 1 is Qwen3-VL VQA; Model 2 is
RemoteCLIP classification and text-to-image retrieval. They do not produce
bounding boxes, segmentation masks, or geospatial measurements.

| Asset | Model 1 | Model 2 |
| --- | --- | --- |
| Python entry point | `satquery.models.qwen_vqa.QwenVQA` | `satquery.models.remoteclip` |
| Model details | [MODEL1.md](MODEL1.md) | [MODEL2.md](MODEL2.md) |
| Recorded metrics | [model1_metrics.json](../outputs/model1_metrics.json) | [summary](../outputs/model2/remoteclip_model2_summary.json) |
| External artifacts | Base model + trained LoRA directory | Official ViT-B-32 checkpoint; retrieval also needs an index |
| Artifact readiness | Adapter location/access must be confirmed with training owner | Original index is `restore_required`; checkpoint must be provisioned |

## Install and configure

Use Python 3.11 in an isolated environment. From the repository root:

```bash
python -m pip install -r requirements-models.txt
python -m pip install -e .
```

For the team backend also install
`backend/SatQueryAI_backend/requirements.txt`. The model-only requirements avoid
installing the whole GIS/backend stack for inference. NVIDIA GPU is recommended
for Model 1; CPU float32 is supported by the loader but can be slow and needs
enough RAM. This loader applies LoRA to the base model without 4-bit quantization;
QLoRA describes the historical training method.

Set these in the **worker process environment**, or pass explicit paths to the
loaders. Copying `.env.example` alone does not load these values into Python.
Relative paths resolve from the current working directory; absolute paths are
recommended, especially when starting the backend from its own folder.

| Environment variable | Required content |
| --- | --- |
| `SATQUERY_MODEL1_ADAPTER` | Directory with `adapter_config.json` and `adapter_model.safetensors` (or `adapter_model.bin`) from the completed VRSBench run |
| `SATQUERY_MODEL2_CHECKPOINT` | Local official `RemoteCLIP-ViT-B-32.pt` checkpoint |
| `SATQUERY_MODEL2_INDEX` | Local compatible retrieval index `.pt`; unnecessary for classification |

Explicit paths take precedence over environment values. Missing files fail
before loading the model. Weights/indexes remain outside Git; no artifact URL
or access permission has been verified for the team's trained adapter/index.
Obtain these from the training owner and record checksums in your deployment
inventory. Do not use randomly initialized weights or fabricated embeddings.
Model 1 downloads its public base model/processor into the Hugging Face cache
on first use; for an offline worker, pre-stage it and pass its local directory
as `base_model`. See the [official Qwen model card](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct)
and [RemoteCLIP upstream](https://github.com/ChenDelong1999/RemoteCLIP) for public base weights.

## Runnable examples

After setting the environment variables above:

```bash
python examples/model_inference.py vqa --image /data/scene.png --query "Is there a river?"
python examples/model_inference.py classify --image /data/scene.png --classes river forest
python examples/model_inference.py retrieve --query "a satellite image of a river" --top-k 5
```

The same script accepts `--adapter`, `--checkpoint`, `--index`, and `--device cpu`
or `--device cuda`. Outputs are JSON. Initialize models once per inference
worker, reuse them, and serialize GPU requests or use a bounded inference queue.
Run blocking inference outside the async HTTP event loop.

```python
from satquery.models.qwen_vqa import QwenVQA
from satquery.models.remoteclip import RemoteCLIPModel, RemoteCLIPZeroShotClassifier

vqa = QwenVQA()  # environment adapter path
answer = vqa.predict("/data/scene.png", "Is there a river?")
# {"answer": ..., "raw_answer": ..., "model": ..., "confidence": None}

model2 = RemoteCLIPModel()  # environment checkpoint path
classifier = RemoteCLIPZeroShotClassifier(model2)
classes = ["river", "forest"]  # ordered candidate labels chosen by the application
embeddings = classifier.build_class_embeddings(classes)  # cache for this class list
result = classifier.predict("/data/scene.png", classes, class_embeddings=embeddings)
# label, label_index, score, scores (CPU tensor; convert scores.tolist() for JSON)
```

Image inputs accept local paths, encoded image bytes, or PIL images and become
RGB. URLs are not fetched. Convert multispectral/SAR rasters to an appropriate
validated RGB representation upstream; these interfaces do not establish SAR
or multispectral accuracy. Model 1 answers are not calibrated confidence scores;
Model 2 returns cosine similarities, which can be negative and are not probabilities.

## Connect to the existing backend

The opt-in bridges in `backend/SatQueryAI_backend/app/models/trained.py` implement
the existing `BaseSpecialistModel.process(inputs) -> ModelResult` interface. They
return JSON-serializable results with `confidence=None`. The backend registry,
router, endpoints, and default placeholders keep their current behavior until
the backend owner explicitly injects a configured model at worker startup.

Run this from `backend/SatQueryAI_backend` after installing the root package:

```python
from satquery.models.qwen_vqa import QwenVQA
from app.models.trained import QwenVQAModel
from app.specialists.vqa_adapter import VisualVQAAdapter
from app.services.pipeline_service import pipeline_service

pipeline_service.registry.register("vqa", VisualVQAAdapter(QwenVQAModel(QwenVQA())))
# Existing requests selecting vqa now use this model in this worker process.
```

For Model 2, `RemoteCLIPClassifierModel(classifier, classes).process(inputs)`
expects `{"image_bytes": encoded_bytes}`. `RemoteCLIPRetrievalModel(retriever)`
expects `{"query": text, "top_k": 5}`. Construct the retriever with
`RemoteCLIPRetriever(model2, index_path)` (or call `load_index(None)` to use the
environment index path). The existing router has no retrieval/classification
route: call these bridges from the intended backend service or add deliberate
routing later. Do not substitute RemoteCLIP for the region-grounding specialist.
Resolve returned image paths against the configured image-storage root; paths
from an old Colab index may need remapping. Retrieval does not serve image bytes.

## Validation and release limitations

```bash
python -m pip install pytest pillow pydantic pydantic-settings fastapi PyYAML
python -m pytest -q tests
```

CI uses CPU tensors and test doubles without downloading weights. Tests cover
artifact failures, image conversion, generation prompt trimming, retrieval/index
validation, backend contracts, index-building round trips, and Model 1's recorded
68/100 result. Historical metrics are evidence from committed runs, not a new
evaluation of this loader. Before deploying, run all three real-artifact CLI
commands above in the target worker environment and verify its outputs and latency.
Live model inference remains unverified until the trained artifacts are available.
