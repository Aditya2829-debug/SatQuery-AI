# Model 1 — Remote-Sensing VQA

Reusable loader: `satquery.models.qwen_vqa.QwenVQA`.
See [backend setup and examples](MODEL_INTEGRATION.md) for external adapter paths,
the existing backend bridge, and inference commands. The adapter must be obtained
from the training owner; its current external location/access is not verified.

## Base Model
Qwen3-VL-2B-Instruct

## Adaptation
QLoRA

## Training
- Dataset: VRSBench
- Training samples: 5,000
- Trainable parameters: 6,422,528
- Total parameters: 2,133,954,560
- Trainable percentage: 0.301%
- Training runtime: 3418 seconds
- Final training loss: 0.667

## Evaluation
Reported benchmark: VRSBench-100. These are historical results, not a new
evaluation of the integration loader. The recorded predictions are available in
[`outputs/qwen3vl_lora_vrsbench100.jsonl`](../outputs/qwen3vl_lora_vrsbench100.jsonl).

### Results
- Zero-shot baseline: 51.00%
- QLoRA accuracy: 68.00%
- Improvement: +17.00 percentage points

## Category Accuracy
- Image: 100.00%
- Object category: 77.78%
- Object color: 55.56%
- Object direction: 100.00%
- Object existence: 85.19%
- Object position: 41.67%
- Object quantity: 61.54%
- Object shape: 62.50%
- Object size: 0.00%
- Reasoning: 50.00%
- Rural or urban: 100.00%
- Scene type: 64.29%

## Notes
The QLoRA-adapted model showed a significant improvement over the zero-shot baseline.
Large model weights and adapter binaries are stored externally and are not committed to GitHub.

The historical scripts `train_qwen3vl_qlora.py` and `eval_qwen3vl_lora.py`
preserve their original Colab/repository paths. They are training/evaluation
entry points, not modules to import into a server. Training additionally needs
`datasets` and `bitsandbytes` on a supported NVIDIA runtime. For backend inference,
use the reusable loader and its explicit external paths instead.
