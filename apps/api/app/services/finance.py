from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from math import ceil
from typing import Any

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from ..models import (
    AccountBalanceSnapshot,
    AgentRun,
    ChatSession,
    ConnectedAccount,
    CreditCardSummary,
    DebtStrategyRun,
    FinancialHealthScore,
    MonthlyReview,
    PrivacyPolicyLog,
    Recommendation,
    RecommendationHistory,
    RecurringCharge,
    RiskAlert,
    SafeToSpendSnapshot,
    SimulationResult,
    SimulationScenario,
    SyncRun,
    Transaction,
    User,
)
from ..schemas import (
    AccountSummary,
    BalanceSummary,
    CashFlowResponse,
    CategorySpend,
    CreditSummaryResponse,
    DashboardResponse,
    DebtStrategyCard,
    DebtStrategyRunSchema,
    FinancialHealthScoreSchema,
    HealthBreakdown,
    InvestmentGuidanceSchema,
    MonthlyReviewSchema,
    RecommendationSchema,
    RiskAlertSchema,
    SafeToSpendSnapshotSchema,
    SimulationResultSchema,
    SubscriptionSummary,
)
from ..seed_data import REFERENCE_DATE, detect_recurring_from_transactions, normalize_merchant_key
from .sanitization import SanitizationService


FIXED_CATEGORIES = {"bills", "subscriptions", "debt_payment"}
VARIABLE_CATEGORIES = {"groceries", "dining", "entertainment", "transportation", "discretionary"}
LEAKAGE_CATEGORIES = {"fees", "interest"}
DEBT_STRATEGIES = ("avalanche", "snowball", "cash_preserving", "utilization_improving")


@dataclass
class UserContext:
    user: User
    accounts: list[ConnectedAccount]
    snapshots: dict[str, AccountBalanceSnapshot]
    transactions: list[Transaction]
    recurring: list[RecurringCharge]
    cards: list[CreditCardSummary]


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def trailing_transactions(transactions: list[Transaction], days: int) -> list[Transaction]:
    cutoff = datetime.combine(REFERENCE_DATE - timedelta(days=days), datetime.min.time())
    return [transaction for transaction in transactions if transaction.posted_at >= cutoff]


def fetch_user_context(db: Session, persona_id: str) -> UserContext:
    user = db.query(User).filter(User.persona_key == persona_id).one()
    accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).all()
    snapshots = {
        snapshot.account_id: snapshot
        for snapshot in db.query(AccountBalanceSnapshot).filter(AccountBalanceSnapshot.user_id == user.id).all()
    }
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.posted_at.desc())
        .all()
    )
    recurring = db.query(RecurringCharge).filter(RecurringCharge.user_id == user.id).all()
    cards = db.query(CreditCardSummary).filter(CreditCardSummary.user_id == user.id).all()
    return UserContext(user=user, accounts=accounts, snapshots=snapshots, transactions=transactions, recurring=recurring, cards=cards)


def latest_balance_summary(context: UserContext) -> BalanceSummary:
    checking_balance = 0.0
    savings_balance = 0.0
    total_debt = 0.0
    for account in context.accounts:
        snapshot = context.snapshots[account.id]
        if account.account_type == "checking":
            checking_balance += snapshot.current_balance
        elif account.account_type == "savings":
            savings_balance += snapshot.current_balance
        elif account.account_type == "credit":
            total_debt += abs(snapshot.current_balance)
    total_cash = checking_balance + savings_balance
    return BalanceSummary(
        total_cash=round(total_cash, 2),
        total_debt=round(total_debt, 2),
        net_worth_proxy=round(total_cash - total_debt, 2),
        liquid_cash=round(total_cash, 2),
        checking_balance=round(checking_balance, 2),
        savings_balance=round(savings_balance, 2),
    )


def build_account_summaries(context: UserContext) -> list[AccountSummary]:
    card_lookup = {card.account_id: card for card in context.cards}
    interest_rollups = _interest_charge_rollups_by_account(context)
    items: list[AccountSummary] = []
    for account in context.accounts:
        snapshot = context.snapshots[account.id]
        card = card_lookup.get(account.id)
        interest_rollup = interest_rollups.get(account.id, {"this_month": 0.0, "last_six_months": 0.0})
        balance_value = abs(snapshot.current_balance) if account.account_type == "credit" else snapshot.current_balance
        items.append(
            AccountSummary(
                id=account.id,
                display_name=account.display_name,
                sanitized_name=account.sanitized_name,
                institution_name=account.institution_name,
                account_type=account.account_type,
                subtype=account.subtype,
                current_balance=round(balance_value, 2),
                available_balance=round(abs(snapshot.available_balance) if account.account_type == "credit" else snapshot.available_balance, 2),
                pending_balance=round(snapshot.pending_balance, 2),
                credit_limit=card.credit_limit if card else None,
                minimum_payment=card.minimum_payment if card else None,
                due_date=card.due_date if card else None,
                utilization_estimate=card.estimated_utilization if card else None,
                interest_charged_this_month=interest_rollup["this_month"],
                interest_charged_last_six_months=interest_rollup["last_six_months"],
            )
        )
    return items


def _interest_charge_rollups_by_account(context: UserContext) -> dict[str, dict[str, float]]:
    current_month_start = datetime.combine(REFERENCE_DATE.replace(day=1), datetime.min.time())
    six_month_window_start = datetime.combine(
        (REFERENCE_DATE.replace(day=1) - relativedelta(months=5)),
        datetime.min.time(),
    )
    rollups: dict[str, dict[str, float]] = defaultdict(lambda: {"this_month": 0.0, "last_six_months": 0.0})

    for transaction in context.transactions:
        if not transaction.is_interest_charge:
            continue

        amount = round(abs(transaction.amount), 2)
        if transaction.posted_at >= six_month_window_start:
            rollups[transaction.account_id]["last_six_months"] += amount
        if transaction.posted_at >= current_month_start:
            rollups[transaction.account_id]["this_month"] += amount

    return {
        account_id: {
            "this_month": round(values["this_month"], 2),
            "last_six_months": round(values["last_six_months"], 2),
        }
        for account_id, values in rollups.items()
    }


def monthly_totals(context: UserContext, days: int = 30) -> dict[str, float]:
    recent = trailing_transactions(context.transactions, days)
    totals: dict[str, float] = defaultdict(float)
    for transaction in recent:
        if transaction.is_transfer:
            continue
        totals[transaction.category_key] += transaction.amount
    monthly_income = abs(totals.get("income", 0.0))
    spending = abs(sum(amount for category, amount in totals.items() if category != "income"))
    fixed = abs(sum(amount for category, amount in totals.items() if category in FIXED_CATEGORIES))
    variable = abs(sum(amount for category, amount in totals.items() if category in VARIABLE_CATEGORIES))
    leakage = abs(sum(amount for category, amount in totals.items() if category in LEAKAGE_CATEGORIES))
    discretionary = abs(totals.get("dining", 0.0) + totals.get("entertainment", 0.0) + totals.get("discretionary", 0.0))
    return {
        "monthly_income": round(monthly_income, 2),
        "monthly_spending": round(spending, 2),
        "monthly_fixed": round(fixed, 2),
        "monthly_variable": round(variable, 2),
        "leakage": round(leakage, 2),
        "discretionary": round(discretionary, 2),
    }


def category_breakdown(context: UserContext) -> list[CategorySpend]:
    recent = trailing_transactions(context.transactions, 30)
    trailing_90 = trailing_transactions(context.transactions, 90)
    grouped: dict[str, float] = defaultdict(float)
    baseline_grouped: dict[str, float] = defaultdict(float)

    for transaction in recent:
        if transaction.amount < 0 and not transaction.is_transfer and transaction.category_key not in {"fees", "interest"}:
            grouped[transaction.category_key] += abs(transaction.amount)
    for transaction in trailing_90:
        if transaction.amount < 0 and not transaction.is_transfer and transaction.category_key not in {"fees", "interest"}:
            baseline_grouped[transaction.category_key] += abs(transaction.amount) / 3.0

    total = sum(grouped.values()) or 1.0
    labels = {
        "bills": "Bills",
        "subscriptions": "Subscriptions",
        "groceries": "Groceries",
        "dining": "Dining",
        "transportation": "Transportation",
        "entertainment": "Entertainment",
        "discretionary": "Discretionary",
        "debt_payment": "Debt Payments",
    }
    breakdown = [
        CategorySpend(
            category_key=category,
            label=labels.get(category, category.title()),
            amount=round(amount, 2),
            share=round(amount / total, 4),
            trend_vs_baseline=round(((amount - baseline_grouped.get(category, amount)) / baseline_grouped.get(category, amount)) * 100, 1)
            if baseline_grouped.get(category)
            else None,
        )
        for category, amount in sorted(grouped.items(), key=lambda item: item[1], reverse=True)
    ]
    return breakdown


def upsert_credit_summaries(db: Session, context: UserContext) -> list[CreditCardSummary]:
    existing = {summary.account_id: summary for summary in db.query(CreditCardSummary).filter(CreditCardSummary.user_id == context.user.id).all()}
    summaries: list[CreditCardSummary] = []
    for account in context.accounts:
        if account.account_type != "credit":
            continue
        snapshot = context.snapshots[account.id]
        card_seed = account.details_json or {}
        apr = card_seed.get("apr")
        minimum_payment = card_seed.get("minimum_payment", 45.0)
        limit_value = card_seed.get("limit", abs(snapshot.current_balance) * 2)
        due_day = int(card_seed.get("due_day", 15))
        due_date = REFERENCE_DATE.replace(day=min(due_day, 28))
        if due_date < REFERENCE_DATE:
            due_date = due_date + relativedelta(months=1)
        close_date = due_date - timedelta(days=5)
        utilization = abs(snapshot.current_balance) / limit_value if limit_value else 0.0
        summary = existing.get(account.id)
        payload = dict(
            user_id=context.user.id,
            account_id=account.id,
            credit_limit=round(limit_value, 2),
            statement_balance=abs(snapshot.current_balance),
            current_balance=abs(snapshot.current_balance),
            apr=round(apr or 19.9, 2),
            minimum_payment=round(minimum_payment, 2),
            due_date=due_date,
            estimated_utilization=round(utilization, 4),
            statement_close_date=close_date,
        )
        if summary is None:
            summary = CreditCardSummary(**payload)
            db.add(summary)
        else:
            for key, value in payload.items():
                setattr(summary, key, value)
        summaries.append(summary)
    db.commit()
    return summaries


def ensure_recurring_charges(db: Session, context: UserContext) -> list[RecurringCharge]:
    existing = {charge.merchant_key: charge for charge in db.query(RecurringCharge).filter(RecurringCharge.user_id == context.user.id).all()}
    recurring_map = detect_recurring_from_transactions(context.transactions)
    charges: list[RecurringCharge] = []
    for merchant_key, item in recurring_map.items():
        charge = existing.get(merchant_key)
        payload = dict(
            user_id=context.user.id,
            account_id=item["account_id"],
            merchant_key=merchant_key,
            label=item["label"],
            monthly_amount=item["monthly_amount"],
            cadence="monthly",
            next_expected_at=item["next_expected_at"],
            last_seen_at=item["last_seen_at"],
            confidence=item["confidence"],
            status="active",
        )
        if charge is None:
            charge = RecurringCharge(**payload)
            db.add(charge)
        else:
            for key, value in payload.items():
                setattr(charge, key, value)
        charges.append(charge)
    db.commit()
    return charges


def compute_next_payday(context: UserContext) -> date:
    income_txns = [transaction for transaction in context.transactions if transaction.is_income]
    income_txns.sort(key=lambda item: item.posted_at, reverse=True)
    if len(income_txns) < 2:
        return REFERENCE_DATE + timedelta(days=14)
    cadence_days = max(7, (income_txns[0].posted_at.date() - income_txns[1].posted_at.date()).days)
    next_payday = income_txns[0].posted_at.date() + timedelta(days=cadence_days)
    while next_payday <= REFERENCE_DATE:
        next_payday += timedelta(days=cadence_days)
    return next_payday


def compute_safe_to_spend(context: UserContext) -> SafeToSpendSnapshotSchema:
    balances = latest_balance_summary(context)
    monthly = monthly_totals(context)
    next_payday = compute_next_payday(context)
    days_until_payday = max(1, (next_payday - REFERENCE_DATE).days)

    expected_income_before_payday = 0.0
    for transaction in context.transactions:
        if transaction.is_income and transaction.posted_at.date() > REFERENCE_DATE - timedelta(days=45):
            expected_income_before_payday = max(expected_income_before_payday, transaction.amount)

    upcoming_obligations = 0.0
    for charge in context.recurring:
        if REFERENCE_DATE <= charge.next_expected_at.date() <= next_payday:
            upcoming_obligations += charge.monthly_amount
    for card in context.cards:
        if REFERENCE_DATE <= card.due_date <= next_payday:
            upcoming_obligations += card.minimum_payment

    daily_fixed = monthly["monthly_fixed"] / 30.0
    bills_before_payday = daily_fixed * days_until_payday + upcoming_obligations
    savings_floor = max(150.0, context.user.savings_floor_target or (context.user.monthly_income_estimate * 0.12 if context.user.monthly_income_estimate else 250.0))
    risk_buffer = max(100.0, monthly["monthly_fixed"] * 0.18)
    discretionary_velocity = monthly["discretionary"] / 30.0
    base_capacity = balances.liquid_cash + expected_income_before_payday - bills_before_payday - savings_floor - risk_buffer
    safe_until_payday = round(base_capacity, 2)
    safe_this_week = round(min(base_capacity, max(0.0, base_capacity * (7 / days_until_payday))) - discretionary_velocity * 1.5, 2)
    safe_today = round(safe_this_week / 7.0, 2)

    if safe_until_payday >= discretionary_velocity * days_until_payday:
        status = "safe"
    elif safe_until_payday > 0:
        status = "caution"
    else:
        status = "likely_overspend"

    projected_zero_date = None
    if discretionary_velocity > 0 and safe_until_payday > 0:
        projected_zero_date = REFERENCE_DATE + timedelta(days=int(safe_until_payday / discretionary_velocity))
    elif safe_until_payday <= 0:
        projected_zero_date = REFERENCE_DATE

    if status == "safe":
        guidance = f"You have about ${max(safe_this_week, 0):.0f} left for discretionary spending this week without pressuring near-term bills."
    elif status == "caution":
        guidance = f"Your buffer is getting tighter. At the current pace, discretionary room may run out by {projected_zero_date.strftime('%A')}."
    else:
        guidance = "Preserve cash right now. Current obligations and pace suggest a shortfall before payday."

    return SafeToSpendSnapshotSchema(
        safe_to_spend_today=round(max(safe_today, 0.0), 2),
        safe_to_spend_this_week=round(max(safe_this_week, 0.0), 2),
        safe_to_spend_until_payday=round(max(safe_until_payday, 0.0), 2),
        spending_velocity_status=status,
        projected_zero_date=projected_zero_date,
        guidance_summary=guidance,
        expected_income_before_payday=round(expected_income_before_payday, 2),
        fixed_obligations_before_payday=round(bills_before_payday, 2),
        risk_buffer=round(risk_buffer, 2),
        savings_floor=round(savings_floor, 2),
    )


def compute_financial_health(context: UserContext, safe: SafeToSpendSnapshotSchema) -> FinancialHealthScoreSchema:
    monthly = monthly_totals(context)
    balances = latest_balance_summary(context)
    total_limits = sum(card.credit_limit for card in context.cards) or 1.0
    total_balance = sum(card.current_balance for card in context.cards)
    utilization = total_balance / total_limits
    debt_to_income = total_balance / max(monthly["monthly_income"], 1.0)
    buffer_months = balances.liquid_cash / max(monthly["monthly_fixed"], 1.0)
    payment_stability_penalty = 20.0 if any(abs(transaction.amount) == 35.0 and transaction.is_fee for transaction in trailing_transactions(context.transactions, 90)) else 0.0
    spending_discipline_base = 100.0
    dining_category = next((category for category in category_breakdown(context) if category.category_key == "dining"), None)
    if dining_category and dining_category.trend_vs_baseline and dining_category.trend_vs_baseline > 15:
        spending_discipline_base -= min(35.0, dining_category.trend_vs_baseline * 0.8)
    if safe.spending_velocity_status == "likely_overspend":
        spending_discipline_base -= 25.0

    cash_flow = clamp(50 + (monthly["monthly_income"] - monthly["monthly_spending"]) / max(monthly["monthly_income"], 1.0) * 100)
    debt_score = clamp(100 - debt_to_income * 40)
    utilization_score = clamp(100 - utilization * 100)
    leakage_score = clamp(100 - monthly["leakage"] / max(monthly["monthly_income"], 1.0) * 240)
    buffer_score = clamp(buffer_months * 55)
    spending_discipline = clamp(spending_discipline_base)
    payment_stability = clamp(100 - payment_stability_penalty)

    weighted = (
        cash_flow * 0.20
        + debt_score * 0.20
        + utilization_score * 0.15
        + leakage_score * 0.15
        + buffer_score * 0.15
        + spending_discipline * 0.10
        + payment_stability * 0.05
    )
    subscription_total = sum(charge.monthly_amount for charge in context.recurring if normalize_merchant_key(charge.label) not in {"stonegatepropertymgmt", "psegnewarknj", "verizonwireless", "geicopayment"})
    subscription_efficiency = clamp(100 - (subscription_total / max(monthly["monthly_income"], 1.0) * 300))
    risk_exposure = clamp((safe.safe_to_spend_until_payday / max(monthly["monthly_income"], 1.0) * 100) + utilization_score * 0.4 + buffer_score * 0.4)

    breakdown = HealthBreakdown(
        cash_flow_stability=round(cash_flow, 1),
        debt_burden=round(debt_score, 1),
        utilization_health=round(utilization_score, 1),
        fee_and_interest_leakage=round(leakage_score, 1),
        emergency_buffer_strength=round(buffer_score, 1),
        spending_discipline=round(spending_discipline, 1),
        payment_stability=round(payment_stability, 1),
    )

    drivers: list[str] = []
    if utilization > 0.6:
        drivers.append("High revolving utilization is weighing on your score.")
    if monthly["leakage"] > 50:
        drivers.append("Fees and interest are draining cash that could improve your cushion.")
    if safe.spending_velocity_status != "safe":
        drivers.append("Current spending pace is pressuring near-term cash flexibility.")
    if buffer_months > 1.5:
        drivers.append("Your liquid buffer is helping stabilize the score.")

    return FinancialHealthScoreSchema(
        overall_score=round(weighted, 1),
        cash_flow_score=round(cash_flow, 1),
        debt_score=round(debt_score, 1),
        credit_health_score=round(utilization_score, 1),
        subscription_efficiency_score=round(subscription_efficiency, 1),
        risk_exposure_score=round(risk_exposure, 1),
        factor_breakdown=breakdown,
        drivers=drivers,
    )


def compute_risks(context: UserContext, safe: SafeToSpendSnapshotSchema) -> list[RiskAlertSchema]:
    balances = latest_balance_summary(context)
    monthly = monthly_totals(context)
    risks: list[RiskAlertSchema] = []
    if safe.spending_velocity_status == "likely_overspend" or balances.checking_balance < safe.fixed_obligations_before_payday * 0.35:
        risks.append(
            RiskAlertSchema(
                id=f"risk-{context.user.persona_key}-cash",
                severity="urgent" if safe.spending_velocity_status == "likely_overspend" else "important",
                category="cash_buffer",
                title="Checking buffer looks tight before payday",
                summary="Available cash is narrow relative to expected bills and minimum debt obligations.",
                rationale="The projected buffer before the next paycheck is thin after accounting for upcoming bills, minimums, and subscriptions.",
                affected_account_ids=[account.id for account in context.accounts if account.account_type == "checking"],
                data={"safe_to_spend_until_payday": safe.safe_to_spend_until_payday},
                is_active=True,
            )
        )
    for card in context.cards:
        if card.estimated_utilization >= 0.75:
            risks.append(
                RiskAlertSchema(
                    id=f"risk-{card.account_id}-utilization",
                    severity="important",
                    category="utilization",
                    title="Credit utilization pressure is elevated",
                    summary="One of your cards is carrying a high share of its credit limit.",
                    rationale="High utilization can pressure both flexibility and credit health, especially near statement close.",
                    affected_account_ids=[card.account_id],
                    data={"utilization": round(card.estimated_utilization, 4)},
                    is_active=True,
                )
            )
    if monthly["leakage"] > 70:
        risks.append(
            RiskAlertSchema(
                id=f"risk-{context.user.persona_key}-leakage",
                severity="important",
                category="interest_leakage",
                title="Interest and fees are rising",
                summary="Recent fees and interest charges are meaningfully reducing cash flow.",
                rationale="Leakage from interest or fees is recurring and should be addressed before it compounds further.",
                affected_account_ids=[],
                data={"monthly_leakage": monthly["leakage"]},
                is_active=True,
            )
        )
    dining = next((item for item in category_breakdown(context) if item.category_key == "dining"), None)
    if dining and dining.trend_vs_baseline and dining.trend_vs_baseline > 20:
        risks.append(
            RiskAlertSchema(
                id=f"risk-{context.user.persona_key}-dining",
                severity="informational",
                category="spending_spike",
                title="Dining spend is above recent pattern",
                summary="Recent dining and delivery activity is noticeably above your trailing baseline.",
                rationale="If that pace continues, it will reduce Safe to Spend and month-end flexibility.",
                affected_account_ids=[],
                data={"trend_vs_baseline": dining.trend_vs_baseline},
                is_active=True,
            )
        )
    return risks


def _debt_strategy_sort_key(strategy: str, card: CreditCardSummary):
    if strategy == "avalanche":
        return (-card.apr, -card.current_balance)
    if strategy == "snowball":
        return (card.current_balance, card.apr)
    if strategy == "cash_preserving":
        return (card.due_date, card.minimum_payment)
    return (-card.estimated_utilization, -card.current_balance)


def _simulate_strategy(cards: list[CreditCardSummary], payment_pool: float, strategy: str) -> DebtStrategyCard:
    card_states = [
        {
            "account_id": card.account_id,
            "display_name": card.account_id,
            "balance": card.current_balance,
            "apr": card.apr,
            "minimum": card.minimum_payment,
            "limit": card.credit_limit,
            "utilization": card.estimated_utilization,
            "due_date": card.due_date,
        }
        for card in cards
    ]
    total_interest = 0.0
    months = 0
    while sum(state["balance"] for state in card_states) > 1 and months < 72:
        months += 1
        for state in card_states:
            if state["balance"] <= 0:
                continue
            monthly_rate = (state["apr"] / 100) / 12
            interest = state["balance"] * monthly_rate
            state["balance"] += interest
            total_interest += interest

        remaining_pool = payment_pool
        for state in card_states:
            if state["balance"] <= 0:
                continue
            payment = min(state["balance"], state["minimum"], remaining_pool)
            state["balance"] -= payment
            remaining_pool -= payment

        prioritized = sorted(
            [state for state in card_states if state["balance"] > 0],
            key=lambda state: _debt_strategy_sort_key(
                strategy,
                CreditCardSummary(
                    account_id=state["account_id"],
                    user_id="",
                    credit_limit=state["limit"],
                    statement_balance=state["balance"],
                    current_balance=state["balance"],
                    apr=state["apr"],
                    minimum_payment=state["minimum"],
                    due_date=state["due_date"],
                    estimated_utilization=state["balance"] / max(state["limit"], 1.0),
                    statement_close_date=state["due_date"] - timedelta(days=5),
                ),
            ),
        )
        for state in prioritized:
            if remaining_pool <= 0:
                break
            payment = min(state["balance"], remaining_pool)
            state["balance"] -= payment
            remaining_pool -= payment

    allocations = []
    sorted_cards = sorted(cards, key=lambda card: _debt_strategy_sort_key(strategy, card))
    remaining_pool = payment_pool
    for card in sorted_cards:
        base = min(card.minimum_payment, remaining_pool)
        extra = 0.0
        remaining_pool -= base
        if remaining_pool > 0 and card == sorted_cards[0]:
            extra = remaining_pool
        allocations.append(
            {
                "account_id": card.account_id,
                "suggested_payment": round(base + extra, 2),
                "minimum_payment": round(card.minimum_payment, 2),
                "utilization_estimate": round(card.estimated_utilization, 4),
            }
        )
        if extra:
            remaining_pool = 0.0
    projected_date = REFERENCE_DATE + relativedelta(months=months)
    titles = {
        "avalanche": ("Avalanche", "Highest interest debt first", "This strategy likely saves the most interest."),
        "snowball": ("Snowball", "Smallest balances first", "This strategy creates quicker account wins."),
        "cash_preserving": ("Cash Preserving", "Liquidity and minimum coverage first", "This strategy keeps more cash available."),
        "utilization_improving": ("Utilization Improving", "Largest utilization pressure first", "This strategy may support near-term credit health."),
    }
    title, prioritizes, why_choose_it = titles[strategy]
    tradeoffs_map = {
        "avalanche": "May feel slower if smaller balances stay open longer.",
        "snowball": "Usually costs more interest than Avalanche.",
        "cash_preserving": "Debt payoff is slower because cash protection comes first.",
        "utilization_improving": "It may not minimize total interest cost.",
    }
    liquidity_map = {
        "avalanche": "Moderate cash draw while improving interest leakage.",
        "snowball": "Moderate cash draw with fast visible progress.",
        "cash_preserving": "Lowest near-term cash pressure.",
        "utilization_improving": "Moderate cash draw aimed at statement-balance relief.",
    }
    return DebtStrategyCard(
        strategy=strategy,
        title=title,
        prioritizes=prioritizes,
        why_choose_it=why_choose_it,
        monthly_payment_pool=round(payment_pool, 2),
        projected_payoff_months=months,
        projected_payoff_date=projected_date,
        projected_interest_cost=round(total_interest, 2),
        liquidity_impact=liquidity_map[strategy],
        tradeoffs=tradeoffs_map[strategy],
        suggested_allocations=allocations,
    )


def compute_debt_strategies(context: UserContext, safe: SafeToSpendSnapshotSchema) -> DebtStrategyRunSchema:
    if not context.cards:
        return DebtStrategyRunSchema(
            recommended_strategy="cash_preserving",
            rationale="No active revolving debt is connected.",
            strategies=[],
        )
    monthly_minimums = sum(card.minimum_payment for card in context.cards)
    extra_capacity = max(0.0, min(safe.safe_to_spend_until_payday, latest_balance_summary(context).checking_balance - safe.risk_buffer))
    payment_pool = max(monthly_minimums, monthly_minimums + extra_capacity * 0.55)
    strategy_cards = [_simulate_strategy(context.cards, payment_pool, strategy) for strategy in DEBT_STRATEGIES]
    if safe.spending_velocity_status == "likely_overspend":
        recommended = "cash_preserving"
        rationale = "Cash protection matters most right now because your near-term buffer is under pressure."
    elif any(card.estimated_utilization >= 0.85 for card in context.cards):
        recommended = "utilization_improving"
        rationale = "A targeted payment before statement close would likely relieve the strongest utilization pressure."
    elif sum(card.apr for card in context.cards) / max(len(context.cards), 1) > 22:
        recommended = "avalanche"
        rationale = "Interest leakage is significant enough that the highest-APR balance should be the main target."
    else:
        recommended = "snowball"
        rationale = "Quick account closures are likely achievable without materially increasing short-term risk."
    return DebtStrategyRunSchema(
        recommended_strategy=recommended,
        rationale=rationale,
        strategies=strategy_cards,
    )


def recommended_debt_target(debt: DebtStrategyRunSchema) -> dict[str, Any] | None:
    highest_strategy = next((item for item in debt.strategies if item.strategy == debt.recommended_strategy), None)
    if not highest_strategy or not highest_strategy.suggested_allocations:
        return None
    return highest_strategy.suggested_allocations[0]


def compute_investment_guidance(
    context: UserContext,
    safe: SafeToSpendSnapshotSchema,
    debt: DebtStrategyRunSchema,
) -> InvestmentGuidanceSchema:
    balance = latest_balance_summary(context)
    monthly = monthly_totals(context)
    monthly_surplus = round(max(0.0, monthly["monthly_income"] - monthly["monthly_spending"]), 2)
    fixed_expenses = max(monthly["monthly_fixed"], 1.0)
    liquid_buffer_months = round(balance.liquid_cash / fixed_expenses, 2)
    max_apr = max((card.apr for card in context.cards), default=None)
    top_debt_target = recommended_debt_target(debt)

    if (
        safe.spending_velocity_status != "safe"
        or safe.safe_to_spend_until_payday < safe.risk_buffer * 0.75
        or monthly_surplus < 100
    ):
        buffer_amount = round(max(0.0, min(monthly_surplus * 0.35, max(125.0, safe.risk_buffer * 0.4))), 2)
        return InvestmentGuidanceSchema(
            posture="buffer_first",
            title="Hold new investing until the cash buffer is steadier",
            summary="Near-term cash pressure is still high enough that starting an investment contribution would reduce flexibility.",
            rationale="The current runway to payday is narrow relative to the risk buffer, so new dollars should stay liquid before they go into market exposure.",
            recommended_investment_amount=0.0,
            priority_action_amount=buffer_amount,
            priority_destination="Cash reserve",
            investment_channel="Not ready for market investing yet",
            cadence="monthly",
            monthly_surplus=monthly_surplus,
            fee_and_interest_leakage=monthly["leakage"],
            max_apr=round(max_apr, 1) if max_apr is not None else None,
            liquid_buffer_months=liquid_buffer_months,
            why_now="Investment contributions should wait until the next-payday cushion is less fragile.",
            assumptions=[
                "Current bill cadence and income timing remain stable.",
                "Liquid cash is the first source of protection for near-term surprises.",
            ],
        )

    if (max_apr is not None and max_apr >= 24) or monthly["leakage"] >= 45:
        debt_amount = round(
            max(
                0.0,
                top_debt_target["suggested_payment"] if top_debt_target else min(monthly_surplus * 0.55, max(monthly["leakage"] * 4, 150.0)),
            ),
            2,
        )
        return InvestmentGuidanceSchema(
            posture="debt_first",
            title="Debt payoff outranks investing right now",
            summary="The current interest drag is high enough that paying down debt is the stronger guaranteed return.",
            rationale="When a card APR is materially above realistic low-risk investing outcomes, reducing that balance is the cleaner use of surplus cash.",
            recommended_investment_amount=0.0,
            priority_action_amount=debt_amount,
            priority_destination="Debt paydown",
            investment_channel="Redirect surplus to the highest-impact card first",
            cadence="this_cycle",
            monthly_surplus=monthly_surplus,
            fee_and_interest_leakage=monthly["leakage"],
            max_apr=round(max_apr, 1) if max_apr is not None else None,
            liquid_buffer_months=liquid_buffer_months,
            why_now="The current APR and interest leakage are a stronger guaranteed drag than a new investment contribution can reliably overcome.",
            assumptions=[
                "Seeded APRs are representative of the active revolving balances.",
                "Minimum payments are already covered before extra dollars are allocated.",
            ],
        )

    if liquid_buffer_months < 1.5:
        reserve_amount = round(max(0.0, min(monthly_surplus * 0.4, monthly["monthly_fixed"] * 0.25)), 2)
        return InvestmentGuidanceSchema(
            posture="buffer_first",
            title="Build a deeper liquid reserve before investing",
            summary="You have some surplus, but the liquid buffer is still thin for starting a durable investment habit.",
            rationale="A modest reserve makes future investing more stable because it reduces the odds of needing to sell or pause contributions during the next squeeze.",
            recommended_investment_amount=0.0,
            priority_action_amount=reserve_amount,
            priority_destination="Cash reserve",
            investment_channel="High-yield cash reserve first",
            cadence="monthly",
            monthly_surplus=monthly_surplus,
            fee_and_interest_leakage=monthly["leakage"],
            max_apr=round(max_apr, 1) if max_apr is not None else None,
            liquid_buffer_months=liquid_buffer_months,
            why_now="The current surplus is real, but the reserve cushion is still more valuable than immediate market exposure.",
            assumptions=[
                "Fixed monthly obligations remain near the recent 30-day level.",
                "Liquid reserves should come before long-term investing when the cash cushion is under roughly six weeks.",
            ],
        )

    investment_amount = round(max(50.0, min(monthly_surplus * 0.3, safe.safe_to_spend_this_week * 1.8)), 2)
    return InvestmentGuidanceSchema(
        posture="invest_now",
        title="Start a steady investment contribution",
        summary="Current cash flow, buffer strength, and debt pressure support a modest recurring contribution.",
        rationale="There is positive surplus after current obligations, interest leakage is contained, and the liquid buffer is strong enough to support long-term investing.",
        recommended_investment_amount=investment_amount,
        priority_action_amount=investment_amount,
        priority_destination="Diversified index fund",
        investment_channel="Broad-market index fund",
        cadence="monthly",
        monthly_surplus=monthly_surplus,
        fee_and_interest_leakage=monthly["leakage"],
        max_apr=round(max_apr, 1) if max_apr is not None else None,
        liquid_buffer_months=liquid_buffer_months,
        why_now="This is the point where a steady contribution can grow without materially weakening near-term flexibility.",
        assumptions=[
            "Surplus cash is stable enough to repeat monthly.",
            "Existing debt pressure is low enough that investing is no longer clearly dominated by debt payoff.",
        ],
    )


def _recommendation_priority(urgency: float, impact: float, risk_reduction: float, feasibility: float, context_fit: float, *, boost: float = 0.0) -> float:
    return round((0.30 * urgency + 0.25 * impact + 0.20 * risk_reduction + 0.15 * feasibility + 0.10 * context_fit) + boost, 3)


def compute_recommendations(
    context: UserContext,
    safe: SafeToSpendSnapshotSchema,
    health: FinancialHealthScoreSchema,
    risks: list[RiskAlertSchema],
    debt: DebtStrategyRunSchema,
    investment: InvestmentGuidanceSchema | None = None,
) -> list[RecommendationSchema]:
    monthly = monthly_totals(context)
    categories = category_breakdown(context)
    recommendations: list[RecommendationSchema] = []
    created_at = datetime.combine(REFERENCE_DATE, datetime.min.time())

    if safe.spending_velocity_status != "safe":
        recommendations.append(
            RecommendationSchema(
                id=f"rec-{context.user.persona_key}-cash-protect",
                title="Preserve cash until the next paycheck",
                summary="Your checking balance is tight relative to bills and minimum debt obligations.",
                rationale="Safe to Spend is limited after upcoming obligations and the current discretionary pace are factored in.",
                impact_estimate=f"Protects roughly ${safe.risk_buffer:.0f} of buffer.",
                urgency="urgent",
                confidence=0.92,
                category="cash_flow",
                affected_accounts=[account.id for account in context.accounts if account.account_type == "checking"],
                suggested_action_amount=None,
                why_now="Projected cash flexibility is narrow before the next payday.",
                assumptions=["Upcoming bills and minimums post on schedule.", "Income cadence remains consistent."],
                created_at=created_at,
                priority_score=_recommendation_priority(95, 82, 90, 78, 94, boost=0.04),
            )
        )
    highest_strategy = next((item for item in debt.strategies if item.strategy == debt.recommended_strategy), None)
    top_target = recommended_debt_target(debt)
    if highest_strategy and top_target:
        recommendations.append(
            RecommendationSchema(
                id=f"rec-{context.user.persona_key}-debt-target",
                title="Target one card instead of spreading extra payments",
                summary="A concentrated payment would likely improve debt efficiency more than splitting extra cash evenly.",
                rationale=debt.rationale,
                impact_estimate=f"{highest_strategy.title} projects payoff in about {highest_strategy.projected_payoff_months} months.",
                urgency="important",
                confidence=0.88,
                category="debt_optimizer",
                affected_accounts=[top_target["account_id"]],
                suggested_action_amount=top_target["suggested_payment"],
                why_now="Current balances and utilization make payment order matter this cycle.",
                assumptions=["APR and credit-limit seed data are representative.", "You can cover minimums on every card first."],
                created_at=created_at,
                priority_score=_recommendation_priority(80, 88, 86, 76, 85, boost=0.03),
            )
        )

    subscription_total = sum(charge.monthly_amount for charge in context.recurring if charge.monthly_amount < 60 and "Property" not in charge.label)
    if len(context.recurring) >= 4 or subscription_total > 50:
        count = len([charge for charge in context.recurring if charge.monthly_amount < 60])
        recommendations.append(
            RecommendationSchema(
                id=f"rec-{context.user.persona_key}-subscriptions",
                title="Review recurring subscriptions this week",
                summary=f"You have {count} recurring services that appear discretionary.",
                rationale="Reducing low-value recurring charges is one of the fastest ways to improve monthly flexibility without changing fixed essentials.",
                impact_estimate=f"Potential monthly relief of about ${subscription_total:.0f}.",
                urgency="important",
                confidence=0.85,
                category="subscriptions",
                affected_accounts=[charge.account_id for charge in context.recurring[:3]],
                suggested_action_amount=round(subscription_total, 2),
                why_now="Recurring charges keep compounding each billing cycle.",
                assumptions=["Recurring detection is based on at least three recent matches.", "Not every subscription is necessarily wasteful."],
                created_at=created_at,
                priority_score=_recommendation_priority(70, 72, 68, 84, 79),
            )
        )

    dining = next((item for item in categories if item.category_key == "dining"), None)
    if dining and dining.trend_vs_baseline and dining.trend_vs_baseline > 18:
        trim_amount = max(20.0, dining.amount * 0.18)
        recommendations.append(
            RecommendationSchema(
                id=f"rec-{context.user.persona_key}-dining",
                title="Pull dining spend back toward your recent baseline",
                summary="Dining and delivery are running above your three-month pattern.",
                rationale="A short adjustment here improves Safe to Spend without affecting core bills or debt minimums.",
                impact_estimate=f"Cutting back by about ${trim_amount:.0f} this month would improve month-end flexibility.",
                urgency="routine",
                confidence=0.79,
                category="spending",
                affected_accounts=[],
                suggested_action_amount=round(trim_amount, 2),
                why_now="Recent dining activity is one of the clearest current drags on discretionary room.",
                assumptions=["Trailing 90-day spend is a reasonable baseline.", "This category remains discretionary for the user."],
                created_at=created_at,
                priority_score=_recommendation_priority(60, 58, 52, 82, 68),
            )
        )

    if monthly["leakage"] > 40:
        recommendations.append(
            RecommendationSchema(
                id=f"rec-{context.user.persona_key}-leakage",
                title="Reduce fee and interest leakage",
                summary="Recent fees or interest charges are meaningfully reducing monthly cash flow.",
                rationale="Leakage is one of the cleanest opportunities to improve both financial health and near-term flexibility.",
                impact_estimate=f"Recent leakage totals about ${monthly['leakage']:.0f} this month.",
                urgency="important",
                confidence=0.86,
                category="financial_health",
                affected_accounts=[],
                suggested_action_amount=round(monthly["leakage"], 2),
                why_now="Leakage repeats every cycle if payment order and buffer habits stay unchanged.",
                assumptions=["Recent charges are representative of the current cycle.", "No promotional APR offsets are present."],
                created_at=created_at,
                priority_score=_recommendation_priority(74, 78, 80, 70, 76, boost=0.02),
            )
        )

    if investment and investment.posture == "invest_now" and investment.recommended_investment_amount > 0:
        recommendations.append(
            RecommendationSchema(
                id=f"rec-{context.user.persona_key}-invest",
                title="Start a steady investment contribution",
                summary=investment.summary,
                rationale=investment.rationale,
                impact_estimate=f"Start with about ${investment.recommended_investment_amount:.0f} per month into a diversified channel.",
                urgency="routine",
                confidence=0.76,
                category="investment",
                affected_accounts=[],
                suggested_action_amount=investment.recommended_investment_amount,
                why_now=investment.why_now,
                assumptions=investment.assumptions,
                created_at=created_at,
                priority_score=_recommendation_priority(56, 64, 52, 74, 72),
            )
        )

    recommendations.sort(key=lambda item: item.priority_score, reverse=True)
    return recommendations[:5]


def build_cash_flow_response(context: UserContext, safe: SafeToSpendSnapshotSchema) -> CashFlowResponse:
    monthly = monthly_totals(context)
    balances = latest_balance_summary(context)
    categories = category_breakdown(context)
    monthly_series = []
    for offset in range(5, -1, -1):
        month_start = REFERENCE_DATE.replace(day=1) - relativedelta(months=offset)
        month_end = month_start + relativedelta(months=1)
        income = 0.0
        spend = 0.0
        for transaction in context.transactions:
            if month_start <= transaction.posted_at.date() < month_end and not transaction.is_transfer:
                if transaction.is_income:
                    income += transaction.amount
                elif transaction.amount < 0:
                    spend += abs(transaction.amount)
        monthly_series.append(
            {
                "month": month_start.strftime("%b"),
                "income": round(income, 2),
                "spending": round(spend, 2),
                "net": round(income - spend, 2),
            }
        )
    forecasted_balance = balances.checking_balance + monthly["monthly_income"] - monthly["monthly_spending"]
    return CashFlowResponse(
        monthly_income=monthly["monthly_income"],
        monthly_spending=monthly["monthly_spending"],
        monthly_fixed_expenses=monthly["monthly_fixed"],
        monthly_variable_expenses=monthly["monthly_variable"],
        discretionary_spending=monthly["discretionary"],
        forecasted_month_end_balance=round(forecasted_balance, 2),
        paycheck_to_paycheck_view={
            "next_payday": compute_next_payday(context).isoformat(),
            "cash_buffer_before_payday": round(safe.safe_to_spend_until_payday, 2),
            "commentary": "This view separates committed obligations from flexible spending before the next paycheck.",
        },
        spending_velocity={
            "daily_discretionary_pace": round(monthly["discretionary"] / 30.0, 2),
            "status": safe.spending_velocity_status,
            "projected_zero_date": safe.projected_zero_date.isoformat() if safe.projected_zero_date else None,
        },
        category_breakdown=categories,
        monthly_series=monthly_series,
    )


def build_credit_summary(context: UserContext) -> CreditSummaryResponse:
    total_limits = sum(card.credit_limit for card in context.cards) or 1.0
    utilization = sum(card.current_balance for card in context.cards) / total_limits
    interest_rollups = _interest_charge_rollups_by_account(context)
    if utilization >= 0.8:
        trend = "Under pressure"
    elif utilization >= 0.45:
        trend = "Manageable but elevated"
    else:
        trend = "Relatively stable"
    cards = [
        AccountSummary(
            id=account.id,
            display_name=account.display_name,
            sanitized_name=account.sanitized_name,
            institution_name=account.institution_name,
            account_type=account.account_type,
            subtype=account.subtype,
            current_balance=round(abs(context.snapshots[account.id].current_balance), 2),
            available_balance=round(abs(context.snapshots[account.id].available_balance), 2),
            pending_balance=round(context.snapshots[account.id].pending_balance, 2),
            credit_limit=card.credit_limit,
            minimum_payment=card.minimum_payment,
            due_date=card.due_date,
            utilization_estimate=card.estimated_utilization,
            interest_charged_this_month=interest_rollups.get(account.id, {}).get("this_month", 0.0),
            interest_charged_last_six_months=interest_rollups.get(account.id, {}).get("last_six_months", 0.0),
        )
        for account in context.accounts
        for card in context.cards
        if card.account_id == account.id
    ]
    suggestions = []
    if utilization > 0.7:
        suggestions.append("A targeted payment before statement close would likely reduce utilization pressure fastest.")
    if any(card.minimum_payment > 0 and card.due_date <= REFERENCE_DATE + timedelta(days=7) for card in context.cards):
        suggestions.append("Keep minimums current first to protect payment stability.")
    if not suggestions:
        suggestions.append("Current utilization looks relatively controlled. Focus on keeping balances low before statement close.")
    return CreditSummaryResponse(
        current_score=context.user.credit_score,
        score_available=context.user.credit_score is not None,
        trend_label=trend,
        utilization_pressure=round(utilization, 4),
        payment_behavior="Payments appear current in recent seeded history.",
        actionable_suggestions=suggestions,
        cards=cards,
    )


def build_subscription_summaries(context: UserContext) -> list[SubscriptionSummary]:
    excluded_merchants = {
        "stonegatepropertymgmt",
        "psegnewarknj",
        "verizonwireless",
        "geicopayment",
    }
    summaries: list[SubscriptionSummary] = []
    for charge in sorted(context.recurring, key=lambda item: item.monthly_amount, reverse=True):
        if charge.merchant_key in excluded_merchants:
            continue
        waste_risk = "review"
        if charge.monthly_amount >= 25:
            waste_risk = "high"
        elif charge.monthly_amount <= 12:
            waste_risk = "low"
        summaries.append(
            SubscriptionSummary(
                id=charge.id,
                merchant_key=charge.merchant_key,
                label=charge.label,
                monthly_amount=charge.monthly_amount,
                next_expected_at=charge.next_expected_at,
                confidence=charge.confidence,
                waste_risk=waste_risk,
                action_status="ready_for_review",
            )
        )
    return summaries


def build_monthly_review(context: UserContext, health: FinancialHealthScoreSchema, safe: SafeToSpendSnapshotSchema) -> MonthlyReviewSchema:
    monthly = monthly_totals(context)
    improved: list[str] = []
    worsened: list[str] = []
    if health.overall_score >= 70:
        improved.append("Overall financial health is holding in a stable range.")
    if safe.spending_velocity_status == "safe":
        improved.append("Discretionary pace is not currently threatening upcoming obligations.")
    else:
        worsened.append("Near-term buffer is under pressure before the next paycheck.")
    if monthly["leakage"] > 50:
        worsened.append("Fees and interest remain a notable drain.")
    recommendations = [
        "Protect minimum payments and key bills first.",
        "Use Safe to Spend as the week-to-week spending guide.",
        "Review the top recurring charges before the next billing cycle.",
    ]
    summary = "This month shows where cash pressure is building and which actions would stabilize the next cycle fastest."
    debt_progress = "Revolving balances are declining slowly." if context.cards else "No revolving debt was connected."
    return MonthlyReviewSchema(
        month_start=REFERENCE_DATE.replace(day=1),
        summary=summary,
        improved=improved,
        worsened=worsened,
        total_spending=monthly["monthly_spending"],
        income=monthly["monthly_income"],
        debt_progress=debt_progress,
        fees_and_interest_paid=monthly["leakage"],
        next_month_actions=recommendations,
    )


def persist_pipeline(db: Session, persona_id: str) -> None:
    context = fetch_user_context(db, persona_id)
    context.cards = upsert_credit_summaries(db, context)
    context.recurring = ensure_recurring_charges(db, context)
    safe = compute_safe_to_spend(context)
    health = compute_financial_health(context, safe)
    risks = compute_risks(context, safe)
    debt = compute_debt_strategies(context, safe)
    investment = compute_investment_guidance(context, safe, debt)
    recommendations = compute_recommendations(context, safe, health, risks, debt, investment)
    review = build_monthly_review(context, health, safe)
    sanitization = SanitizationService(db)
    recommendation_ids = [
        recommendation_id
        for (recommendation_id,) in db.query(Recommendation.id)
        .filter(Recommendation.user_id == context.user.id)
        .all()
    ]

    db.query(FinancialHealthScore).filter(FinancialHealthScore.user_id == context.user.id).delete()
    db.query(RiskAlert).filter(RiskAlert.user_id == context.user.id).delete()
    if recommendation_ids:
        db.query(RecommendationHistory).filter(RecommendationHistory.recommendation_id.in_(recommendation_ids)).delete(
            synchronize_session=False
        )
    db.query(RecommendationHistory).filter(RecommendationHistory.user_id == context.user.id).delete(synchronize_session=False)
    db.query(Recommendation).filter(Recommendation.user_id == context.user.id).delete()
    db.query(SafeToSpendSnapshot).filter(SafeToSpendSnapshot.user_id == context.user.id).delete()
    db.query(DebtStrategyRun).filter(DebtStrategyRun.user_id == context.user.id).delete()
    db.query(MonthlyReview).filter(MonthlyReview.user_id == context.user.id).delete()
    db.query(AgentRun).filter(AgentRun.user_id == context.user.id).delete()
    db.query(SyncRun).filter(SyncRun.user_id == context.user.id).delete()
    db.commit()

    db.add(
        FinancialHealthScore(
            user_id=context.user.id,
            computed_at=datetime.utcnow(),
            overall_score=health.overall_score,
            cash_flow_score=health.cash_flow_score,
            debt_score=health.debt_score,
            credit_health_score=health.credit_health_score,
            subscription_efficiency_score=health.subscription_efficiency_score,
            risk_exposure_score=health.risk_exposure_score,
            factor_breakdown=health.factor_breakdown.model_dump(),
        )
    )

    for risk in risks:
        db.add(
            RiskAlert(
                user_id=context.user.id,
                created_at=datetime.utcnow(),
                severity=risk.severity,
                category=risk.category,
                title=risk.title,
                summary=risk.summary,
                rationale=risk.rationale,
                affected_account_ids=risk.affected_account_ids,
                data=risk.data,
                is_active=risk.is_active,
            )
        )

    for item in recommendations:
        recommendation = Recommendation(
            user_id=context.user.id,
            created_at=item.created_at,
            category=item.category,
            title=item.title,
            summary=item.summary,
            rationale=item.rationale,
            impact_estimate=item.impact_estimate,
            urgency=item.urgency,
            confidence=item.confidence,
            priority_score=item.priority_score,
            affected_accounts=item.affected_accounts,
            suggested_action_amount=item.suggested_action_amount,
            why_now=item.why_now,
            assumptions=item.assumptions,
        )
        db.add(recommendation)
        db.flush()
        db.add(
            RecommendationHistory(
                recommendation_id=recommendation.id,
                user_id=context.user.id,
                created_at=datetime.utcnow(),
                snapshot=item.model_dump(mode="json"),
            )
        )

    db.add(
        SafeToSpendSnapshot(
            user_id=context.user.id,
            computed_at=datetime.utcnow(),
            safe_to_spend_today=safe.safe_to_spend_today,
            safe_to_spend_this_week=safe.safe_to_spend_this_week,
            safe_to_spend_until_payday=safe.safe_to_spend_until_payday,
            spending_velocity_status=safe.spending_velocity_status,
            projected_zero_date=safe.projected_zero_date,
            guidance_summary=safe.guidance_summary,
            inputs_json=safe.model_dump(mode="json"),
        )
    )

    db.add(
        DebtStrategyRun(
            user_id=context.user.id,
            computed_at=datetime.utcnow(),
            recommended_strategy=debt.recommended_strategy,
            results_json=debt.model_dump(mode="json"),
        )
    )

    db.add(
        MonthlyReview(
            user_id=context.user.id,
            month_start=review.month_start,
            summary_json=review.model_dump(mode="json"),
        )
    )

    db.add(
        PrivacyPolicyLog(
            user_id=context.user.id,
            policy_version="2026-03-28",
            consent_mode="restricted_external_llm",
            logged_at=datetime.utcnow(),
            details_json={
                "read_only_access": True,
                "sanitized_external_ai": True,
                "deterministic_finance_logic": True,
            },
        )
    )

    db.add(
        SyncRun(
            user_id=context.user.id,
            run_type="seed_refresh",
            status="completed",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            summary_json={"transactions": len(context.transactions), "accounts": len(context.accounts)},
        )
    )
    db.commit()

    recent_transactions = context.transactions[:20]
    account_lookup = {account.id: account for account in context.accounts}
    sanitized_transactions = [
        sanitization.sanitize_transaction(transaction, account_lookup[transaction.account_id]).model_dump(mode="json")
        for transaction in recent_transactions
    ]
    sanitized_accounts = []
    for account in context.accounts:
        snapshot = context.snapshots[account.id]
        card = next((item for item in context.cards if item.account_id == account.id), None)
        sanitized_accounts.append(
            sanitization.sanitize_account_summary(
                account,
                snapshot,
                utilization_estimate=card.estimated_utilization if card else None,
                minimum_payment=card.minimum_payment if card else None,
                upcoming_due_date=card.due_date if card else None,
            ).model_dump(mode="json")
        )

    sanitized_context = sanitization.build_recommendation_context(
        persona_id=persona_id,
        health_score=health.overall_score,
        safe_to_spend_this_week=safe.safe_to_spend_this_week,
        active_risks=[risk.title for risk in risks],
        top_categories=[item.model_dump() for item in category_breakdown(context)[:5]],
        debt_summary=[strategy.model_dump() for strategy in debt.strategies],
        subscriptions=[item.model_dump(mode="json") for item in build_subscription_summaries(context)],
        assumptions=[
            "Structured finance metrics are computed before any language generation.",
            "External LLM mode is disabled by default in this MVP.",
        ],
    ).model_dump(mode="json")
    sanitization.store_sanitized_view(context.user.id, "recommendation_context", f"user:{context.user.id}", sanitized_context)
    sanitization.audit_payload(context.user.id, "explanation_agent", sanitized_context)

    agent_payloads = [
        ("data_ingestion", {"transactions_ingested": len(context.transactions), "accounts": len(context.accounts)}),
        ("categorization", {"category_counts": {item.category_key: item.amount for item in category_breakdown(context)}}),
        ("financial_analysis", {"health_score": health.overall_score, "monthly": monthly_totals(context)}),
        ("risk_detection", {"risks": [risk.model_dump() for risk in risks]}),
        ("safe_to_spend", safe.model_dump(mode="json")),
        ("debt_strategy", debt.model_dump(mode="json")),
        ("recommendation", {"recommendations": [item.model_dump(mode="json") for item in recommendations]}),
        ("explanation", {"sanitized_context": sanitized_context}),
        ("notification", {"risks": [risk.title for risk in risks], "recommendations": [item.title for item in recommendations[:3]]}),
    ]
    for agent_name, output_payload in agent_payloads:
        input_json = {"sanitized_transactions": sanitized_transactions, "sanitized_accounts": sanitized_accounts}
        db.add(
            AgentRun(
                user_id=context.user.id,
                agent_name=agent_name,
                status="completed",
                created_at=datetime.utcnow(),
                input_json=input_json,
                output_json=output_payload,
                assumptions_json=["Sanitized payload only.", "Seeded deterministic scenario."],
            )
        )
    db.commit()


def latest_stored_health(db: Session, user_id: str) -> FinancialHealthScoreSchema:
    row = (
        db.query(FinancialHealthScore)
        .filter(FinancialHealthScore.user_id == user_id)
        .order_by(FinancialHealthScore.computed_at.desc())
        .first()
    )
    if not row:
        raise ValueError("Financial health not found")
    factor_breakdown = HealthBreakdown(**row.factor_breakdown)
    return FinancialHealthScoreSchema(
        overall_score=row.overall_score,
        cash_flow_score=row.cash_flow_score,
        debt_score=row.debt_score,
        credit_health_score=row.credit_health_score,
        subscription_efficiency_score=row.subscription_efficiency_score,
        risk_exposure_score=row.risk_exposure_score,
        factor_breakdown=factor_breakdown,
        drivers=[],
    )


def build_dashboard_response(db: Session, persona_id: str) -> DashboardResponse:
    context = fetch_user_context(db, persona_id)
    balance = latest_balance_summary(context)
    safe = compute_safe_to_spend(context)
    health = compute_financial_health(context, safe)
    risks = compute_risks(context, safe)
    debt = compute_debt_strategies(context, safe)
    investment_guidance = compute_investment_guidance(context, safe, debt)
    recommendations = compute_recommendations(context, safe, health, risks, debt, investment_guidance)
    monthly = monthly_totals(context)
    return DashboardResponse(
        persona_id=persona_id,
        persona_name=context.user.full_name,
        archetype=context.user.archetype,
        balance_summary=balance,
        financial_health=health,
        safe_to_spend=safe,
        investment_guidance=investment_guidance,
        top_recommendations=recommendations[:3],
        risks=risks[:3],
        spend_by_category=category_breakdown(context)[:6],
        subscriptions_total=round(sum(item.monthly_amount for item in build_subscription_summaries(context)), 2),
        fee_and_interest_leakage=monthly["leakage"],
        net_monthly_cash_flow=round(monthly["monthly_income"] - monthly["monthly_spending"], 2),
    )


def run_simulation(db: Session, persona_id: str, payload: dict[str, Any]) -> SimulationResultSchema:
    context = fetch_user_context(db, persona_id)
    safe = compute_safe_to_spend(context)
    health = compute_financial_health(context, safe)
    monthly = monthly_totals(context)
    current_state = {
        "monthly_surplus": round(monthly["monthly_income"] - monthly["monthly_spending"], 2),
        "safe_to_spend_this_week": safe.safe_to_spend_this_week,
        "liquid_cash": latest_balance_summary(context).liquid_cash,
        "health_score": health.overall_score,
    }
    simulated = dict(current_state)
    assumptions = [
        "Trailing 90-day spend pattern is used as the baseline.",
        "Known recurring bills continue at the recent level unless explicitly changed.",
    ]
    warnings: list[str] = []
    facts: list[str] = []
    estimates: list[str] = []

    scenario_type = payload["scenario_type"]
    amount = float(payload.get("amount") or 0.0)
    if scenario_type == "new_monthly_expense":
        simulated["monthly_surplus"] = round(simulated["monthly_surplus"] - amount, 2)
        simulated["safe_to_spend_this_week"] = round(max(0.0, simulated["safe_to_spend_this_week"] - amount / 4.3), 2)
        estimates.append(f"A new monthly obligation of ${amount:.0f} reduces projected monthly surplus by the same amount.")
    elif scenario_type == "extra_debt_payment":
        simulated["liquid_cash"] = round(simulated["liquid_cash"] - amount, 2)
        simulated["safe_to_spend_this_week"] = round(max(0.0, simulated["safe_to_spend_this_week"] - amount * 0.35), 2)
        simulated["health_score"] = round(min(100.0, simulated["health_score"] + amount / 120), 1)
        estimates.append(f"An extra debt payment of ${amount:.0f} likely improves interest and utilization metrics.")
    elif scenario_type == "cancel_subscriptions":
        recurring_total = 0.0
        for sub_id in payload.get("subscription_ids", []):
            charge = next((charge for charge in context.recurring if charge.id == sub_id), None)
            if charge:
                recurring_total += charge.monthly_amount
        simulated["monthly_surplus"] = round(simulated["monthly_surplus"] + recurring_total, 2)
        simulated["safe_to_spend_this_week"] = round(simulated["safe_to_spend_this_week"] + recurring_total / 4.3, 2)
        facts.append(f"Selected recurring charges total about ${recurring_total:.0f} per month.")
    elif scenario_type == "reduce_category_spend":
        simulated["monthly_surplus"] = round(simulated["monthly_surplus"] + amount, 2)
        simulated["safe_to_spend_this_week"] = round(simulated["safe_to_spend_this_week"] + amount / 4.3, 2)
        estimates.append(f"Reducing {payload.get('category_key', 'discretionary')} by ${amount:.0f} per month improves available flexibility.")
    elif scenario_type == "move_to_savings":
        simulated["liquid_cash"] = round(simulated["liquid_cash"] - amount, 2)
        simulated["safe_to_spend_this_week"] = round(max(0.0, simulated["safe_to_spend_this_week"] - amount * 0.2), 2)
        warnings.append("Moving cash to savings strengthens reserves but weakens immediate liquidity.")

    deltas = {key: round(simulated[key] - current_state[key], 2) if isinstance(simulated[key], (int, float)) else simulated[key] for key in simulated}
    if simulated["monthly_surplus"] >= 250 and simulated["safe_to_spend_this_week"] >= 90:
        comfort = "comfortable"
        summary = "This appears manageable based on current income and spending patterns."
    elif simulated["monthly_surplus"] >= 0:
        comfort = "tight"
        summary = "This appears possible, but it would leave a thinner monthly cushion."
    else:
        comfort = "risky"
        summary = "This scenario would likely create cash pressure unless another expense is reduced."
    if simulated["safe_to_spend_this_week"] < current_state["safe_to_spend_this_week"] * 0.5:
        warnings.append("Weekly discretionary flexibility would fall materially.")
    scenario = SimulationScenario(
        user_id=context.user.id,
        name=payload["name"],
        scenario_type=scenario_type,
        inputs_json=payload,
        created_at=datetime.utcnow(),
    )
    db.add(scenario)
    db.flush()
    result = SimulationResultSchema(
        scenario_id=scenario.id,
        summary=summary,
        comfort_level=comfort,
        facts=facts,
        estimates=estimates,
        warnings=warnings,
        assumptions=assumptions,
        current_state=current_state,
        simulated_state=simulated,
        deltas=deltas,
    )
    db.add(
        SimulationResult(
            scenario_id=scenario.id,
            created_at=datetime.utcnow(),
            summary_json=result.model_dump(mode="json"),
        )
    )
    db.commit()
    return result
