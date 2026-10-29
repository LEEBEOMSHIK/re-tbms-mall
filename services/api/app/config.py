"""Local settings, resolved relative to this service and overridden by the process."""

import os
from pathlib import Path

from dotenv import dotenv_values

SERVICE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ORIGINS = "http://localhost:3100,http://127.0.0.1:3100"


def load_cors_origins(env_file: Path | None = None) -> list[str]:
    values = dotenv_values(
        env_file if env_file is not None else SERVICE_DIR / ".env",
        encoding="utf-8-sig",
    )
    raw = os.environ.get("CORS_ORIGINS", values.get("CORS_ORIGINS", DEFAULT_ORIGINS))
    return [origin.strip() for origin in (raw or "").split(",") if origin.strip()]


def load_admin_token(env_file: Path | None = None) -> str:
    values = dotenv_values(
        env_file if env_file is not None else SERVICE_DIR / '.env',
        encoding='utf-8-sig',
    )
    return os.environ.get('STORE_ADMIN_TOKEN', values.get('STORE_ADMIN_TOKEN') or '')
