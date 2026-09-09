from datasets import load_dataset


def main():
    print("Loading VRSBench...")

    dataset = load_dataset(
        "xiang709/VRSBench",
        streaming=True
    )

    print("\nDataset loaded successfully!")
    print(dataset)

    print("\nAvailable splits:")

    for split in dataset.keys():
        print("-", split)


if __name__ == "__main__":
    main()