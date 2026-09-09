"""Resolve operator-provided model artifacts without downloading or guessing paths."""

import os
from pathlib import Path


def artifact_path(value, env_name: str, *, directory: bool = False) -> Path:
    value = value if value is not None else os.environ.get(env_name)
    if not value or not str(value).strip():
        raise ValueError(f"Provide an explicit path or set {env_name}.")
    path = Path(value).expanduser().resolve()
    exists = path.is_dir() if directory else path.is_file()
    if not exists:
        kind = "directory" if directory else "file"
        raise FileNotFoundError(f"{env_name}: {kind} not found: {path}")
    return path
