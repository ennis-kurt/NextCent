from __future__ import annotations

from app.database import SessionLocal
from app.services.finance import (
    compute_debt_strategies,
    compute_financial_health,
    compute_safe_to_spend,
    fetch_user_context,
)
from app.services.sanitization import BLOCKED_FIELDS, SanitizationService


def test_sanitization_policy_blocks_raw_fields():
    assert "merchant_name_raw" in BLOCKED_FIELDS
    assert "description_raw" in BLOCKED_FIELDS
    assert "account_number_suffix" in BLOCKED_FIELDS


def test_safe_to_spend_is_non_negative_for_healthy_persona():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "healthy-cashflow")
        safe = compute_safe_to_spend(context)
        assert safe.safe_to_spend_this_week >= 0
        assert safe.safe_to_spend_until_payday >= safe.safe_to_spend_this_week
    finally:
        db.close()


def test_debt_strategy_recommends_cash_preserving_for_tight_buffer():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "frequent-overdraft-fees")
        safe = compute_safe_to_spend(context)
        strategies = compute_debt_strategies(context, safe)
        assert strategies.recommended_strategy == "cash_preserving"
    finally:
        db.close()


def test_financial_health_score_stays_in_range():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "credit-score-pressure")
        safe = compute_safe_to_spend(context)
        health = compute_financial_health(context, safe)
        assert 0 <= health.overall_score <= 100
        assert health.credit_health_score < 60
    finally:
        db.close()
