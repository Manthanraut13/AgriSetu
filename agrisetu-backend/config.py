"""AgriSetu — Configuration Settings"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Supabase ──────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # ── Sentinel Hub ──────────────────────────────────────────
    SENTINEL_HUB_CLIENT_ID: str
    SENTINEL_HUB_CLIENT_SECRET: str
    SENTINEL_HUB_INSTANCE_ID: str

    # ── OpenWeatherMap ────────────────────────────────────────
    OPENWEATHER_API_KEY: str

    # ── Gemini (LLM) ──────────────────────────────────────────
    GEMINI_API_KEY: str
    GEMINI_BACKUP_API_KEY: str = ""

    # ── Twilio (WhatsApp) ─────────────────────────────────────
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    TWILIO_WHATSAPP_TO: str

    # ── App Config ────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    SECRET_KEY: str = "dev-secret-change-in-production"

    # ── Computed properties ───────────────────────────────────
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL for Supabase."""
        # Extract project ref from URL
        project_ref = self.SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")
        return f"postgresql://postgres.{project_ref}:postgres@db.{project_ref}.supabase.co:5432/postgres"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()


def validate_config():
    """Validate that all required config values are present."""
    required = [
        "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY",
        "SENTINEL_HUB_CLIENT_ID", "SENTINEL_HUB_CLIENT_SECRET",
        "OPENWEATHER_API_KEY", "GEMINI_API_KEY",
        "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
    ]
    missing = [k for k in required if not getattr(settings, k, None)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}. "
            f"Check your .env file."
        )
    return True