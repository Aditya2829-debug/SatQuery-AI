
import json
from pathlib import Path
from PIL import Image

import torch
from datasets import Dataset
from transformers import (
    AutoProcessor,
    AutoModelForImageTextToText,
    BitsAndBytesConfig,
    TrainingArguments,
    Trainer
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training
)
from qwen_vl_utils import process_vision_info

MODEL_ID = "Qwen/Qwen3-VL-2B-Instruct"

REPO = Path("/content/SatQuery-AI")

TRAIN_FILE = (
    REPO
    / "data"
    / "training"
    / "vrsbench_vqa_train_5000.jsonl"
)

IMAGE_DIR = (
    REPO
    / "data"
    / "training"
    / "images"
)

OUTPUT_DIR = (
    REPO
    / "models"
    / "qwen3vl_smoke_test"
)

SMOKE_SAMPLES = 50


# --------------------------------------------------
# CUDA check
# --------------------------------------------------

if not torch.cuda.is_available():
    raise RuntimeError(
        "CUDA GPU not available. "
        "Do not run QLoRA on CPU."
    )

print("GPU:", torch.cuda.get_device_name(0))

vram = (
    torch.cuda.get_device_properties(0).total_memory
    / 1024**3
)

print(
    "VRAM:",
    round(vram, 2),
    "GB"
)


# --------------------------------------------------
# Load 50 examples
# --------------------------------------------------

rows = []

with open(
    TRAIN_FILE,
    "r",
    encoding="utf-8"
) as f:

    for line in f:

        if not line.strip():
            continue

        rows.append(
            json.loads(line)
        )

        if len(rows) >= SMOKE_SAMPLES:
            break

print(
    "Smoke-test samples:",
    len(rows)
)


# --------------------------------------------------
# Verify images
# --------------------------------------------------

missing = sorted({
    row["image"]
    for row in rows
    if not (
        IMAGE_DIR / row["image"]
    ).exists()
})

if missing:
    raise FileNotFoundError(
        f"{len(missing)} smoke-test images missing. "
        f"First examples: {missing[:10]}"
    )

print("✓ Smoke-test images found")

dataset = Dataset.from_list(
    rows
)


# --------------------------------------------------
# Quantization
# --------------------------------------------------

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)


# --------------------------------------------------
# Processor + model
# --------------------------------------------------

print("\nLoading processor...")

processor = AutoProcessor.from_pretrained(
    MODEL_ID
)

print("Loading Qwen3-VL 2B...")

model = AutoModelForImageTextToText.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    torch_dtype=torch.float16
)

model = prepare_model_for_kbit_training(
    model
)


# --------------------------------------------------
# LoRA
# --------------------------------------------------

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj"
    ],
    task_type="CAUSAL_LM"
)

model = get_peft_model(
    model,
    lora_config
)

model.print_trainable_parameters()


# --------------------------------------------------
# Collator
# --------------------------------------------------

def collate_fn(batch):

    texts = []
    images = []

    for sample in batch:

        image_path = (
            IMAGE_DIR
            / sample["image"]
        )

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": str(image_path)
                    },
                    {
                        "type": "text",
                        "text": sample["question"]
                    }
                ]
            },
            {
                "role": "assistant",
                "content": [
                    {
                        "type": "text",
                        "text": sample["answer"]
                    }
                ]
            }
        ]

        text = processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False
        )

        image_inputs, _ = (
            process_vision_info(messages)
        )

        texts.append(text)

        images.append(
            image_inputs[0]
        )

    inputs = processor(
        text=texts,
        images=images,
        padding=True,
        return_tensors="pt"
    )

    labels = inputs[
        "input_ids"
    ].clone()

    labels[
        inputs["attention_mask"] == 0
    ] = -100

    inputs["labels"] = labels

    return inputs


# --------------------------------------------------
# Smoke-test training
# --------------------------------------------------

args = TrainingArguments(
    output_dir=str(
        OUTPUT_DIR
    ),
    per_device_train_batch_size=1,
    gradient_accumulation_steps=2,
    max_steps=5,
    learning_rate=2e-4,
    logging_steps=1,
    save_strategy="no",
    fp16=True,
    gradient_checkpointing=True,
    remove_unused_columns=False,
    report_to="none",
    dataloader_num_workers=0,
    optim="paged_adamw_8bit"
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=dataset,
    data_collator=collate_fn
)

print("\n" + "=" * 65)
print("STARTING 5-STEP SMOKE TEST")
print("=" * 65)

trainer.train()

print("\n" + "=" * 65)
print("SMOKE TEST PASSED")
print("=" * 65)

print(
    "Qwen3-VL + QLoRA + images + "
    "collator successfully completed training steps."
)
