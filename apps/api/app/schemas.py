from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RawTransactionInternal(BaseModel):
    id: str
    account_id: str
    account_name: str
    account_number_suffix: str | None = None
    merchant_name_raw: str
    description_raw: str
    amount: float
    date: datetime
    category_key: str
    counterparty: str | None = None
    institution_name: str | None = None


class SanitizedTransactionForAI(BaseModel):
    id: str
    account_alias: str
    merchant_alias: str
    category_key: str
    amount: float
    date: datetime
    recurring_hint: bool
    risk_flags: list[str] = Field(default_factory=list)


class SanitizedAccountSummaryForAI(BaseModel):
    account_alias: str
    account_type: str
    current_balance: float
    available_balance: float
    utilization_estimate: float | None = None
    upcoming_due_date: date | None = None
    minimum_payment: float | None = None


class SanitizedRecommendationContext(BaseModel):
    persona_id: str
    health_score: float
    safe_to_spend_this_week: float
    active_risks: list[str]
    top_categories: list[dict[str, Any]]
    debt_summary: list[dict[str, Any]]
    subscriptions: list[dict[str, Any]]
    assumptions: list[str]


class AccountSummary(ORMModel):
    id: str
    display_name: str
    sanitized_name: str
    institution_name: str
    account_type: str
    subtype: str
    current_balance: float
    available_balance: float
    pending_balance: float
    credit_limit: float | None = None
    minimum_payment: float | None = None
    due_date: date | None = None
    utilization_estimate: float | None = None


class BalanceSummary(BaseModel):
    total_cash: float
    total_debt: float
    net_worth_proxy: float
    liquid_cash: float
    checking_balance: float
    savings_balance: float


class CategorySpend(BaseModel):
    category_key: str
    label: str
    amount: float
    share: float
    trend_vs_baseline: float | None = None


class HealthBreakdown(BaseModel):
    cash_flow_stability: float
    debt_burden: float
    utilization_health: float
    fee_and_interest_leakage: float
    emergency_buffer_strength: float
    spending_discipline: float
    payment_stability: float


class FinancialHealthScoreSchema(BaseModel):
    overall_score: float
    cash_flow_score: float
    debt_score: float
    credit_health_score: float
    subscription_efficiency_score: float
    risk_exposure_score: float
    factor_breakdown: HealthBreakdown
    drivers: list[str]


class RiskAlertSchema(ORMModel):
    id: str
    severity: Literal["urgent", "important", "informational"]
    category: str
    title: str
    summary: str
    rationale: str
    affected_account_ids: list[str]
    data: dict[str, Any]
    is_active: bool


class RecommendationSchema(ORMModel):
    id: str
    title: str
    summary: str
    rationale: str
    impact_estimate: str
    urgency: Literal["urgent", "important", "routine"]
    confidence: float
    category: str
    affected_accounts: list[str]
    suggested_action_amount: float | None = None
    why_now: str
    assumptions: list[str]
    created_at: datetime
    priority_score: float


class SafeToSpendSnapshotSchema(BaseModel):
    safe_to_spend_today: float
    safe_to_spend_this_week: float
    safe_to_spend_until_payday: float
    spending_velocity_status: Literal["safe", "caution", "likely_overspend"]
    projected_zero_date: date | None = None
    guidance_summary: str
    expected_income_before_payday: float
    fixed_obligations_before_payday: float
    risk_buffer: float
    savings_floor: float


class DebtStrategyCard(BaseModel):
    strategy: Literal["avalanche", "snowball", "cash_preserving", "utilization_improving"]
    title: str
    prioritizes: str
    why_choose_it: str
    monthly_payment_pool: float
    projected_payoff_months: int
    projected_payoff_date: date
    projected_interest_cost: float
    liquidity_impact: str
    tradeoffs: str
    suggested_allocations: list[dict[str, Any]]


class DebtStrategyRunSchema(BaseModel):
    recommended_strategy: str
    rationale: str
    strategies: list[DebtStrategyCard]


class SubscriptionSummary(BaseModel):
    id: str
    merchant_key: str
    label: str
    monthly_amount: float
    next_expected_at: datetime
    confidence: float
    waste_risk: str
    action_status: str


class MonthlyReviewSchema(BaseModel):
    month_start: date
    summary: str
    improved: list[str]
    worsened: list[str]
    total_spending: float
    income: float
    debt_progress: str
    fees_and_interest_paid: float
    next_month_actions: list[str]


class InvestmentGuidanceSchema(BaseModel):
    posture: Literal["invest_now", "debt_first", "buffer_first"]
    title: str
    summary: str
    rationale: str
    recommended_investment_amount: float
    priority_action_amount: float
    priority_destination: str
    investment_channel: str
    cadence: Literal["monthly", "this_cycle"]
    monthly_surplus: float
    fee_and_interest_leakage: float
    max_apr: float | None = None
    liquid_buffer_months: float
    why_now: str
    assumptions: list[str]


class DashboardResponse(BaseModel):
    persona_id: str
    persona_name: str
    archetype: str
    balance_summary: BalanceSummary
    financial_health: FinancialHealthScoreSchema
    safe_to_spend: SafeToSpendSnapshotSchema
    investment_guidance: InvestmentGuidanceSchema
    top_recommendations: list[RecommendationSchema]
    risks: list[RiskAlertSchema]
    spend_by_category: list[CategorySpend]
    subscriptions_total: float
    fee_and_interest_leakage: float
    net_monthly_cash_flow: float


class CashFlowResponse(BaseModel):
    monthly_income: float
    monthly_spending: float
    monthly_fixed_expenses: float
    monthly_variable_expenses: float
    discretionary_spending: float
    forecasted_month_end_balance: float
    paycheck_to_paycheck_view: dict[str, Any]
    spending_velocity: dict[str, Any]
    category_breakdown: list[CategorySpend]
    monthly_series: list[dict[str, Any]]


class CreditSummaryResponse(BaseModel):
    current_score: int | None = None
    score_available: bool
    trend_label: str
    utilization_pressure: float
    payment_behavior: str
    actionable_suggestions: list[str]
    cards: list[AccountSummary]


class SimulationScenarioRequest(BaseModel):
    persona_id: str
    name: str
    scenario_type: Literal[
        "new_monthly_expense",
        "extra_debt_payment",
        "cancel_subscriptions",
        "reduce_category_spend",
        "move_to_savings"
    ]
    amount: float | None = None
    category_key: str | None = None
    subscription_ids: list[str] = Field(default_factory=list)
    account_id: str | None = None
    notes: str | None = None


class SimulationResultSchema(BaseModel):
    scenario_id: str
    summary: str
    comfort_level: Literal["comfortable", "tight", "risky"]
    facts: list[str]
    estimates: list[str]
    warnings: list[str]
    assumptions: list[str]
    current_state: dict[str, float | str | None]
    simulated_state: dict[str, float | str | None]
    deltas: dict[str, float | str | None]


class ChatSessionSchema(ORMModel):
    id: str
    title: str
    created_at: datetime


class ChatMessageSchema(ORMModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    cited_metrics: list[str]
    assumptions: list[str]
    created_at: datetime


class ChatTranscriptResponse(BaseModel):
    session: ChatSessionSchema
    messages: list[ChatMessageSchema]


class ChatMessageRequest(BaseModel):
    persona_id: str
    session_id: str
    message: str


class ChatAnswer(BaseModel):
    session_id: str
    answer: str
    facts: list[str]
    estimates: list[str]
    cited_metrics: list[str]
    assumptions: list[str]
    suggested_prompts: list[str]
    source_cards: list[dict[str, Any]]


class SimulationHistoryItem(BaseModel):
    scenario_id: str
    name: str
    scenario_type: Literal[
        "new_monthly_expense",
        "extra_debt_payment",
        "cancel_subscriptions",
        "reduce_category_spend",
        "move_to_savings"
    ]
    created_at: datetime
    result: SimulationResultSchema


class PersonaSummary(BaseModel):
    id: str
    name: str
    archetype: str
    summary: str
    health_score: float
    safe_to_spend_this_week: float
    top_priority_title: str


class SanitizationPolicyResponse(BaseModel):
    llm_mode: str
    safe_for_llm: list[str]
    masked_for_llm: list[str]
    blocked_for_llm: list[str]
    notes: list[str]


class AgentTraceResponse(BaseModel):
    agent_run_id: str
    agent_name: str
    created_at: datetime
    sanitized_input: dict[str, Any]
    output: dict[str, Any]
    assumptions: list[str]


class CancellationDraftResponse(BaseModel):
    subscription_id: str
    merchant_label: str
    subject: str
    body: str
    disclaimer: str


class CancellationLinkResponse(BaseModel):
    subscription_id: str
    merchant_label: str
    help_url: str
    cancellation_url: str
    support_email: str
    steps: list[str]
    confidence: float


class ActivationResponse(BaseModel):
    persona_id: str
    activated_at: datetime
    note: str


class AdminSeedScenarioResponse(BaseModel):
    personas: list[PersonaSummary]
    merchant_links: int
    notes: list[str]
