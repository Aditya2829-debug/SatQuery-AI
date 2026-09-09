from datasets import load_dataset
from pathlib import Path
import json


NUM_QUESTIONS = 100

OUTPUT_DIR = Path("data/benchmark")
OUTPUT_FILE = OUTPUT_DIR / "vrsbench_100.jsonl"


def normalize_answer(answer):
    return str(answer).lower().strip().rstrip(".!?")


def main():

    print("Loading VRSBench...")

    dataset = load_dataset(
        "xiang709/VRSBench",
        streaming=True
    )

    split = list(dataset.keys())[0]

    print("Using split:", split)

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    count = 0

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        for sample in dataset[split]:

            image = sample["image"]

            qa_pairs = sample["qa_pairs"]

            for qa in qa_pairs:

                record = {
                    "id": count,
                    "image": image,
                    "question_id": qa.get("ques_id"),
                    "question": qa["question"],
                    "answer": normalize_answer(
                        qa["answer"]
                    ),
                    "question_type": qa.get("type"),
                    "source": "vrsbench"
                }

                file.write(
                    json.dumps(
                        record,
                        ensure_ascii=False
                    )
                    + "\n"
                )

                count += 1

                if count % 10 == 0:
                    print(
                        f"Collected "
                        f"{count}/{NUM_QUESTIONS}"
                    )

                if count >= NUM_QUESTIONS:
                    break

            if count >= NUM_QUESTIONS:
                break

    print("\nFinished!")
    print("Questions:", count)
    print("Saved to:", OUTPUT_FILE)


if __name__ == "__main__":
    main()