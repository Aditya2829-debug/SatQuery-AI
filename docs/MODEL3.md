# Model 3 - Satellite Change Detection

## Overview

Model 3 performs bi-temporal satellite image change detection.

- Model: CD003
- Architecture: 6-channel U-Net with ResNet34 encoder
- Dataset: LEVIR-CD+
- Input: aligned RGB images from T1 and T2
- Resolution: 256 x 256
- Best threshold: 0.75

## Performance

| Metric | Value |
|---|---:|
| Validation F1 | 0.7380 |
| Validation IoU | 0.5848 |
| Test Precision | 0.4922 |
| Test Recall | 0.7743 |
| Test F1 | 0.6018 |
| Test IoU | 0.4304 |
| Test Loss | 0.5444 |

## Python API

```python
from satquery.models.change_detection import ChangeDetector

detector = ChangeDetector(
    checkpoint_path="/path/to/cd003_fixedmask_best.pt"
)

result = detector.detect(
    before_image,
    after_image
)
```

## Output

The result contains:

- `changed`
- `change_percent`
- `threshold`
- `num_regions`
- `regions`
- `mask`
- `source_size`
- `mask_size`

## Checkpoint

Large model weights are intentionally not committed to GitHub.

Expected checkpoint:

```text
cd003_fixedmask_best.pt
```

Recommended environment variable:

```bash
SATQUERY_MODEL3_CHECKPOINT=/path/to/cd003_fixedmask_best.pt
```

## Backend Integration

See:

```text
examples/model3_change_detection.py
```

## Routing

Use Model 3 for:

- before/after satellite comparison
- construction detection
- demolition
- urban expansion
- infrastructure change
- land-use change
- disaster-related visible change

## Artifacts

Compact metrics:

```text
outputs/model3/model3_metrics.json
```

The trained checkpoint is stored externally and should be provisioned by the deployment environment.
