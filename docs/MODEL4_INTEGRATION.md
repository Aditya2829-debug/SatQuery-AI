# Model 4 Integration Handoff

## Current status

Model 4 is trained and its backend bridge is present on `model4-integration-final`.

Training/evaluation record:

- Dataset: SEN12MS-CR prototype subset, 500 samples
- Split: 425 train / 75 validation, seed 42
- Architecture: lightweight FusionUNet, ~1.93M parameters
- Input channels: `B4, B3, B2, B8, VV, VH`
- Output channels: `B4, B3, B2, B8`
- Spatial size: `128 x 128`
- Best epoch: 8
- Best validation L1: 0.077188
- Validation MAE: 0.077192
- Validation MSE: 0.009369
- Validation PSNR: 20.28 dB
- Cloudy optical baseline PSNR: -1.01 dB
- Reported improvement: +21.29 dB

## Artifact provisioning

Keep the checkpoint outside GitHub. On the integration machine set:

```bash
SATQUERY_MODEL4_CHECKPOINT=/absolute/path/to/model4_fusion_best.pt
```

The repository already ignores `*.pt`/`*.pth`/`*.ckpt` model files.

## Backend bridge

`src/satquery/models/optical_sar.py` contains the exact trained architecture and loader.

`backend/SatQueryAI_backend/app/models/trained.py` exposes `OpticalSARFusionModel`.

The bridge expects:

```python
{"fusion_tensor": tensor}
```

where `tensor` is `[6,128,128]` or `[N,6,128,128]` in the exact training-space representation.

## Important: preprocessing is part of the model

Do not pass ordinary RGB JPEG/PNG bytes directly to Model 4.

The production preprocessing layer must:

1. Obtain a paired Sentinel-2 optical scene and Sentinel-1 SAR scene.
2. Select optical bands `B4, B3, B2, B8` and SAR bands `VV, VH`.
3. Co-register the modalities.
4. Resize/crop to `128 x 128`.
5. Reproduce the training notebook's preprocessing/normalization exactly.
6. Arrange channels as `B4,B3,B2,B8,VV,VH`.
7. Call `OpticalSARFusionModel.process({"fusion_tensor": x})`.

The existing `OpticalSARFusionAdapter` already identifies one optical and one SAR image from metadata, but currently returns their image bytes. It therefore needs a preprocessing step before invoking the trained model.

## Expected response

The bridge returns the four reconstructed optical bands as a JSON-compatible tensor plus band names and output shape. For the UI, the tensor should normally be converted into a preview RGB image using `B4,B3,B2` and optionally exposed as a downloadable/visual result.

## Recommended integration order

1. Load the checkpoint once during FastAPI startup.
2. Instantiate `OpticalSARFusionModel(predictor)` once.
3. Register it under `optical_sar_fusion`.
4. Keep the existing placeholder adapter as fallback only until real registration is complete.
5. Add a small preprocessing function for paired raster inputs.
6. Add one direct API test with a known six-channel tensor.
7. Add one end-to-end test using paired optical/SAR fixtures if available.

## Do not commit

Do not commit:

- `model4_fusion_best.pt`
- `X.pt`, `Y.pt`, `Y01.pt`
- raw SEN12MS/SEN12MS-CR data
- secrets or local `.env` files

The notebook and evaluation outputs can remain in the user's Drive for reproducibility.
