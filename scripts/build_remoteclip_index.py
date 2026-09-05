"""Build a NEW index from ordered JSONL rows containing image_path and label."""

import argparse
import json
from pathlib import Path


def build_index(model, rows, image_root):
    import torch

    if not rows:
        raise ValueError("Image manifest is empty.")
    classes = sorted({row["label"] for row in rows})
    paths, labels, embeddings = [], [], []
    for row in rows:
        path = (Path(image_root) / row["image_path"]).resolve()
        if not path.is_file():
            raise FileNotFoundError(path)
        embeddings.append(model.encode_image(path).detach().cpu())
        paths.append(row["image_path"])
        labels.append(classes.index(row["label"]))
    return {
        "embeddings": torch.cat(embeddings),
        "labels": torch.tensor(labels),
        "classes": classes,
        "image_paths": paths,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--image-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--checkpoint")
    parser.add_argument("--device")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output already exists; choose a new path to preserve the existing index.")
    import torch

    from satquery.models.remoteclip import RemoteCLIPModel, RemoteCLIPRetriever

    rows = [json.loads(line) for line in args.manifest.read_text().splitlines() if line.strip()]
    model = RemoteCLIPModel(checkpoint_path=args.checkpoint, device=args.device)
    data = build_index(model, rows, args.image_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("xb") as handle:
        torch.save(data, handle)
    RemoteCLIPRetriever(model, args.output)  # Validate the saved schema.
    print(f"Saved new index: {args.output} ({len(rows)} images); historical metrics do not apply.")


if __name__ == "__main__":
    main()
