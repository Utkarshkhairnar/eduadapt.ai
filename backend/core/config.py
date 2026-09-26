"""
backend/core/config.py
Pydantic Settings — loads AI provider config from backend/configs/.env
Never hardcoded, never logged.
"""
import os
from functools import lru_cache
from typing import Optional

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    _USE_PYDANTIC_SETTINGS = True
except ImportError:
    try:
        from pydantic import BaseSettings
        _USE_PYDANTIC_SETTINGS = False
    except ImportError:
        _USE_PYDANTIC_SETTINGS = False
        BaseSettings = object  # fallback


_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "configs", ".env")


if _USE_PYDANTIC_SETTINGS:
    class AISettings(BaseSettings):
        """AI provider settings loaded from backend/configs/.env"""
        ai_provider: str = "mock_fallback"          # "openai" | "gemini" | "mock_fallback"
        openai_api_key: Optional[str] = None
        gemini_api_key: Optional[str] = None
        ai_model: str = "gemini-1.5-flash"
        ai_timeout_seconds: int = 20

        model_config = SettingsConfigDict(
            env_file=_ENV_PATH,
            env_file_encoding="utf-8",
            case_sensitive=False,
            extra="ignore",
        )
else:
    class AISettings:
        """Fallback manual .env reader when pydantic-settings not installed."""
        def __init__(self):
            env = {}
            if os.path.exists(_ENV_PATH):
                with open(_ENV_PATH, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, _, v = line.partition("=")
                            env[k.strip().upper()] = v.strip().strip('"').strip("'")
            self.ai_provider = env.get("AI_PROVIDER", "mock_fallback")
            self.openai_api_key = env.get("OPENAI_API_KEY") or None
            self.gemini_api_key = env.get("GEMINI_API_KEY") or None
            self.ai_model = env.get("AI_MODEL", "gemini-1.5-flash")
            self.ai_timeout_seconds = int(env.get("AI_TIMEOUT_SECONDS", "20"))


def get_ai_settings() -> AISettings:
    return AISettings()
