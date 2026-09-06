"""Trained Model 4: lightweight Optical + SAR fusion reconstruction."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn

from .artifacts import artifact_path


class _DoubleConv(nn.Module):
    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class FusionUNet(nn.Module):
    """Exact architecture used by the trained Model 4 checkpoint."""

    def __init__(self) -> None:
        super().__init__()
        self.enc1 = _DoubleConv(6, 32)
        self.enc2 = _DoubleConv(32, 64)
        self.enc3 = _DoubleConv(64, 128)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = _DoubleConv(128, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.dec3 = _DoubleConv(256, 128)
        self.up2 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.dec2 = _DoubleConv(128, 64)
        self.up1 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.dec1 = _DoubleConv(64, 32)
        self.out = nn.Conv2d(32, 4, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        b = self.bottleneck(self.pool(e3))
        d3 = self.dec3(torch.cat([self.up3(b), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return torch.sigmoid(self.out(d1))


class OpticalSARSpecialist:
    """Inference wrapper for the trained Model 4 checkpoint.

    The model expects a preprocessed tensor in training space with shape
    ``[6, 128, 128]`` or ``[N, 6, 128, 128]``. Channel order is
    ``B4, B3, B2, B8, VV, VH`` and output order is ``B4, B3, B2, B8``.

    Raw GeoTIFF/SAR decoding and the exact training-time input normalization
    remain an integration boundary and must be performed before ``predict``.
    """

    def __init__(
        self,
        checkpoint_path: str | Path | None = None,
        device: str | None = None,
    ) -> None:
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        checkpoint_path = artifact_path(
            checkpoint_path, "SATQUERY_MODEL4_CHECKPOINT"
        )
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        self.model = FusionUNet().to(self.device)
        self.model.load_state_dict(
            checkpoint.get("model_state_dict", checkpoint)
        )
        self.model.eval()
        self.image_size = int(checkpoint.get("image_size", 128))
        self.input_bands = checkpoint.get(
            "input_bands", ["B4", "B3", "B2", "B8", "VV", "VH"]
        )
        self.output_bands = checkpoint.get(
            "output_bands", ["B4", "B3", "B2", "B8"]
        )
        self.epoch = checkpoint.get("epoch")
        self.val_loss = checkpoint.get("val_loss")

    @torch.inference_mode()
    def predict(self, fusion_tensor: Any) -> torch.Tensor:
        """Run fusion inference and return normalized reconstructed optical bands."""
        if isinstance(fusion_tensor, np.ndarray):
            fusion_tensor = torch.from_numpy(fusion_tensor)
        if not isinstance(fusion_tensor, torch.Tensor):
            raise TypeError("fusion_tensor must be a torch.Tensor or numpy.ndarray")

        x = fusion_tensor.float()
        if x.ndim == 3:
            x = x.unsqueeze(0)
        if x.ndim != 4 or x.shape[1:] != (6, self.image_size, self.image_size):
            raise ValueError(
                f"Expected [6,{self.image_size},{self.image_size}] or "
                f"[N,6,{self.image_size},{self.image_size}], got {tuple(x.shape)}"
            )

        return self.model(x.to(self.device)).cpu()

    def analyze(self, optical: Any, sar: Any, query: str = "") -> dict[str, Any]:
        """Compatibility entry point; optical/sar must already be fused/preprocessed."""
        del optical, sar, query
        raise NotImplementedError(
            "Build the 6-channel training-space tensor first, then call predict()."
        )


__all__ = ["FusionUNet", "OpticalSARSpecialist"]
