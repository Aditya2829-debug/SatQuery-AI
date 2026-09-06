from datasets import load_dataset
from itertools import islice
from collections import Counter


NUM_SAMPLES = 100


def main():
    print("Loading VRSBench...")

    dataset = load_dataset(
        "xiang709/VRSBench",
        streaming=True
    )

    split = list(dataset.keys())[0]

    print("Using split:", split)

    field_counts = Counter()

    sample_count = 0

    for sample in islice(dataset[split], NUM_SAMPLES):
        sample_count += 1

        for key in sample.keys():
            field_counts[key] += 1

    print("\nSamples analyzed:", sample_count)

    print("\nFIELD FREQUENCY")

    for key, count in field_counts.items():
        print(f"{key}: {count}")


if __name__ == "__main__":
    main()