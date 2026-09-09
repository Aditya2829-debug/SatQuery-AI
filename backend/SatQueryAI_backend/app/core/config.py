from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    PROJECT_NAME: str = "Satquery"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Satellite Imagery Querying and Specialist Analysis Engine"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    LOG_LEVEL: str = "INFO"

    # Supabase credentials
    SUPABASE_URL: str = "https://your-project-id.supabase.co"
    SUPABASE_KEY: str = "your-supabase-anon-or-service-role-key"
    SUPABASE_STORAGE_BUCKET: str = "satellite-images"
    SUPABASE_TABLE_NAME: str = "satellite_images"
    GEMINI_API_KEY: str = "[ENCRYPTION_KEY]"
    GEMINI_MODEL_NAME: str = "gemini-3.6-flash"

    # Path to QwenVQA LoRA adapter directory (leave empty to use placeholder)
    SATQUERY_MODEL1_ADAPTER: str = ""

    # Path to RemoteCLIP model checkpoint and EuroSAT index (leave empty to use placeholder)
    SATQUERY_MODEL2_CHECKPOINT: str = ""
    SATQUERY_MODEL2_INDEX: str = ""

    # Path to Change Detection model checkpoint (leave empty to use placeholder)
    SATQUERY_MODEL3_CHECKPOINT: str = ""

    # Image upload configuration
    MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_TYPES: list[str] = [
        "image/jpeg",
        "image/png",
        "image/tiff",
        "image/tif",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton instance."""
    return Settings()


settings: Settings = get_settings()
