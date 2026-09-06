
import json
from pathlib import Path

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
    / "qwen3vl_vrsbench_lora"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# --------------------------------------------------
# Require CUDA
# --------------------------------------------------

if not torch.cuda.is_available():
    raise RuntimeError(
        "CUDA GPU is not available. "
        "Run this script only on an NVIDIA GPU runtime."
    )

print(
    "GPU:",
    torch.cuda.get_device_name(0)
)

print(
    "VRAM:",
    round(
        torch.cuda.get_device_properties(0).total_memory
        / 1024**3,
        2
    ),
    "GB"
)


# --------------------------------------------------
# Load training metadata
# --------------------------------------------------

rows = []

with open(
    TRAIN_FILE,
    "r",
    encoding="utf-8"
) as f:

    for line in f:

        if line.strip():

            rows.append(
                json.loads(line)
            )

print(
    "Training examples:",
    len(rows)
)


# --------------------------------------------------
# Verify image files
# --------------------------------------------------

missing = sorted({
    row["image"]
    for row in rows
    if not (
        IMAGE_DIR
        / row["image"]
    ).exists()
})

if missing:

    raise FileNotFoundError(
        f"{len(missing)} training images are missing. "
        f"Examples: {missing[:10]}"
    )

print("✓ Training images verified")

dataset = Dataset.from_list(
    rows
)


# --------------------------------------------------
# Processor
# --------------------------------------------------

processor = AutoProcessor.from_pretrained(
    MODEL_ID
)


# --------------------------------------------------
# 4-bit QLoRA configuration
# --------------------------------------------------

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

print("Loading Qwen3-VL in 4-bit...")

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
# LoRA configuration
# --------------------------------------------------

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,

    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj"
    ],

    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(
    model,
    lora_config
)

model.print_trainable_parameters()


# --------------------------------------------------
# Collator
#
# Important:
# loss is calculated only on assistant answer tokens.
# Prompt/user/image/template tokens are masked with -100.
# --------------------------------------------------

def collate_fn(batch):

    full_texts = []
    prompt_texts = []

    full_images = []
    prompt_images = []

    for sample in batch:

        image_path = (
            IMAGE_DIR
            / sample["image"]
        )

        user_message = {
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
        }

        assistant_message = {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": sample["answer"]
                }
            ]
        }

        full_messages = [
            user_message,
            assistant_message
        ]

        prompt_messages = [
            user_message
        ]


        # ------------------------------------------
        # Full conversation
        # ------------------------------------------

        full_text = processor.apply_chat_template(
            full_messages,
            tokenize=False,
            add_generation_prompt=False
        )

        full_image_inputs, _ = (
            process_vision_info(
                full_messages
            )
        )


        # ------------------------------------------
        # Prompt ending exactly where assistant
        # generation begins
        # ------------------------------------------

        prompt_text = processor.apply_chat_template(
            prompt_messages,
            tokenize=False,
            add_generation_prompt=True
        )

        prompt_image_inputs, _ = (
            process_vision_info(
                prompt_messages
            )
        )

        full_texts.append(
            full_text
        )

        prompt_texts.append(
            prompt_text
        )

        full_images.append(
            full_image_inputs[0]
        )

        prompt_images.append(
            prompt_image_inputs[0]
        )


    # ----------------------------------------------
    # Tokenize full conversations
    # ----------------------------------------------

    inputs = processor(
        text=full_texts,
        images=full_images,
        padding=True,
        return_tensors="pt"
    )


    # ----------------------------------------------
    # Tokenize prompt-only versions
    # ----------------------------------------------

    prompt_inputs = processor(
        text=prompt_texts,
        images=prompt_images,
        padding=True,
        return_tensors="pt"
    )


    labels = inputs[
        "input_ids"
    ].clone()


    # Mask padding tokens
    labels[
        inputs["attention_mask"] == 0
    ] = -100


    # ----------------------------------------------
    # Mask everything before assistant answer
    # ----------------------------------------------

    for i in range(
        len(batch)
    ):

        prompt_length = int(
            prompt_inputs[
                "attention_mask"
            ][i].sum().item()
        )

        labels[
            i,
            :prompt_length
        ] = -100


    inputs[
        "labels"
    ] = labels

    return inputs


# --------------------------------------------------
# Training arguments
# --------------------------------------------------

training_args = TrainingArguments(

    output_dir=str(
        OUTPUT_DIR
    ),

    per_device_train_batch_size=1,

    gradient_accumulation_steps=8,

    num_train_epochs=1,

    learning_rate=2e-4,


    logging_steps=10,

    save_steps=250,

    save_total_limit=2,

    fp16=True,

    gradient_checkpointing=True,

    remove_unused_columns=False,

    report_to="none",

    dataloader_num_workers=0,

    optim="paged_adamw_8bit",

    warmup_steps=50,
        seed=42
)


trainer = Trainer(

    model=model,

    args=training_args,

    train_dataset=dataset,

    data_collator=collate_fn
)


print("\n" + "=" * 65)

print(
    "STARTING VRSBENCH QLoRA TRAINING"
)

print("=" * 65)

trainer.train()


print("\nSaving LoRA adapter...")

model.save_pretrained(
    OUTPUT_DIR
)

processor.save_pretrained(
    OUTPUT_DIR
)


print("\n" + "=" * 65)

print(
    "TRAINING COMPLETE"
)

print("=" * 65)

print(
    "Adapter saved:",
    OUTPUT_DIR
)
