import json
from collections import Counter
from pathlib import Path


FILE = Path(
    "data/benchmark/vrsbench_100.jsonl"
)


def main():

    types = Counter()
    answers = Counter()

    with open(
        FILE,
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:

            sample = json.loads(line)

            types[
                sample["question_type"]
            ] += 1

            answers[
                sample["answer"]
            ] += 1

    print("=" * 50)
    print("QUESTION TYPES")
    print("=" * 50)

    for name, count in types.most_common():
        print(f"{name:<25} {count}")

    print("\n" + "=" * 50)
    print("MOST COMMON ANSWERS")
    print("=" * 50)

    for answer, count in answers.most_common(20):
        print(f"{answer:<30} {count}")


if __name__ == "__main__":
    main()