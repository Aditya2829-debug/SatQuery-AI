from datasets import load_dataset


def summarize(value):
    if hasattr(value, "size") and hasattr(value, "mode"):
        return f"IMAGE size={value.size}, mode={value.mode}"

    if isinstance(value, str):
        return value[:400]

    if isinstance(value, list):
        return f"LIST length={len(value)} -> {value[:3]}"

    if isinstance(value, dict):
        return f"DICT keys={list(value.keys())}"

    return str(value)[:400]


def main():
    print("Loading VRSBench...")

    dataset = load_dataset(
        "xiang709/VRSBench",
        streaming=True
    )

    print("\nDataset loaded!")

    print("\nAvailable splits:")
    print(list(dataset.keys()))

    split = list(dataset.keys())[0]

    print("\nUsing split:", split)

    sample = next(iter(dataset[split]))

    print("\n" + "=" * 60)
    print("SAMPLE KEYS")
    print("=" * 60)

    for key in sample:
        print(key)

    print("\n" + "=" * 60)
    print("SAMPLE CONTENT")
    print("=" * 60)

    for key, value in sample.items():
        print(f"\nFIELD: {key}")
        print("TYPE:", type(value).__name__)
        print("VALUE:", summarize(value))


if __name__ == "__main__":
    main()