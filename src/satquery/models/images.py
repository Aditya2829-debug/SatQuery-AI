"""Local RGB image inputs shared by inference interfaces."""

from io import BytesIO
from pathlib import Path

from PIL import Image


def rgb_image(value) -> Image.Image:
    if isinstance(value, Image.Image):
        return value.convert("RGB")
    if isinstance(value, bytes):
        source = BytesIO(value)
    elif isinstance(value, (str, Path)):
        source = Path(value).expanduser()
    else:
        raise TypeError("Image must be a local path, encoded bytes, or PIL image.")
    with Image.open(source) as image:
        return image.convert("RGB")
