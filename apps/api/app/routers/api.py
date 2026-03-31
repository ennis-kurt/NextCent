from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import AgentRun, ChatMessage, ChatSession, MerchantActionMetadata, RecurringCharge, SimulationResult, SimulationScenario, User
from ..schemas import (
    ActivationResponse,
    AdminSeedScenarioResponse,
    AgentTraceResponse,
    CashFlowResponse,
    CancellationDraftResponse,
    CancellationLinkResponse,
    ChatAnswer,
    ChatMessageSchema,
    ChatTranscriptResponse,
    ChatMessageRequest,
    ChatSessionSchema,
    CreditSummaryResponse,
    DashboardResponse,
    DebtStrategyRunSchema,
    FinancialHealthScoreSchema,
    InvestmentGuidanceSchema,
    MonthlyReviewSchema,
    PersonaSummary,
    RecommendationSchema,
    RiskAlertSchema,
    SafeToSpendSnapshotSchema,
    SimulationHistoryItem,
    SanitizationPolicyResponse,
    SimulationResultSchema,
    SimulationScenarioRequest,
    SubscriptionSummary,
)
from ..services.chat import answer_chat, create_chat_session
from ..services.finance import (
    build_account_summaries,
    build_cash_flow_response,
    build_credit_summary,
    build_dashboard_response,
    build_monthly_review,
    build_subscription_summaries,
    compute_investment_guidance,
    compute_debt_strategies,
    compute_financial_health,
    compute_recommendations,
    compute_risks,
    compute_safe_to_spend,
    fetch_user_context,
    latest_balance_summary,
    persist_pipeline,
)
from ..services.sanitization import POLICY


router = APIRouter()


def resolve_persona(persona_id: str | None, db: Session) -> User:
    effective_id = persona_id or settings.default_persona_id
    user = db.query(User).filter(User.persona_key == effective_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Persona '{effective_id}' not found.")
    return user


@router.get("/personas", response_model=list[PersonaSummary])
def get_personas(db: Session = Depends(get_db)):
    personas = db.query(User).order_by(User.full_name.asc()).all()
    response: list[PersonaSummary] = []
    for user in personas:
        dashboard = build_dashboard_response(db, user.persona_key)
        response.append(
            PersonaSummary(
                id=user.persona_key,
                name=user.full_name,
                archetype=user.archetype,
                summary=user.persona_summary,
                health_score=dashboard.financial_health.overall_score,
                safe_to_spend_this_week=dashboard.safe_to_spend.safe_to_spend_this_week,
                top_priority_title=dashboard.top_recommendations[0].title if dashboard.top_recommendations else "No action needed",
            )
        )
    return response


@router.post("/personas/{persona_id}/activate", response_model=ActivationResponse)
def activate_persona(persona_id: str, db: Session = Depends(get_db)):
    resolve_persona(persona_id, db)
    return ActivationResponse(
        persona_id=persona_id,
        activated_at=datetime.utcnow(),
        note="Store this persona identifier client-side and send it as the persona_id query parameter for subsequent calls.",
    )


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    return build_dashboard_response(db, user.persona_key)


@router.get("/accounts")
def get_accounts(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    context.cards = context.cards or []
    return build_account_summaries(context)


@router.get("/balances")
def get_balances(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    return latest_balance_summary(context)


@router.get("/transactions")
def get_transactions(
    persona_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    return [
        {
            "id": transaction.id,
            "posted_at": transaction.posted_at,
            "amount": transaction.amount,
            "merchant_name_normalized": transaction.merchant_name_normalized,
            "category_key": transaction.category_key,
            "pending": transaction.pending,
            "account_id": transaction.account_id,
        }
        for transaction in context.transactions[:limit]
    ]


@router.get("/categories")
def get_categories(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    return build_cash_flow_response(context, compute_safe_to_spend(context)).category_breakdown


@router.get("/cash-flow", response_model=CashFlowResponse)
def get_cash_flow(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    return build_cash_flow_response(context, safe)


@router.get("/subscriptions", response_model=list[SubscriptionSummary])
def get_subscriptions(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    return build_subscription_summaries(fetch_user_context(db, user.persona_key))


@router.get("/credit-summaries", response_model=CreditSummaryResponse)
def get_credit_summaries(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    return build_credit_summary(fetch_user_context(db, user.persona_key))


@router.get("/financial-health", response_model=FinancialHealthScoreSchema)
def get_financial_health(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    return compute_financial_health(context, safe)


@router.get("/recommendations", response_model=list[RecommendationSchema])
def get_recommendations(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    health = compute_financial_health(context, safe)
    risks = compute_risks(context, safe)
    debt = compute_debt_strategies(context, safe)
    investment = compute_investment_guidance(context, safe, debt)
    return compute_recommendations(context, safe, health, risks, debt, investment)


@router.get("/alerts", response_model=list[RiskAlertSchema])
def get_alerts(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    return compute_risks(context, safe)


@router.get("/monthly-reviews", response_model=list[MonthlyReviewSchema])
def get_monthly_reviews(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    health = compute_financial_health(context, safe)
    return [build_monthly_review(context, health, safe)]


@router.get("/safe-to-spend", response_model=SafeToSpendSnapshotSchema)
def get_safe_to_spend(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    return compute_safe_to_spend(fetch_user_context(db, user.persona_key))


@router.get("/debt-strategies", response_model=DebtStrategyRunSchema)
def get_debt_strategies(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    return compute_debt_strategies(context, safe)


@router.get("/investment-guidance", response_model=InvestmentGuidanceSchema)
def get_investment_guidance(persona_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    context = fetch_user_context(db, user.persona_key)
    safe = compute_safe_to_spend(context)
    debt = compute_debt_strategies(context, safe)
    return compute_investment_guidance(context, safe, debt)


@router.post("/simulate", response_model=SimulationResultSchema)
def simulate(payload: SimulationScenarioRequest, db: Session = Depends(get_db)):
    user = resolve_persona(payload.persona_id, db)
    from ..services.finance import run_simulation

    return run_simulation(db, user.persona_key, payload.model_dump(mode="json"))


@router.get("/simulations", response_model=list[SimulationHistoryItem])
def get_simulation_history(
    persona_id: str | None = Query(default=None),
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    user = resolve_persona(persona_id, db)
    scenarios = (
        db.query(SimulationScenario)
        .filter(SimulationScenario.user_id == user.id)
        .order_by(SimulationScenario.created_at.desc())
        .limit(limit)
        .all()
    )
    if not scenarios:
        return []

    scenario_ids = [scenario.id for scenario in scenarios]
    results = (
        db.query(SimulationResult)
        .filter(SimulationResult.scenario_id.in_(scenario_ids))
        .order_by(SimulationResult.created_at.desc())
        .all()
    )
    result_lookup: dict[str, SimulationResult] = {}
    for result in results:
        result_lookup.setdefault(result.scenario_id, result)

    return [
        SimulationHistoryItem(
            scenario_id=scenario.id,
            name=scenario.name,
            scenario_type=scenario.scenario_type,
            created_at=scenario.created_at,
            result=SimulationResultSchema.model_validate(result_lookup[scenario.id].summary_json),
        )
        for scenario in scenarios
        if scenario.id in result_lookup
    ]


@router.post("/subscriptions/{subscription_id}/draft-cancellation", response_model=CancellationDraftResponse)
def draft_cancellation(subscription_id: str, persona_id: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    charge = db.query(RecurringCharge).filter(RecurringCharge.id == subscription_id, RecurringCharge.user_id == user.id).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    subject = f"Request to cancel {charge.label}"
    body = (
        f"Hello,\n\n"
        f"I would like to cancel my subscription for {charge.label}. Please confirm the cancellation date and any remaining charges.\n\n"
        f"Thank you."
    )
    return CancellationDraftResponse(
        subscription_id=subscription_id,
        merchant_label=charge.label,
        subject=subject,
        body=body,
        disclaimer="Review and edit this message before sending. The app does not send cancellation requests automatically in the MVP.",
    )


@router.get("/subscriptions/{subscription_id}/cancellation-link", response_model=CancellationLinkResponse)
def get_cancellation_link(subscription_id: str, persona_id: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    charge = db.query(RecurringCharge).filter(RecurringCharge.id == subscription_id, RecurringCharge.user_id == user.id).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    merchant = db.query(MerchantActionMetadata).filter(MerchantActionMetadata.merchant_key == charge.merchant_key).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="No verified action metadata available for this merchant.")
    return CancellationLinkResponse(
        subscription_id=subscription_id,
        merchant_label=merchant.display_name,
        help_url=merchant.help_url,
        cancellation_url=merchant.cancellation_url,
        support_email=merchant.support_email,
        steps=merchant.cancellation_steps,
        confidence=merchant.confidence,
    )


@router.get("/privacy/sanitization-policy", response_model=SanitizationPolicyResponse)
def get_sanitization_policy():
    return SanitizationPolicyResponse(
        llm_mode="disabled_by_default_sanitized_stub",
        safe_for_llm=POLICY.safe_for_llm,
        masked_for_llm=POLICY.masked_for_llm,
        blocked_for_llm=POLICY.blocked_for_llm,
        notes=[
            "Deterministic finance calculations are executed before any language-model boundary.",
            "Raw account identifiers, names, and descriptions are blocked from external model payloads.",
            "Every sanitized payload is audit logged before model gateway use.",
        ],
    )


@router.get("/agent-traces/{agent_run_id}/sanitized-input", response_model=AgentTraceResponse)
def get_agent_trace(agent_run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == agent_run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found.")
    return AgentTraceResponse(
        agent_run_id=run.id,
        agent_name=run.agent_name,
        created_at=run.created_at,
        sanitized_input=run.input_json,
        output=run.output_json,
        assumptions=run.assumptions_json,
    )


@router.post("/chat/sessions", response_model=ChatSessionSchema)
def create_session(persona_id: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    session = create_chat_session(db, user.id)
    return ChatSessionSchema.model_validate(session)


@router.get("/chat/sessions/latest", response_model=ChatTranscriptResponse | None)
def get_latest_chat_session(persona_id: str = Query(...), db: Session = Depends(get_db)):
    user = resolve_persona(persona_id, db)
    session = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .first()
    )
    if not session:
        return None

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return ChatTranscriptResponse(
        session=ChatSessionSchema.model_validate(session),
        messages=[ChatMessageSchema.model_validate(message) for message in messages],
    )


@router.post("/chat/messages", response_model=ChatAnswer)
def send_chat_message(payload: ChatMessageRequest, db: Session = Depends(get_db)):
    user = resolve_persona(payload.persona_id, db)
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == payload.session_id, ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return answer_chat(db, payload.persona_id, payload.session_id, payload.message)


@router.get("/admin/seed-scenarios", response_model=AdminSeedScenarioResponse)
def get_seed_scenarios(db: Session = Depends(get_db)):
    personas = get_personas(db)
    merchant_links = db.query(MerchantActionMetadata).count()
    return AdminSeedScenarioResponse(
        personas=personas,
        merchant_links=merchant_links,
        notes=[
            "This environment uses seeded personas instead of live account aggregation.",
            "Each persona includes at least one debt, cash-flow, or subscription guidance pattern.",
        ],
    )


@router.get("/admin/agent-runs/{id}")
def get_agent_runs(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.persona_key == id).first()
    if user:
        runs = (
            db.query(AgentRun)
            .filter(AgentRun.user_id == user.id)
            .order_by(AgentRun.created_at.desc())
            .all()
        )
        return [
            AgentTraceResponse(
                agent_run_id=run.id,
                agent_name=run.agent_name,
                created_at=run.created_at,
                sanitized_input=run.input_json,
                output=run.output_json,
                assumptions=run.assumptions_json,
            )
            for run in runs
        ]
    return get_agent_trace(id, db)
