# Model 2 — RemoteCLIP

Code: [`src/satquery/models/remoteclip`](../src/satquery/models/remoteclip).
Setup, backend bridges and usage: [integration handoff](MODEL_INTEGRATION.md).

The existing OpenCLIP architecture is ViT-B-32 with official RemoteCLIP weights.
`RemoteCLIPModel` exposes normalized image/text embeddings;
`RemoteCLIPZeroShotClassifier` chooses among supplied class labels;
`RemoteCLIPRetriever` ranks a saved image embedding index by cosine similarity.
An explicit `pretrained` OpenCLIP baseline is still supported for comparisons,
but it is not the evaluated RemoteCLIP model. A default load requires trained weights.

## Recorded evaluation

Source: [committed metrics JSON](../outputs/model2/remoteclip_model2_summary.json).
These numbers are preserved from the previous run and have not been rerun here.

| EuroSAT classification, 2,700 samples | Accuracy |
| --- | --- |
| Raw class labels (selected) | 37.30% |
| Generic prompts | 34.15% |
| Semantic prompts | 36.59% |

For 10 retrieval queries, semantic natural-language queries were selected:
P@1 0.60, P@5 0.64, P@10 0.65, mAP 0.3934, MRR 0.7228.
This small benchmark does not establish general retrieval accuracy. The exact
historical index remains unavailable, as recorded in the
[index manifest](../data/model2/index_manifest.json).

## Index contract and restoration

Use a local `torch.save` dictionary containing:

- `embeddings`: nonempty finite floating tensor `[N, D]` with nonzero rows;
  the reported historical index is `[2700, 512]`.
- `labels` (optional): integer tensor `[N]`, zero-based class IDs.
- `classes` (optional): ordered list of label strings.
- `image_paths` (optional): list of `N` image path strings.

The loader normalizes embeddings and checks metadata lengths/ranges. Query and
index dimensions must match. Equal dimensions alone do not prove compatibility:
use the same exact checkpoint, architecture, and preprocessing for both.
Indexes load with `weights_only=True`; only use artifacts from trusted storage.
Missing indexes fail clearly. Classification needs no index.

Restore the original `eurosat_remoteclip_vitb32_index.pt` from the owner's backup
when possible. Otherwise create a new ordered manifest, for example:

```jsonl
{"image_path": "River/one.jpg", "label": "river"}
{"image_path": "Forest/two.jpg", "label": "forest"}
```

Then run from the repo root:

```bash
python scripts/build_remoteclip_index.py --manifest /data/images.jsonl --image-root /data/EuroSAT --output /models/new_remoteclip_index.pt
```

The builder uses the configured checkpoint, sorted unique class labels and the
manifest row order. It refuses to overwrite an existing output. Save the input
manifest and checkpoint checksum alongside the new artifact externally. This
does not reproduce the original 2,700-image subset automatically: re-evaluate
any rebuilt index and keep new metrics separate from the historical summary.
