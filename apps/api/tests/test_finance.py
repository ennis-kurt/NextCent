from __future__ import annotations

from app.database import SessionLocal
from app.services.finance import (
    build_cash_flow_response,
    build_credit_summary,
    compute_debt_strategies,
    compute_financial_health,
    compute_investment_guidance,
    compute_recommendations,
    compute_risks,
    compute_safe_to_spend,
    fetch_user_context,
    persist_pipeline,
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


def test_debt_strategy_accounts_for_deferred_interest_deadline():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "good-cash-poor-payment-allocation")
        safe = compute_safe_to_spend(context)
        strategies = compute_debt_strategies(context, safe)
        assert strategies.recommended_strategy == "avalanche"
        assert "deferred interest" in strategies.rationale.lower()
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


def test_cash_flow_response_exposes_longer_history_and_projected_low_point():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "thin-checking-upcoming-bills")
        safe = compute_safe_to_spend(context)
        response = build_cash_flow_response(context, safe)
        assert len(response.monthly_series) == 12
        assert len(response.ending_balance_series) == 12
        assert response.upcoming_events
        assert response.paycheck_to_paycheck_view["lowest_projected_balance"] <= latest_value(response.ending_balance_series)
    finally:
        db.close()


def latest_value(series):
    return series[-1].balance


def test_credit_summary_surfaces_deferred_interest_pacing():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "good-cash-poor-payment-allocation")
        summary = build_credit_summary(context)
        promo_card = next(card for card in summary.cards if card.deferred_interest_offers)
        assert promo_card.minimum_monthly_payment_to_avoid_deferred_interest is not None
        assert promo_card.minimum_monthly_payment_to_avoid_deferred_interest > promo_card.minimum_payment
        assert len(promo_card.balance_history) == 12
    finally:
        db.close()


def test_recommendations_prioritize_deferred_interest_when_deadline_is_near():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "good-cash-poor-payment-allocation")
        safe = compute_safe_to_spend(context)
        health = compute_financial_health(context, safe)
        debt = compute_debt_strategies(context, safe)
        investment = compute_investment_guidance(context, safe, debt)
        risks = compute_risks(context, safe)
        recommendations = compute_recommendations(context, safe, health, risks, debt, investment)
        assert recommendations[0].suggested_action_amount is not None
        assert "deferred interest" in recommendations[0].title.lower()
    finally:
        db.close()


def test_investment_guidance_prefers_debt_for_high_apr_persona():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "credit-score-pressure")
        safe = compute_safe_to_spend(context)
        debt = compute_debt_strategies(context, safe)
        investment = compute_investment_guidance(context, safe, debt)
        assert investment.posture == "debt_first"
        assert investment.recommended_investment_amount == 0
    finally:
        db.close()


def test_investment_guidance_allows_investing_for_healthy_persona():
    db = SessionLocal()
    try:
        context = fetch_user_context(db, "healthy-cashflow")
        safe = compute_safe_to_spend(context)
        debt = compute_debt_strategies(context, safe)
        investment = compute_investment_guidance(context, safe, debt)
        assert investment.posture == "invest_now"
        assert investment.recommended_investment_amount > 0
    finally:
        db.close()


def test_persist_pipeline_can_run_twice_for_same_persona():
    db = SessionLocal()
    try:
        persist_pipeline(db, "credit-score-pressure")
        persist_pipeline(db, "credit-score-pressure")
    finally:
        db.close()
