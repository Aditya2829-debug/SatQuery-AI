import json
from pathlib import Path


FILE = Path("data/benchmark/vrsbench_100.jsonl")
OUTPUT = Path("data/benchmark/unique_images.txt")


def main():
    images = set()

    with open(FILE, "r", encoding="utf-8") as file:
        for line in file:
            sample = json.loads(line)
            images.add(sample["image"])

    images = sorted(images)

    print("Questions: 100")
    print("Unique images:", len(images))

    with open(OUTPUT, "w", encoding="utf-8") as file:
        for image in images:
            file.write(image + "\n")

    print("\nSaved image list to:", OUTPUT)

    print("\nImages:")
    for image in images:
        print(image)


if __name__ == "__main__":
    main()