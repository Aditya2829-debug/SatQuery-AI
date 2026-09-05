# SatQuery AI

## Model 1 and Model 2 — backend integration

Start with the **[integration handoff](docs/MODEL_INTEGRATION.md)** for installation,
external artifact paths, runnable examples, response formats, and backend injection.

| Model | Code | Details and recorded metrics |
| --- | --- | --- |
| 1 — Qwen3-VL VQA + LoRA | [Loader](src/satquery/models/qwen_vqa.py) | [Model 1](docs/MODEL1.md), [metrics](outputs/model1_metrics.json) |
| 2 — RemoteCLIP classification/retrieval | [Package](src/satquery/models/remoteclip) | [Model 2](docs/MODEL2.md), [metrics](outputs/model2/remoteclip_model2_summary.json) |

Code and tests are in `main`; trained artifacts are external. The Model 1 adapter
must be provisioned, and the original Model 2 index remains `restore_required`.
The backend provides opt-in bridges; its default registry still uses placeholders.

**SIH26167 · Indian Space Research Organisation (ISRO) · Space Technology**

> **SatQuery AI – An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries**

SatQuery AI is a natural-language interface for Earth Observation imagery. A user should be able to upload or select remote-sensing data, ask a plain-language question, and receive a **grounded, measurable, confidence-aware answer** without manually operating a full GIS workflow.

The project is deliberately more than a generic satellite-image chatbot. It combines a vision-language layer with specialist remote-sensing models and an evidence-fusion layer so that answers can be tied back to image regions, change masks, sensor quality, metadata, and specialist agreement.

## What the system must do

SatQuery AI is organized around five core capabilities:

1. **Single-image visual question answering (VQA)** – answer questions about one optical, multispectral, or SAR scene.
2. **Captioning and spatial grounding** – describe the scene and localize relevant objects/regions.
3. **Bi-temporal change understanding** – compare imagery from two dates, detect/describe/quantify changes, and support follow-up questions.
4. **Optical–SAR analysis** – use complementary information from optical and radar imagery, especially when clouds, illumination, or texture make one modality less reliable.
5. **Automatic specialist-model routing** – infer the task and send the request to the best model/tool pipeline instead of forcing one model to solve everything.

## Our differentiator: EvidenceFuse

Existing remote-sensing VLMs already cover important pieces of this problem. Our proposed differentiator is **EvidenceFuse**, an evidence-aware arbitration layer that asks not only *“What did a model answer?”* but also *“What evidence supports that answer, how trustworthy is the sensor/model in this case, and do the specialists agree?”*

EvidenceFuse combines:

- model confidence,
- pixel/region grounding evidence,
- optical/SAR sensor-quality estimates,
- agreement between specialist models,
- image-registration quality,
- out-of-distribution/domain-shift indicators,
- contradiction detection,
- calibrated abstention when evidence is weak.

This creates a practical hackathon advantage and a clear research extension: **EvidenceFuse-RS**, a reliability-focused optical–SAR arbitration and claim-verification framework.

## High-level architecture

```mermaid
flowchart TD
    U[User: image(s) + natural-language query] --> V[Input validator]
    V --> M[Metadata + geospatial preprocessing]
    M --> R[Task router / orchestrator]

    R --> A[Single-image VQA specialist]
    R --> B[Caption + grounding specialist]
    R --> C[Bi-temporal change specialist]
    R --> D[Optical-SAR specialist]
    R --> G[GIS tools / measurements]

    A --> E[Evidence records]
    B --> E
    C --> E
    D --> E
    G --> E

    M --> Q[Quality checks: clouds / SAR quality / CRS / registration / domain shift]
    Q --> F[EvidenceFuse]
    E --> F

    F --> X[Grounded answer + confidence + map overlays + measurements + limitations]
    X --> UI[Non-technical web UI]
```

## Example queries

- “What is visible in this image?”
- “Locate all large water bodies and show them on the map.”
- “What changed between these two dates?”
- “How much did the built-up area increase?”
- “Did the lake shrink? Give the approximate area difference.”
- “The optical image is cloudy. Use the SAR image to verify the flooded region.”
- “Highlight new construction and explain why you marked it.”

## Repository map

```text
SatQuery-AI/
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
├── configs/
│   ├── base.yaml
│   ├── datasets.yaml
│   └── models.yaml
├── data/
│   └── README.md
├── docs/
│   ├── PROBLEM_STATEMENT.md
│   ├── ARCHITECTURE.md
│   ├── ML_PLAN.md
│   ├── EVIDENCEFUSE.md
│   ├── DATASETS.md
│   ├── EVALUATION.md
│   ├── ROADMAP.md
│   ├── RESEARCH.md
│   ├── PRIOR_ART.md
│   ├── STUDY_GUIDE.md
│   ├── HARDWARE.md
│   ├── FRONTEND.md
│   ├── API.md
│   ├── DEMO_SCENARIOS.md
│   ├── REFERENCES.md
│   └── team/
│       ├── README.md
│       ├── TASK_BOARD.md
│       ├── WEEKLY_SYNC.md
│       ├── member-01-project-research.md
│       ├── member-02-data-gis.md
│       ├── member-03-vlm-grounding.md
│       ├── member-04-change-sar.md
│       ├── member-05-backend-integration.md
│       └── member-06-frontend-devops.md
├── frontend/
│   └── README.md
├── notebooks/
│   └── README.md
├── models/
│   └── README.md
├── scripts/
│   ├── prepare_data.py
│   ├── train_vqa.py
│   ├── train_change.py
│   └── evaluate.py
├── src/satquery/
│   ├── api/main.py
│   ├── config.py
│   ├── evidence_fuse.py
│   ├── orchestrator.py
│   ├── routing.py
│   ├── types.py
│   ├── models/
│   └── preprocessing/
├── tests/
│   ├── test_evidence_fuse.py
│   └── test_router.py
└── .github/
    ├── workflows/ci.yml
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

## Quick start

### 1. Create an environment

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Copy configuration

```bash
cp .env.example .env
```

### 3. Run the API scaffold

```bash
uvicorn satquery.api.main:app --reload --app-dir src
```

Then open `http://127.0.0.1:8000/docs`.

### 4. Run tests

```bash
pytest -q
```

## MVP strategy

Do **not** start by training a giant multimodal model from scratch. Build a modular prototype:

1. validate GeoTIFF/imagery and metadata;
2. make the router work;
3. connect one usable single-image VQA/caption model;
4. add a change-detection specialist;
5. add optical–SAR support;
6. generate masks, boxes, areas and evidence objects;
7. fuse evidence with EvidenceFuse;
8. expose everything through the web UI;
9. only then fine-tune the weakest components using LoRA/QLoRA or specialist training.

This approach is feasible on ordinary development laptops because heavy training can be moved to a GPU notebook/cloud machine while preprocessing, API work, routing, evaluation logic and small experiments stay local.

## Success criteria

A strong demo should prove all of the following:

- The user can ask a plain-language remote-sensing question.
- The system understands which task is being requested.
- The answer is spatially grounded where applicable.
- Numeric claims come from explicit measurements/tools, not free-form guessing.
- Multi-date queries expose change masks/regions.
- Optical and SAR evidence can be compared.
- The system indicates confidence and can abstain.
- A non-GIS user can understand the result.

## Research direction

The project can extend into a paper around **EvidenceFuse-RS: Sensor-Quality-Aware Evidence Arbitration for Reliable Multimodal Remote-Sensing Vision-Language Systems**.

Core research questions:

- Does sensor-quality-aware arbitration improve reliability over fixed optical–SAR fusion?
- Can grounded claim verification reduce hallucinated geospatial statements?
- Does contradiction-aware specialist routing improve calibration?
- How robust is the system under clouds, SAR noise, misregistration and domain shift?

See [`docs/RESEARCH.md`](docs/RESEARCH.md) for the experiment design.

## Team ownership

Work is divided into six practical ownership tracks under [`docs/team/`](docs/team/README.md). Each member file contains responsibilities, concrete deliverables, acceptance criteria, dependencies, a weekly checklist and a work log. Replace the placeholders with the final names after the team confirms ownership.

## Status

This repository currently contains the **project blueprint, ML architecture, research plan, data plan, API scaffold, routing/evidence-fusion starter code, evaluation plan and team workflow**. Model checkpoints and raw datasets are intentionally not committed.
