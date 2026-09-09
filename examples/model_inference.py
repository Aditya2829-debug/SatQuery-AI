"""Run from the repo root after pip install -e .; see docs/MODEL_INTEGRATION.md."""

import argparse
import json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("task", choices=["vqa", "classify", "retrieve", "change"])
    parser.add_argument("--image")
    parser.add_argument("--before")
    parser.add_argument("--after")
    parser.add_argument("--query")
    parser.add_argument("--classes", nargs="+")
    parser.add_argument("--adapter")
    parser.add_argument("--checkpoint")
    parser.add_argument("--index")
    parser.add_argument("--device")
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()

    if args.task in ("vqa", "classify") and not args.image:
        parser.error("--image is required for vqa/classify")
    if args.task in ("vqa", "retrieve") and not args.query:
        parser.error("--query is required for vqa/retrieve")
    if args.task == "classify" and not args.classes:
        parser.error("--classes is required for classify")
    if args.task == "change" and (not args.before or not args.after):
        parser.error("--before and --after are required for change")

    if args.task == "vqa":
        from satquery.models.qwen_vqa import QwenVQA

        result = QwenVQA(args.adapter, device=args.device).predict(args.image, args.query)
    elif args.task == "change":
        from satquery.models.change_detection import ChangeDetector

        result = ChangeDetector(args.checkpoint, device=args.device).detect(args.before, args.after)
        result = {key: value for key, value in result.items() if key != "mask"}
    else:
        from satquery.models.artifacts import artifact_path
        from satquery.models.remoteclip import (
            RemoteCLIPModel,
            RemoteCLIPRetriever,
            RemoteCLIPZeroShotClassifier,
        )

        index = (
            artifact_path(args.index, "SATQUERY_MODEL2_INDEX") if args.task == "retrieve" else None
        )
        model = RemoteCLIPModel(checkpoint_path=args.checkpoint, device=args.device)
        if args.task == "classify":
            result = RemoteCLIPZeroShotClassifier(model).predict(args.image, args.classes)
            result["scores"] = result["scores"].tolist()
        else:
            result = RemoteCLIPRetriever(model, index).search(args.query, args.top_k)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
