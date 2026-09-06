import json
from pathlib import Path
from collections import Counter


FILE = Path(
    "data/benchmark/vrsbench_100.jsonl"
)


def main():

    samples = []

    with open(
        FILE,
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:
            samples.append(
                json.loads(line)
            )

    answers = Counter(
        sample["answer"]
        for sample in samples
    )

    majority_answer, frequency = (
        answers.most_common(1)[0]
    )

    correct = sum(
        sample["answer"]
        == majority_answer
        for sample in samples
    )

    accuracy = (
        correct / len(samples)
    )

    print(
        "Majority answer:",
        majority_answer
    )

    print(
        "Occurrences:",
        frequency
    )

    print(
        "Accuracy:",
        round(
            accuracy * 100,
            2
        ),
        "%"
    )


if __name__ == "__main__":
    main()