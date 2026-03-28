from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
API_DIR = Path(__file__).resolve().parents[1]
DEFAULT_LOCAL_DATABASE_URL = f"sqlite:///{API_DIR / 'personal_accountant.db'}"
DEFAULT_VERCEL_DATABASE_URL = "sqlite:////tmp/personal_accountant.db"
BUNDLED_DATA_DIR = API_DIR / "data"
SHARED_DATA_DIR = ROOT_DIR / "packages" / "mock-scenarios" / "data"


def resolve_database_url() -> str:
    raw_url = os.environ.get(
        "DATABASE_URL",
        DEFAULT_VERCEL_DATABASE_URL if os.environ.get("VERCEL") else DEFAULT_LOCAL_DATABASE_URL,
    )

    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql://", 1)

    return raw_url


@dataclass(frozen=True)
class Settings:
    app_name: str = "Personal Accountant AI API"
    api_prefix: str = "/api/v1"
    database_url: str = resolve_database_url()
    default_persona_id: str = "high-debt-strong-income"
    external_llm_enabled: bool = False
    privacy_policy_version: str = "2026-03-28"
    scenarios_path: Path = (BUNDLED_DATA_DIR if (BUNDLED_DATA_DIR / "personas.json").exists() else SHARED_DATA_DIR) / "personas.json"
    merchant_actions_path: Path = (
        BUNDLED_DATA_DIR if (BUNDLED_DATA_DIR / "merchant_actions.json").exists() else SHARED_DATA_DIR
    ) / "merchant_actions.json"


settings = Settings()
