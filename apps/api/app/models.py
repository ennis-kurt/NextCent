from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=uuid_str)
    persona_key = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    archetype = Column(String, nullable=False, default="")
    persona_summary = Column(Text, nullable=False, default="")
    monthly_income_estimate = Column(Float, default=0.0)
    monthly_fixed_expenses_estimate = Column(Float, default=0.0)
    savings_floor_target = Column(Float, default=0.0)
    credit_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accounts = relationship("ConnectedAccount", back_populates="user", cascade="all, delete-orphan")


class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    provider = Column(String, default="mock-provider", nullable=False)
    external_id = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=False)
    sanitized_name = Column(String, nullable=False)
    institution_name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)
    subtype = Column(String, nullable=False)
    last4 = Column(String, nullable=True)
    currency = Column(String, default="USD", nullable=False)
    details_json = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="accounts")

    __table_args__ = (
        Index("ix_connected_accounts_user_type", "user_id", "account_type"),
    )


class AccountBalanceSnapshot(Base):
    __tablename__ = "account_balance_snapshots"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("connected_accounts.id"), nullable=False)
    snapshot_at = Column(DateTime, nullable=False)
    current_balance = Column(Float, nullable=False)
    available_balance = Column(Float, nullable=False)
    pending_balance = Column(Float, default=0.0, nullable=False)

    __table_args__ = (
        Index("ix_account_balance_snapshots_user_date", "user_id", "snapshot_at"),
        Index("ix_account_balance_snapshots_account_date", "account_id", "snapshot_at"),
    )


class TransactionCategory(Base):
    __tablename__ = "transaction_categories"

    id = Column(String, primary_key=True, default=uuid_str)
    key = Column(String, unique=True, nullable=False)
    label = Column(String, nullable=False)
    group_key = Column(String, nullable=False)
    description = Column(Text, nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("connected_accounts.id"), nullable=False)
    posted_at = Column(DateTime, nullable=False)
    pending = Column(Boolean, default=False, nullable=False)
    amount = Column(Float, nullable=False)
    direction = Column(String, nullable=False)
    merchant_name_raw = Column(String, nullable=False)
    merchant_name_normalized = Column(String, nullable=False)
    description_raw = Column(Text, nullable=False)
    category_key = Column(String, nullable=False)
    is_transfer = Column(Boolean, default=False, nullable=False)
    is_subscription_candidate = Column(Boolean, default=False, nullable=False)
    is_interest_charge = Column(Boolean, default=False, nullable=False)
    is_fee = Column(Boolean, default=False, nullable=False)
    is_income = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)

    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "posted_at"),
        Index("ix_transactions_account_date", "account_id", "posted_at"),
        Index("ix_transactions_user_category", "user_id", "category_key"),
    )


class RecurringCharge(Base):
    __tablename__ = "recurring_charges"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("connected_accounts.id"), nullable=False)
    merchant_key = Column(String, nullable=False)
    label = Column(String, nullable=False)
    monthly_amount = Column(Float, nullable=False)
    cadence = Column(String, nullable=False)
    next_expected_at = Column(DateTime, nullable=False)
    last_seen_at = Column(DateTime, nullable=False)
    confidence = Column(Float, nullable=False)
    status = Column(String, default="active", nullable=False)

    __table_args__ = (
        Index("ix_recurring_charges_user_merchant", "user_id", "merchant_key"),
    )


class CreditCardSummary(Base):
    __tablename__ = "credit_card_summaries"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("connected_accounts.id"), nullable=False)
    credit_limit = Column(Float, nullable=False)
    statement_balance = Column(Float, nullable=False)
    current_balance = Column(Float, nullable=False)
    apr = Column(Float, nullable=True)
    minimum_payment = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    estimated_utilization = Column(Float, nullable=False)
    statement_close_date = Column(Date, nullable=False)

    __table_args__ = (
        Index("ix_credit_card_summaries_user_due_date", "user_id", "due_date"),
    )


class FinancialHealthScore(Base):
    __tablename__ = "financial_health_scores"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    computed_at = Column(DateTime, nullable=False)
    overall_score = Column(Float, nullable=False)
    cash_flow_score = Column(Float, nullable=False)
    debt_score = Column(Float, nullable=False)
    credit_health_score = Column(Float, nullable=False)
    subscription_efficiency_score = Column(Float, nullable=False)
    risk_exposure_score = Column(Float, nullable=False)
    factor_breakdown = Column(JSON, default=dict, nullable=False)

    __table_args__ = (
        Index("ix_financial_health_scores_user_date", "user_id", "computed_at"),
    )


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False)
    severity = Column(String, nullable=False)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    affected_account_ids = Column(JSON, default=list, nullable=False)
    data = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_risk_alerts_user_status", "user_id", "is_active"),
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    impact_estimate = Column(String, nullable=False)
    urgency = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    priority_score = Column(Float, nullable=False)
    affected_accounts = Column(JSON, default=list, nullable=False)
    suggested_action_amount = Column(Float, nullable=True)
    why_now = Column(Text, nullable=False)
    assumptions = Column(JSON, default=list, nullable=False)

    __table_args__ = (
        Index("ix_recommendations_user_priority", "user_id", "priority_score"),
    )


class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(String, primary_key=True, default=uuid_str)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False)
    snapshot = Column(JSON, default=dict, nullable=False)


class MonthlyReview(Base):
    __tablename__ = "monthly_reviews"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    month_start = Column(Date, nullable=False)
    summary_json = Column(JSON, default=dict, nullable=False)

    __table_args__ = (
        Index("ix_monthly_reviews_user_month", "user_id", "month_start"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=uuid_str)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    cited_metrics = Column(JSON, default=list, nullable=False)
    assumptions = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, nullable=False)


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    run_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=False)
    summary_json = Column(JSON, default=dict, nullable=False)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    input_json = Column(JSON, default=dict, nullable=False)
    output_json = Column(JSON, default=dict, nullable=False)
    assumptions_json = Column(JSON, default=list, nullable=False)

    __table_args__ = (
        Index("ix_agent_runs_user_agent_date", "user_id", "agent_name", "created_at"),
    )


class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    scenario_type = Column(String, nullable=False)
    inputs_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("ix_simulation_scenarios_user_date", "user_id", "created_at"),
    )


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(String, primary_key=True, default=uuid_str)
    scenario_id = Column(String, ForeignKey("simulation_scenarios.id"), nullable=False)
    created_at = Column(DateTime, nullable=False)
    summary_json = Column(JSON, default=dict, nullable=False)


class SanitizedAIView(Base):
    __tablename__ = "sanitized_ai_views"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    view_type = Column(String, nullable=False)
    source_ref = Column(String, nullable=False)
    payload_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("ix_sanitized_ai_views_user_type", "user_id", "view_type"),
    )


class SafeToSpendSnapshot(Base):
    __tablename__ = "safe_to_spend_snapshots"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    computed_at = Column(DateTime, nullable=False)
    safe_to_spend_today = Column(Float, nullable=False)
    safe_to_spend_this_week = Column(Float, nullable=False)
    safe_to_spend_until_payday = Column(Float, nullable=False)
    spending_velocity_status = Column(String, nullable=False)
    projected_zero_date = Column(Date, nullable=True)
    guidance_summary = Column(Text, nullable=False)
    inputs_json = Column(JSON, default=dict, nullable=False)

    __table_args__ = (
        Index("ix_safe_to_spend_snapshots_user_date", "user_id", "computed_at"),
    )


class DebtStrategyRun(Base):
    __tablename__ = "debt_strategy_runs"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    computed_at = Column(DateTime, nullable=False)
    recommended_strategy = Column(String, nullable=False)
    results_json = Column(JSON, default=dict, nullable=False)


class MerchantActionMetadata(Base):
    __tablename__ = "merchant_action_metadata"

    id = Column(String, primary_key=True, default=uuid_str)
    merchant_key = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    help_url = Column(String, nullable=False)
    cancellation_url = Column(String, nullable=False)
    support_email = Column(String, nullable=False)
    cancellation_steps = Column(JSON, default=list, nullable=False)
    confidence = Column(Float, nullable=False)


class PrivacyPolicyLog(Base):
    __tablename__ = "privacy_policy_logs"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    policy_version = Column(String, nullable=False)
    consent_mode = Column(String, nullable=False)
    logged_at = Column(DateTime, nullable=False)
    details_json = Column(JSON, default=dict, nullable=False)


class LLMPayloadAuditLog(Base):
    __tablename__ = "llm_payload_audit_logs"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    payload_json = Column(JSON, default=dict, nullable=False)
    payload_hash = Column(String, nullable=False)
    mode = Column(String, nullable=False)
    blocked_fields = Column(JSON, default=list, nullable=False)
    allowed_fields = Column(JSON, default=list, nullable=False)

    __table_args__ = (
        Index("ix_llm_payload_audit_logs_user_date", "user_id", "created_at"),
    )
