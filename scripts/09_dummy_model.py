import json
from pathlib import Path

from satquery.evaluation.metrics import accuracy
from satquery.evaluation.category_metrics import category_accuracy


BENCHMARK = Path(
    "data/benchmark/vrsbench_100.jsonl"
)


def main():

    samples = []

    with open(
        BENCHMARK,
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:
            samples.append(
                json.loads(line)
            )

    predictions = [
        "yes"
        for _ in samples
    ]

    ground_truths = [
        sample["answer"]
        for sample in samples
    ]

    score = accuracy(
        predictions,
        ground_truths
    )

    print(
        "Overall accuracy:",
        round(score * 100, 2),
        "%"
    )

    print("\nCATEGORY ACCURACY")

    results = category_accuracy(
        samples,
        predictions
    )

    for category, category_score in results.items():

        print(
            f"{category:<25}",
            f"{category_score * 100:.2f}%"
        )


if __name__ == "__main__":
    main()