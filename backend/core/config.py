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


class AISettings:
    """Settings reader that checks os.environ first, then backend/configs/.env as fallback."""
    def __init__(self):
        env = {}
        if os.path.exists(_ENV_PATH):
            try:
                with open(_ENV_PATH, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, _, v = line.partition("=")
                            env[k.strip().upper()] = v.strip().strip('"').strip("'")
            except Exception:
                pass
        self.ai_provider = os.environ.get("AI_PROVIDER") or env.get("AI_PROVIDER", "gemini")
        self.openai_api_key = os.environ.get("OPENAI_API_KEY") or env.get("OPENAI_API_KEY") or None
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or env.get("GEMINI_API_KEY") or None
        self.ai_model = os.environ.get("AI_MODEL") or env.get("AI_MODEL", "gemini-2.5-flash")
        self.ai_timeout_seconds = int(os.environ.get("AI_TIMEOUT_SECONDS") or env.get("AI_TIMEOUT_SECONDS", "20"))


def get_ai_settings() -> AISettings:
    return AISettings()
