"""Model 1 inference, matching the committed VRSBench evaluation prompt."""

from .artifacts import artifact_path
from .images import rgb_image

MODEL_ID = "Qwen/Qwen3-VL-2B-Instruct"


def clean_prediction(text: str) -> str:
    text = str(text).lower().strip()
    for prefix in ["the answer is", "answer:"]:
        if text.startswith(prefix):
            text = text[len(prefix) :].strip()
    return text.strip(" .,!?:;\"'")


class QwenVQA:
    """Load the trained LoRA adapter once per worker; call predict per request."""

    def __init__(self, adapter_path=None, *, base_model=MODEL_ID, device=None):
        adapter = artifact_path(adapter_path, "SATQUERY_MODEL1_ADAPTER", directory=True)
        if not (adapter / "adapter_config.json").is_file() or not any(
            (adapter / name).is_file()
            for name in ("adapter_model.safetensors", "adapter_model.bin")
        ):
            raise ValueError("Adapter directory needs adapter_config.json and adapter weights.")

        import torch
        from peft import PeftModel
        from transformers import AutoModelForImageTextToText, AutoProcessor

        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.processor = AutoProcessor.from_pretrained(base_model)
        base = AutoModelForImageTextToText.from_pretrained(
            base_model,
            torch_dtype=torch.float16 if self.device.type == "cuda" else torch.float32,
        ).to(self.device)
        self.model = PeftModel.from_pretrained(base, str(adapter)).eval()

    def predict(self, image, question: str, *, max_new_tokens: int = 24) -> dict:
        if not isinstance(question, str) or not question.strip():
            raise ValueError("Question must not be empty.")
        if (
            isinstance(max_new_tokens, bool)
            or not isinstance(max_new_tokens, int)
            or max_new_tokens < 1
        ):
            raise ValueError("max_new_tokens must be a positive integer.")
        import torch

        image = rgb_image(image)
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {
                        "type": "text",
                        "text": (
                            "Answer the question about this satellite image. "
                            "Return only the shortest possible answer. "
                            f"Do not explain.\n\nQuestion: {question}"
                        ),
                    },
                ],
            }
        ]
        text = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.processor(text=[text], images=[image], padding=True, return_tensors="pt").to(
            self.device
        )
        with torch.inference_mode():
            generated = self.model.generate(
                **inputs, max_new_tokens=max_new_tokens, do_sample=False
            )
        trimmed = [output[len(ids) :] for ids, output in zip(inputs.input_ids, generated)]
        raw = self.processor.batch_decode(
            trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]
        return {
            "answer": clean_prediction(raw),
            "raw_answer": raw,
            "model": MODEL_ID,
            "confidence": None,
        }
