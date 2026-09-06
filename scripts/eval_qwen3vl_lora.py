
import json
from pathlib import Path
from collections import defaultdict

import torch
from transformers import AutoProcessor, AutoModelForImageTextToText
from peft import PeftModel
from qwen_vl_utils import process_vision_info

MODEL_ID = "Qwen/Qwen3-VL-2B-Instruct"

REPO = Path(__file__).resolve().parents[1]

BENCHMARK_FILE = (
    REPO
    / "data"
    / "benchmark"
    / "vrsbench_100.jsonl"
)

IMAGE_DIR = (
    REPO
    / "data"
    / "benchmark"
    / "images"
)

ADAPTER_DIR = (
    REPO
    / "models"
    / "qwen3vl_vrsbench_lora"
)

OUTPUT_FILE = (
    REPO
    / "outputs"
    / "qwen3vl_lora_vrsbench100.jsonl"
)

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)


def clean_prediction(text):
    text = str(text).lower().strip()

    for prefix in [
        "the answer is",
        "answer:"
    ]:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()

    return text.strip(" .,!?:;\"'")


with open(
    BENCHMARK_FILE,
    "r",
    encoding="utf-8"
) as f:
    benchmark = [
        json.loads(line)
        for line in f
        if line.strip()
    ]


print(
    "Benchmark samples:",
    len(benchmark)
)


processor = AutoProcessor.from_pretrained(
    MODEL_ID
)

print("Loading base model...")

base_model = AutoModelForImageTextToText.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    device_map="auto"
)

print("Loading LoRA adapter...")

model = PeftModel.from_pretrained(
    base_model,
    ADAPTER_DIR
)

model.eval()


def ask_model(sample):
    image_path = IMAGE_DIR / sample["image"]

    messages = [{
        "role": "user",
        "content": [
            {
                "type": "image",
                "image": str(image_path)
            },
            {
                "type": "text",
                "text": (
                    "Answer the question about this satellite image. "
                    "Return only the shortest possible answer. "
                    "Do not explain.\n\n"
                    f"Question: {sample['question']}"
                )
            }
        ]
    }]

    text = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    image_inputs, video_inputs = process_vision_info(
        messages
    )

    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt"
    ).to(model.device)

    with torch.inference_mode():
        generated = model.generate(
            **inputs,
            max_new_tokens=24,
            do_sample=False
        )

    trimmed = [
        output[len(input_ids):]
        for input_ids, output in zip(
            inputs.input_ids,
            generated
        )
    ]

    prediction = processor.batch_decode(
        trimmed,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False
    )[0]

    return clean_prediction(prediction)


results = []

for i, sample in enumerate(
    benchmark,
    start=1
):

    pred = ask_model(sample)

    gt = clean_prediction(
        sample["answer"]
    )

    correct = int(
        pred == gt
    )

    row = {
        **sample,
        "prediction": pred,
        "correct": correct
    }

    results.append(row)

    print(
        f"[{i:03d}/100] "
        f"{sample.get('question_type')} | "
        f"GT={sample['answer']!r} | "
        f"PRED={pred!r}"
    )


with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    for row in results:
        f.write(
            json.dumps(
                row,
                ensure_ascii=False
            )
            + "\n"
        )


correct = sum(
    row["correct"]
    for row in results
)

accuracy = correct / len(results)


print("\n" + "=" * 65)
print("LORA VRSBENCH-100 RESULTS")
print("=" * 65)

print(
    "Correct:",
    correct
)

print(
    "Total:",
    len(results)
)

print(
    "Accuracy:",
    f"{accuracy * 100:.2f}%"
)

print(
    "Baseline_002:",
    "51.00%"
)

print(
    "Change:",
    f"{(accuracy - 0.51) * 100:+.2f} percentage points"
)


stats = defaultdict(
    lambda: {
        "correct": 0,
        "total": 0
    }
)

for row in results:

    category = (
        row.get("question_type")
        or "unknown"
    )

    stats[category]["correct"] += (
        row["correct"]
    )

    stats[category]["total"] += 1


print("\nCATEGORY RESULTS")
print("-" * 65)

for category, values in sorted(
    stats.items()
):

    acc = (
        values["correct"]
        / values["total"]
    )

    print(
        f"{category:<28} "
        f"{values['correct']:>3}/"
        f"{values['total']:<3} "
        f"{acc * 100:>7.2f}%"
    )


print(
    "\nSaved:",
    OUTPUT_FILE
)
