from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
API_DIR = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Personal Accountant AI API"
    api_prefix: str = "/api/v1"
    database_url: str = f"sqlite:///{API_DIR / 'personal_accountant.db'}"
    default_persona_id: str = "high-debt-strong-income"
    external_llm_enabled: bool = False
    privacy_policy_version: str = "2026-03-28"
    scenarios_path: Path = ROOT_DIR / "packages" / "mock-scenarios" / "data" / "personas.json"
    merchant_actions_path: Path = ROOT_DIR / "packages" / "mock-scenarios" / "data" / "merchant_actions.json"


settings = Settings()
