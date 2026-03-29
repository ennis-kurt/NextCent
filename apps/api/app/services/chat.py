from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..models import ChatMessage, ChatSession
from ..schemas import ChatAnswer
from .finance import (
    build_dashboard_response,
    build_subscription_summaries,
    compute_debt_strategies,
    compute_financial_health,
    compute_investment_guidance,
    compute_recommendations,
    compute_risks,
    compute_safe_to_spend,
    fetch_user_context,
)


def infer_intent(message: str) -> str:
    text = message.lower()
    if "safe" in text and "spend" in text:
        return "safe_to_spend"
    if "overspend" in text or "where am i overspending" in text or "spending" in text:
        return "overspending"
    if "pay first" in text or "which card" in text or "avalanche" in text or "snowball" in text:
        return "debt"
    if "subscription" in text or "cancel" in text:
        return "subscriptions"
    if "score" in text or "health" in text:
        return "score"
    if "short before payday" in text or "run short" in text:
        return "buffer"
    return "overview"


def answer_chat(db: Session, persona_id: str, session_id: str, message: str) -> ChatAnswer:
    context = fetch_user_context(db, persona_id)
    safe = compute_safe_to_spend(context)
    health = compute_financial_health(context, safe)
    risks = compute_risks(context, safe)
    debt = compute_debt_strategies(context, safe)
    investment = compute_investment_guidance(context, safe, debt)
    recommendations = compute_recommendations(context, safe, health, risks, debt, investment)
    subscriptions = build_subscription_summaries(context)
    intent = infer_intent(message)

    facts: list[str] = []
    estimates: list[str] = []
    cited_metrics: list[str] = []
    assumptions: list[str] = ["Answers are grounded in seeded structured account data.", "Estimates are labeled when forward-looking."]
    source_cards: list[dict[str, Any]] = []

    if intent == "safe_to_spend":
        answer = f"You can safely spend about ${safe.safe_to_spend_this_week:.0f} this week based on current balances, expected bills, minimum debt payments, and your recent pace."
        facts.extend(
            [
                f"Safe to Spend today: ${safe.safe_to_spend_today:.0f}",
                f"Safe to Spend this week: ${safe.safe_to_spend_this_week:.0f}",
                f"Expected income before payday: ${safe.expected_income_before_payday:.0f}",
            ]
        )
        estimates.append(safe.guidance_summary)
        cited_metrics.extend(["safe_to_spend_today", "safe_to_spend_this_week", "risk_buffer"])
    elif intent == "overspending":
        top_categories = build_dashboard_response(db, persona_id).spend_by_category[:3]
        category = top_categories[0]
        answer = f"Your biggest recent pressure is {category.label.lower()}, and it is taking about {category.share * 100:.0f}% of tracked monthly spending."
        facts.extend([f"{item.label}: ${item.amount:.0f}" for item in top_categories])
        if category.trend_vs_baseline:
            estimates.append(f"{category.label} is running about {category.trend_vs_baseline:.0f}% versus your trailing baseline.")
        cited_metrics.extend([item.category_key for item in top_categories])
    elif intent == "debt":
        recommended = next((item for item in debt.strategies if item.strategy == debt.recommended_strategy), None)
        top_target = recommended.suggested_allocations[0] if recommended and recommended.suggested_allocations else None
        answer = f"{recommended.title if recommended else 'Cash Preserving'} is the best fit right now because {debt.rationale.lower()}"
        if top_target:
            facts.append(f"Suggested first target payment: ${top_target['suggested_payment']:.0f}")
        if recommended:
            estimates.append(
                f"Projected payoff timeline under this strategy: about {recommended.projected_payoff_months} months with ${recommended.projected_interest_cost:.0f} in interest."
            )
            source_cards.append(recommended.model_dump(mode="json"))
        cited_metrics.extend(["recommended_strategy", "projected_payoff_months", "projected_interest_cost"])
    elif intent == "subscriptions":
        sorted_subscriptions = subscriptions[:3]
        answer = f"You have {len(subscriptions)} subscriptions detected. The first review candidates total about ${sum(item.monthly_amount for item in sorted_subscriptions):.0f} per month."
        facts.extend([f"{item.label}: ${item.monthly_amount:.2f}/month" for item in sorted_subscriptions])
        estimates.append("Recurring detection is based on repeated charge patterns and may include services you still want to keep.")
        cited_metrics.extend(["subscription_count", "subscription_monthly_total"])
    elif intent == "score":
        answer = f"Your current financial health score is {health.overall_score:.0f} out of 100. The biggest drags are debt burden and utilization pressure."
        facts.extend(
            [
                f"Cash flow score: {health.cash_flow_score:.0f}",
                f"Debt score: {health.debt_score:.0f}",
                f"Credit health score: {health.credit_health_score:.0f}",
            ]
        )
        estimates.extend(health.drivers[:2])
        cited_metrics.extend(["overall_score", "debt_score", "credit_health_score"])
    elif intent == "buffer":
        answer = f"At the current pace, your buffer looks {'tight' if safe.spending_velocity_status != 'safe' else 'manageable'} before payday."
        facts.extend(
            [
                f"Safe to Spend until payday: ${safe.safe_to_spend_until_payday:.0f}",
                f"Projected zero date: {safe.projected_zero_date.isoformat() if safe.projected_zero_date else 'Not projected'}",
            ]
        )
        estimates.append(safe.guidance_summary)
        cited_metrics.extend(["safe_to_spend_until_payday", "projected_zero_date"])
    else:
        top_recommendation = recommendations[0] if recommendations else None
        answer = "The most important thing right now is to protect near-term cash while following the highest-impact action on your dashboard."
        if top_recommendation:
            facts.append(top_recommendation.title)
            estimates.append(top_recommendation.impact_estimate)
            source_cards.append(top_recommendation.model_dump(mode="json"))
        cited_metrics.extend(["top_recommendation", "financial_health_score"])

    prompts = [
        "How much can I safely spend this week?",
        "Which card should I pay first right now?",
        "What is hurting my financial health most?",
        "Which subscriptions should I review first?",
    ]

    db.add(ChatMessage(session_id=session_id, role="user", content=message, cited_metrics=[], assumptions=[], created_at=datetime.utcnow()))
    db.add(
        ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            cited_metrics=cited_metrics,
            assumptions=assumptions,
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    return ChatAnswer(
        session_id=session_id,
        answer=answer,
        facts=facts,
        estimates=estimates,
        cited_metrics=cited_metrics,
        assumptions=assumptions,
        suggested_prompts=prompts,
        source_cards=source_cards,
    )


def create_chat_session(db: Session, user_id: str, title: str = "AI Accountant") -> ChatSession:
    session = ChatSession(user_id=user_id, title=title, created_at=datetime.utcnow())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
