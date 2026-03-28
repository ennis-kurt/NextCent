from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..models import (
    AccountBalanceSnapshot,
    ConnectedAccount,
    LLMPayloadAuditLog,
    SanitizedAIView,
    Transaction,
)
from ..schemas import SanitizedAccountSummaryForAI, SanitizedRecommendationContext, SanitizedTransactionForAI
from ..seed_data import normalize_merchant_key


SAFE_FIELDS = [
    "category_key",
    "amount",
    "date",
    "recurring_hint",
    "risk_flags",
    "account_type",
    "current_balance",
    "available_balance",
    "utilization_estimate",
    "minimum_payment",
    "upcoming_due_date",
]
MASKED_FIELDS = [
    "account_alias",
    "merchant_alias",
]
BLOCKED_FIELDS = [
    "account_name",
    "account_number",
    "account_number_suffix",
    "routing_number",
    "merchant_name_raw",
    "description_raw",
    "full_name",
    "email",
    "home_address",
    "phone_number",
    "institution_name",
]


@dataclass
class SanitizationPolicy:
    safe_for_llm: list[str]
    masked_for_llm: list[str]
    blocked_for_llm: list[str]


POLICY = SanitizationPolicy(
    safe_for_llm=SAFE_FIELDS,
    masked_for_llm=MASKED_FIELDS,
    blocked_for_llm=BLOCKED_FIELDS,
)


def generic_merchant_alias(category_key: str, merchant_name: str) -> str:
    category_to_alias = {
        "groceries": "Grocery Merchant",
        "dining": "Dining Merchant",
        "transportation": "Transportation Merchant",
        "entertainment": "Entertainment Merchant",
        "subscriptions": "Subscription Merchant",
        "fees": "Bank Fee",
        "interest": "Interest Charge",
        "income": "Recurring Income Deposit",
        "debt_payment": "Debt Payment",
        "bills": "Household Biller",
        "savings": "Internal Transfer",
        "transfers": "Internal Transfer",
    }
    if normalize_merchant_key(merchant_name) in {"netflix", "spotify", "adobe"}:
        return "Subscription Merchant"
    return category_to_alias.get(category_key, "General Merchant")


class SanitizationService:
    def __init__(self, db: Session):
        self.db = db

    def sanitize_transaction(self, transaction: Transaction, account: ConnectedAccount) -> SanitizedTransactionForAI:
        risk_flags: list[str] = []
        if transaction.is_fee:
            risk_flags.append("fee")
        if transaction.is_interest_charge:
            risk_flags.append("interest")
        if transaction.pending:
            risk_flags.append("pending")
        return SanitizedTransactionForAI(
            id=transaction.id,
            account_alias=account.sanitized_name,
            merchant_alias=generic_merchant_alias(transaction.category_key, transaction.merchant_name_normalized),
            category_key=transaction.category_key,
            amount=transaction.amount,
            date=transaction.posted_at,
            recurring_hint=transaction.is_subscription_candidate,
            risk_flags=risk_flags,
        )

    def sanitize_account_summary(
        self,
        account: ConnectedAccount,
        snapshot: AccountBalanceSnapshot,
        *,
        utilization_estimate: float | None = None,
        minimum_payment: float | None = None,
        upcoming_due_date=None,
    ) -> SanitizedAccountSummaryForAI:
        return SanitizedAccountSummaryForAI(
            account_alias=account.sanitized_name,
            account_type=account.account_type,
            current_balance=round(snapshot.current_balance, 2),
            available_balance=round(snapshot.available_balance, 2),
            utilization_estimate=utilization_estimate,
            minimum_payment=minimum_payment,
            upcoming_due_date=upcoming_due_date,
        )

    def audit_payload(self, user_id: str, agent_name: str, payload: dict[str, Any]) -> None:
        payload_str = json.dumps(payload, sort_keys=True, default=str)
        payload_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
        self.db.add(
            LLMPayloadAuditLog(
                user_id=user_id,
                agent_name=agent_name,
                created_at=datetime.utcnow(),
                payload_json=payload,
                payload_hash=payload_hash,
                mode="sanitized_stub",
                blocked_fields=POLICY.blocked_for_llm,
                allowed_fields=POLICY.safe_for_llm + POLICY.masked_for_llm,
            )
        )
        self.db.commit()

    def store_sanitized_view(self, user_id: str, view_type: str, source_ref: str, payload: dict[str, Any]) -> None:
        self.db.add(
            SanitizedAIView(
                user_id=user_id,
                view_type=view_type,
                source_ref=source_ref,
                payload_json=payload,
                created_at=datetime.utcnow(),
            )
        )
        self.db.commit()

    def build_recommendation_context(
        self,
        *,
        persona_id: str,
        health_score: float,
        safe_to_spend_this_week: float,
        active_risks: list[str],
        top_categories: list[dict[str, Any]],
        debt_summary: list[dict[str, Any]],
        subscriptions: list[dict[str, Any]],
        assumptions: list[str],
    ) -> SanitizedRecommendationContext:
        return SanitizedRecommendationContext(
            persona_id=persona_id,
            health_score=health_score,
            safe_to_spend_this_week=safe_to_spend_this_week,
            active_risks=active_risks,
            top_categories=top_categories,
            debt_summary=debt_summary,
            subscriptions=subscriptions,
            assumptions=assumptions,
        )
