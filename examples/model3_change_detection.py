import os

from satquery.models.change_detection import ChangeDetector

checkpoint = os.environ["SATQUERY_MODEL3_CHECKPOINT"]

detector = ChangeDetector(checkpoint_path=checkpoint)
result = detector.detect("before.png", "after.png")

backend_result = {
    "changed": result["changed"],
    "change_percent": result["change_percent"],
    "threshold": result["threshold"],
    "num_regions": result["num_regions"],
    "regions": result["regions"],
    "source_size": result["source_size"],
    "mask_size": result["mask_size"],
}

print(backend_result)
