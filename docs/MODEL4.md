# Model 4 — Optical + SAR Fusion

## Status

Trained and evaluated for the SIH prototype.

- Architecture: lightweight U-Net
- Parameters: ~1.93M
- Input: 6 channels — `B4, B3, B2, B8, VV, VH`
- Output: 4 channels — `B4, B3, B2, B8`
- Input/output spatial size: `128 x 128`
- Dataset: SEN12MS-CR (`Hermanni/sen12mscr`), 500-sample prototype subset
- Split: 425 train / 75 validation, seed 42
- Best epoch: 8
- Best validation L1: `0.077188`
- Validation MAE: `0.077192`
- Validation MSE: `0.009369`
- Validation PSNR: `20.28 dB`
- Cloudy optical baseline PSNR: `-1.01 dB`
- Reported PSNR improvement: `+21.29 dB`

## Artifact

The trained checkpoint is an external deployment artifact and is intentionally not committed to Git.

Set:

```bash
SATQUERY_MODEL4_CHECKPOINT=/absolute/path/to/model4_fusion_best.pt
```

The existing repository `.gitignore` excludes `*.pt` files.

## Inference contract

`src/satquery/models/optical_sar.py` contains the exact trained architecture and a backend-friendly loader.

The model expects a tensor in **training space**:

```text
[6, 128, 128]
```

or batched:

```text
[N, 6, 128, 128]
```

Channel order:

```text
0 B4
1 B3
2 B2
3 B8
4 VV
5 VH
```

Output order:

```text
0 B4
1 B3
2 B2
3 B8
```

The wrapper returns normalized `[0,1]` reconstructed optical bands.

## Important integration boundary

The training artifact is **not** a generic RGB-image model. Production inference must supply the same six-channel tensor representation used during training. A normal RGB upload cannot be passed directly to the checkpoint.

The backend already has an Optical/SAR specialist adapter that identifies one optical and one SAR image from metadata. That adapter currently passes image bytes to the specialist layer. Integration work must therefore add the modality-specific raster decoding, band selection, co-registration/resizing and training-space normalization before calling `OpticalSARSpecialist.predict()`.

Do not invent normalization constants. Preserve the preprocessing used by the training notebook and record any constants required for production preprocessing alongside the deployment configuration.

## Recommended demo flow

```text
Sentinel-2 optical scene + Sentinel-1 SAR scene
                    |
          validate metadata / pairing
                    |
          select B4 B3 B2 B8 + VV VH
                    |
          co-register + resize to 128x128
                    |
          reproduce training preprocessing
                    |
             Model 4 FusionUNet
                    |
        reconstructed B4 B3 B2 B8
                    |
             RGB / downstream AI
```

## Reproducibility

The 500-sample tensors used for the prototype are stored outside GitHub under the operator's Model 4 artifact directory. They are not required for runtime inference; only the checkpoint and the exact preprocessing contract are required.

## Limitations

- Prototype trained on only 500 samples.
- Validation is on a fixed 75-sample split.
- The reported metrics are reconstruction metrics, not a land-cover classification accuracy.
- Inputs must be paired and spatially compatible.
- The checkpoint should be treated as a SIH prototype model, not a production remote-sensing restoration benchmark.
