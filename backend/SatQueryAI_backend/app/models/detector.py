import numpy as np
import torch
import torchvision.transforms.functional as TF

from .artifacts import artifact_path
from .images import rgb_image
from .model import build_change_model
from .postprocess import extract_change_regions


class ChangeDetector:
    def __init__(self, checkpoint_path=None, threshold=None, device=None, image_size=None):
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        checkpoint_path = artifact_path(checkpoint_path, "SATQUERY_MODEL3_CHECKPOINT")
        checkpoint = torch.load(checkpoint_path, map_location=self.device)

        self.image_size = int(checkpoint.get("image_size", 256) if image_size is None else image_size)
        self.threshold = float(checkpoint.get("threshold", 0.80) if threshold is None else threshold)

        self.model = build_change_model(
            encoder_name=checkpoint.get("encoder_name", "resnet34")
        ).to(self.device)
        self.model.load_state_dict(checkpoint.get("model_state_dict", checkpoint))
        self.model.eval()

        self.mean = torch.tensor([0.485, 0.456, 0.406], device=self.device).view(1, 3, 1, 1)
        self.std = torch.tensor([0.229, 0.224, 0.225], device=self.device).view(1, 3, 1, 1)

    @torch.inference_mode()
    def detect(self, before, after):
        before = rgb_image(before)
        after = rgb_image(after)

        if before.size != after.size:
            raise ValueError(f"Before/after image sizes differ: {before.size} vs {after.size}")

        source_width, source_height = before.size

        b_tensor = TF.to_tensor(TF.resize(before, [self.image_size, self.image_size])).unsqueeze(0).to(self.device)
        a_tensor = TF.to_tensor(TF.resize(after, [self.image_size, self.image_size])).unsqueeze(0).to(self.device)

        x = torch.cat([(b_tensor - self.mean) / self.std, (a_tensor - self.mean) / self.std], dim=1)
        logits = self.model(x)
        prob = torch.sigmoid(logits)[0, 0]

        mask = (prob >= self.threshold).cpu().numpy().astype(np.uint8)
        regions = extract_change_regions(mask, min_area=20)
        change_percent = float(mask.mean() * 100.0)

        return {
            "changed": bool(change_percent > 0.1),
            "change_percent": change_percent,
            "threshold": self.threshold,
            "num_regions": len(regions),
            "regions": regions,
            "mask": mask,
            "source_size": {"width": source_width, "height": source_height},
            "mask_size": {"width": self.image_size, "height": self.image_size},
        }
