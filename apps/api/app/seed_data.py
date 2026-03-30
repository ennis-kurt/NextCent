from __future__ import annotations

import json
import random
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from .config import settings
from .models import (
    AccountBalanceSnapshot,
    ConnectedAccount,
    CreditCardSummary,
    MerchantActionMetadata,
    RecurringCharge,
    Transaction,
    TransactionCategory,
    User,
)


REFERENCE_DATE = date(2026, 3, 28)


CATEGORY_DEFINITIONS = [
    ("income", "Income", "cashflow", "Paychecks and other income deposits."),
    ("bills", "Bills", "fixed", "Rent, utilities, insurance, and similar obligations."),
    ("debt_payment", "Debt Payments", "debt", "Payments sent to revolving debt accounts."),
    ("subscriptions", "Subscriptions", "fixed", "Recurring subscription services."),
    ("discretionary", "Discretionary", "variable", "Flexible spending not tied to essentials."),
    ("groceries", "Groceries", "variable", "Grocery and household essentials."),
    ("dining", "Dining", "variable", "Restaurants, takeout, and delivery."),
    ("entertainment", "Entertainment", "variable", "Streaming, events, and leisure."),
    ("transportation", "Transportation", "variable", "Transit, gas, rideshare, and commuting."),
    ("fees", "Fees", "leakage", "Overdraft, service, and penalty fees."),
    ("interest", "Interest", "leakage", "Interest charges on revolving debt."),
    ("transfers", "Transfers", "neutral", "Transfers between the user's own accounts."),
    ("savings", "Savings", "neutral", "Transfers into savings or buffer accounts."),
]


def load_json(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text())


def normalize_merchant_key(label: str) -> str:
    return "".join(ch for ch in label.lower() if ch.isalnum())


def standardize_merchant_name(raw: str) -> str:
    cleaned = raw.split("  ")[0].replace(" PAYMENT THANK YOU", "").strip()
    tokens = [token for token in cleaned.split() if not token.isdigit()]
    return " ".join(tokens[:3]) if tokens else cleaned


def account_alias(account_type: str, index: int) -> str:
    if account_type == "credit":
        return f"Credit Card Account {chr(64 + index)}"
    if account_type == "checking":
        return f"Checking Account {chr(64 + index)}"
    return f"Savings Account {chr(64 + index)}"


def create_categories(db: Session) -> None:
    if db.query(TransactionCategory).count():
        return
    for key, label, group_key, description in CATEGORY_DEFINITIONS:
        db.add(
            TransactionCategory(
                key=key,
                label=label,
                group_key=group_key,
                description=description,
            )
        )
    db.commit()


def create_merchant_actions(db: Session) -> None:
    if db.query(MerchantActionMetadata).count():
        return
    for row in load_json(settings.merchant_actions_path):
        db.add(MerchantActionMetadata(**row))
    db.commit()


def _transaction(
    user_id: str,
    account_id: str,
    dt: datetime,
    amount: float,
    merchant: str,
    description: str,
    category_key: str,
    *,
    pending: bool = False,
    is_transfer: bool = False,
    is_subscription: bool = False,
    is_interest_charge: bool = False,
    is_fee: bool = False,
    is_income: bool = False,
    metadata: dict[str, Any] | None = None,
) -> Transaction:
    direction = "credit" if amount > 0 else "debit"
    return Transaction(
        user_id=user_id,
        account_id=account_id,
        posted_at=dt,
        pending=pending,
        amount=round(amount, 2),
        direction=direction,
        merchant_name_raw=merchant,
        merchant_name_normalized=standardize_merchant_name(merchant),
        description_raw=description,
        category_key=category_key,
        is_transfer=is_transfer,
        is_subscription_candidate=is_subscription,
        is_interest_charge=is_interest_charge,
        is_fee=is_fee,
        is_income=is_income,
        metadata_json=metadata or {},
    )


def _nth_recent_payday(reference: date, cadence_days: int, count: int) -> date:
    return reference - timedelta(days=cadence_days * count)


def _safe_datetime(day: date, hour: int = 9) -> datetime:
    return datetime.combine(day, time(hour=hour))


def _month_day(base: date, day: int) -> date:
    month_start = base.replace(day=1)
    last_day = (month_start + relativedelta(months=1) - timedelta(days=1)).day
    return month_start.replace(day=min(day, last_day))


def _history_snapshot_dates(months: int = 12) -> list[datetime]:
    snapshots: list[datetime] = []
    for offset in range(months - 1, -1, -1):
        month_base = REFERENCE_DATE.replace(day=1) - relativedelta(months=offset)
        snapshots.append(_safe_datetime(_month_day(month_base, REFERENCE_DATE.day), hour=7))
    return snapshots


def _series_from_current_value(
    current_value: float,
    *,
    months: int,
    oldest_multiplier: float,
    rng: random.Random,
    floor: float = 0.0,
    noise: float = 0.05,
) -> list[float]:
    if months <= 1:
        return [round(max(floor, current_value), 2)]

    oldest_value = max(floor, current_value * oldest_multiplier)
    values: list[float] = []
    for index in range(months):
        progress = index / (months - 1)
        baseline = oldest_value + (current_value - oldest_value) * progress
        if index == months - 1:
            values.append(round(max(floor, current_value), 2))
            continue
        adjusted = max(floor, baseline * (1 + rng.uniform(-noise, noise)))
        values.append(round(adjusted, 2))
    values[-1] = round(max(floor, current_value), 2)
    return values


def _checking_oldest_multiplier(flags: list[str]) -> float:
    if "healthy" in flags:
        return 0.72
    if "recovery" in flags:
        return 0.58
    if "tight-buffer" in flags or "paycheck-to-paycheck" in flags:
        return 1.08
    if "overdraft-fees" in flags:
        return 1.2
    return 0.9


def _savings_oldest_multiplier(flags: list[str]) -> float:
    if "healthy" in flags:
        return 0.62
    if "recovery" in flags:
        return 0.75
    if "tight-buffer" in flags:
        return 0.9
    return 0.82


def _credit_oldest_multiplier(flags: list[str], card_seed: dict[str, Any]) -> float:
    if card_seed.get("deferred_interest_offers"):
        return 0.55
    if "healthy" in flags or "recovery" in flags:
        return 1.28
    if "interest-leakage" in flags or "utilization-pressure" in flags:
        return 0.72
    if "spending-spike" in flags or "inefficient-payments" in flags:
        return 0.8
    return 0.95


def _generate_variable_transactions(
    rng: random.Random,
    user_id: str,
    account_id: str,
    start_date: date,
    weeks: int,
    weekly_amount: float,
    category_key: str,
    merchant_options: list[str],
    description_prefix: str,
    intensity_multiplier: float = 1.0,
) -> list[Transaction]:
    transactions: list[Transaction] = []
    for week_idx in range(weeks):
        day = start_date + timedelta(days=week_idx * 7 + rng.randint(0, 4))
        noise = rng.uniform(-0.18, 0.22)
        amount = max(8.0, weekly_amount * intensity_multiplier * (1 + noise))
        merchant = rng.choice(merchant_options)
        description = f"{description_prefix} {merchant}"
        transactions.append(
            _transaction(
                user_id=user_id,
                account_id=account_id,
                dt=_safe_datetime(day, hour=13),
                amount=-amount,
                merchant=merchant,
                description=description,
                category_key=category_key,
            )
        )
    return transactions


def _update_user_from_scenario(user: User, scenario: dict[str, Any]) -> None:
    user.full_name = scenario["name"]
    user.email = f"{scenario['id']}@demo.personal-accountant.ai"
    user.archetype = scenario["archetype"]
    user.persona_summary = scenario["summary"]
    user.monthly_income_estimate = scenario["monthly_income"]
    user.monthly_fixed_expenses_estimate = scenario["rent"] + scenario["utilities"] + scenario["insurance"] + scenario["phone"]
    user.savings_floor_target = scenario["savings_floor"]
    user.credit_score = scenario.get("credit_score")


def _expected_account_count(scenario: dict[str, Any]) -> int:
    return 1 + (1 if scenario["savings_balance"] > 0 else 0) + len(scenario["credit_cards"])


def _seed_user_needs_refresh(db: Session, user: User, scenario: dict[str, Any]) -> bool:
    accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).all()
    if len(accounts) != _expected_account_count(scenario):
        return True

    if any(
        db.query(AccountBalanceSnapshot).filter(AccountBalanceSnapshot.account_id == account.id).count() < 12
        for account in accounts
    ):
        return True

    oldest_transaction = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.posted_at.asc())
        .first()
    )
    if oldest_transaction is None or oldest_transaction.posted_at.date() > REFERENCE_DATE - timedelta(days=300):
        return True

    expects_deferred_offer = any(card.get("deferred_interest_offers") for card in scenario["credit_cards"])
    has_deferred_offer = any((account.details_json or {}).get("deferred_interest_offers") for account in accounts if account.account_type == "credit")
    if expects_deferred_offer and not has_deferred_offer:
        return True

    if db.query(CreditCardSummary).filter(CreditCardSummary.user_id == user.id).count() < len(scenario["credit_cards"]):
        return True

    if scenario["subscriptions"] and db.query(RecurringCharge).filter(RecurringCharge.user_id == user.id).count() == 0:
        return True

    return False


def _clear_user_seed_data(db: Session, user_id: str) -> None:
    db.query(AccountBalanceSnapshot).filter(AccountBalanceSnapshot.user_id == user_id).delete(synchronize_session=False)
    db.query(Transaction).filter(Transaction.user_id == user_id).delete(synchronize_session=False)
    db.query(RecurringCharge).filter(RecurringCharge.user_id == user_id).delete(synchronize_session=False)
    db.query(CreditCardSummary).filter(CreditCardSummary.user_id == user_id).delete(synchronize_session=False)
    db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user_id).delete(synchronize_session=False)
    db.flush()


def _hydrate_user_seed_artifacts(db: Session, persona_key: str) -> None:
    from .services.finance import ensure_recurring_charges, fetch_user_context, upsert_credit_summaries

    context = fetch_user_context(db, persona_key)
    context.cards = upsert_credit_summaries(db, context)
    context.recurring = ensure_recurring_charges(db, context)


def _seed_user_financials(db: Session, user: User, scenario: dict[str, Any]) -> None:
    rng = random.Random(scenario["id"])

    accounts: dict[str, ConnectedAccount] = {}
    checking = ConnectedAccount(
        user_id=user.id,
        external_id=f"{user.persona_key}-checking",
        display_name=f"CHASE TOTAL CHECKING {rng.randint(1000, 9999)}",
        sanitized_name=account_alias("checking", 1),
        institution_name="Chase",
        account_type="checking",
        subtype="checking",
        last4=str(rng.randint(1000, 9999)),
        details_json={"account_role": "operating_cash"},
    )
    db.add(checking)
    db.flush()
    accounts["checking"] = checking

    if scenario["savings_balance"] > 0:
        savings = ConnectedAccount(
            user_id=user.id,
            external_id=f"{user.persona_key}-savings",
            display_name=f"ALLY HIGH YIELD SAVINGS {rng.randint(1000, 9999)}",
            sanitized_name=account_alias("savings", 1),
            institution_name="Ally",
            account_type="savings",
            subtype="savings",
            last4=str(rng.randint(1000, 9999)),
            details_json={"account_role": "buffer"},
        )
        db.add(savings)
        db.flush()
        accounts["savings"] = savings

    card_accounts: list[ConnectedAccount] = []
    for idx, card in enumerate(scenario["credit_cards"], start=1):
        account = ConnectedAccount(
            user_id=user.id,
            external_id=f"{user.persona_key}-credit-{idx}",
            display_name=f"{card['name']} {card['last4']}",
            sanitized_name=account_alias("credit", idx),
            institution_name=card["name"].split()[0],
            account_type="credit",
            subtype="credit_card",
            last4=card["last4"],
            details_json=card,
        )
        db.add(account)
        db.flush()
        card_accounts.append(account)

    history_dates = _history_snapshot_dates(12)
    checking_history = _series_from_current_value(
        scenario["checking_balance"],
        months=len(history_dates),
        oldest_multiplier=_checking_oldest_multiplier(scenario["flags"]),
        rng=rng,
        floor=0.0,
        noise=0.18 if "tight-buffer" in scenario["flags"] else 0.1,
    )
    for index, snapshot_time in enumerate(history_dates):
        checking_balance = checking_history[index]
        pending_balance = 45.0 if index == len(history_dates) - 1 and "tight-buffer" in scenario["flags"] else 0.0
        db.add(
            AccountBalanceSnapshot(
                user_id=user.id,
                account_id=checking.id,
                snapshot_at=snapshot_time,
                current_balance=checking_balance,
                available_balance=max(0.0, checking_balance - pending_balance),
                pending_balance=pending_balance,
            )
        )

    if "savings" in accounts:
        savings_history = _series_from_current_value(
            scenario["savings_balance"],
            months=len(history_dates),
            oldest_multiplier=_savings_oldest_multiplier(scenario["flags"]),
            rng=rng,
            floor=0.0,
            noise=0.08,
        )
        for snapshot_time, savings_balance in zip(history_dates, savings_history):
            db.add(
                AccountBalanceSnapshot(
                    user_id=user.id,
                    account_id=accounts["savings"].id,
                    snapshot_at=snapshot_time,
                    current_balance=savings_balance,
                    available_balance=savings_balance,
                    pending_balance=0.0,
                )
            )

    for idx, card in enumerate(scenario["credit_cards"]):
        account = card_accounts[idx]
        balance_history = _series_from_current_value(
            card["balance"],
            months=len(history_dates),
            oldest_multiplier=_credit_oldest_multiplier(scenario["flags"], card),
            rng=rng,
            floor=0.0,
            noise=0.07,
        )
        for snapshot_time, balance_value in zip(history_dates, balance_history):
            db.add(
                AccountBalanceSnapshot(
                    user_id=user.id,
                    account_id=account.id,
                    snapshot_at=snapshot_time,
                    current_balance=-balance_value,
                    available_balance=-balance_value,
                    pending_balance=0.0,
                )
            )

    transactions: list[Transaction] = []
    window_start = REFERENCE_DATE - timedelta(days=364)
    weeks = 52

    for paycheck_idx in range(30):
        payday = _nth_recent_payday(REFERENCE_DATE - timedelta(days=1), scenario["paycheck_frequency_days"], paycheck_idx)
        if payday < window_start:
            continue
        transactions.append(
            _transaction(
                user_id=user.id,
                account_id=checking.id,
                dt=_safe_datetime(payday, hour=8),
                amount=scenario["paycheck_amount"],
                merchant="Payroll Deposit ACME Corp",
                description="Payroll Deposit ACME Corp EMPLOYEE DIRECT DEP",
                category_key="income",
                is_income=True,
            )
        )

    for month_idx in range(12):
        month_base = REFERENCE_DATE.replace(day=1) - relativedelta(months=month_idx)
        rent_day = _month_day(month_base, 1)
        utilities_day = _month_day(month_base, 5)
        phone_day = _month_day(month_base, 12)
        insurance_day = _month_day(month_base, 18)

        transactions.extend(
            [
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(rent_day),
                    amount=-scenario["rent"],
                    merchant="STONEGATE PROPERTY MGMT",
                    description="STONEGATE PROPERTY MGMT RENT ACH",
                    category_key="bills",
                ),
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(utilities_day),
                    amount=-scenario["utilities"],
                    merchant="PSEG NEWARK NJ",
                    description="PSEG NEWARK NJ WEB PAYMENT",
                    category_key="bills",
                ),
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(phone_day),
                    amount=-scenario["phone"],
                    merchant="VERIZON WIRELESS",
                    description="VERIZON WIRELESS AUTOPAY",
                    category_key="bills",
                ),
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(insurance_day),
                    amount=-scenario["insurance"],
                    merchant="GEICO PAYMENT",
                    description="GEICO PAYMENT AUTO POLICY",
                    category_key="bills",
                ),
            ]
        )

        for subscription in scenario["subscriptions"]:
            day = _month_day(month_base, subscription["day"])
            target_account = card_accounts[0].id if card_accounts else checking.id
            transactions.append(
                _transaction(
                    user_id=user.id,
                    account_id=target_account,
                    dt=_safe_datetime(day, hour=10),
                    amount=-subscription["amount"],
                    merchant=f"{subscription['merchant'].upper()} 0{rng.randint(100, 999)} NEWARK NJ",
                    description=f"{subscription['merchant']} recurring subscription renewal",
                    category_key="subscriptions",
                    is_subscription=True,
                    metadata={"merchant_key": normalize_merchant_key(subscription["merchant"])},
                )
            )

    primary_spend_account = card_accounts[0].id if card_accounts else checking.id
    secondary_spend_account = card_accounts[1].id if len(card_accounts) > 1 else checking.id

    dining_multiplier = 1.3 if "spending-spike" in scenario["flags"] else 1.0
    if "recovery" in scenario["flags"]:
        dining_multiplier = 0.72

    transactions.extend(
        _generate_variable_transactions(
            rng,
            user.id,
            primary_spend_account,
            window_start,
            weeks,
            scenario["weekly_groceries"],
            "groceries",
            ["WHOLE FOODS NYC", "TRADER JOES BKLYN", "STOP & SHOP JERSEY CITY"],
            "DEBIT CARD PURCHASE",
        )
    )
    transactions.extend(
        _generate_variable_transactions(
            rng,
            user.id,
            primary_spend_account,
            window_start + timedelta(days=1),
            weeks,
            scenario["weekly_dining"],
            "dining",
            ["STARBUCKS 04567 NEWARK NJ", "DOORDASH *DINNER", "SWEETGREEN 1022", "UBER EATS HELP"],
            "CARD PURCHASE",
            intensity_multiplier=dining_multiplier,
        )
    )
    transactions.extend(
        _generate_variable_transactions(
            rng,
            user.id,
            primary_spend_account,
            window_start + timedelta(days=2),
            weeks,
            scenario["weekly_transport"],
            "transportation",
            ["EXXONMOBIL 9929", "MTA OMNY NY", "UBER TRIP"],
            "CARD PURCHASE",
        )
    )
    transactions.extend(
        _generate_variable_transactions(
            rng,
            user.id,
            secondary_spend_account,
            window_start + timedelta(days=3),
            weeks,
            scenario["weekly_entertainment"],
            "entertainment",
            ["AMC THEATRES", "TICKETMASTER", "PLAYSTATION NETWORK"],
            "CARD PURCHASE",
        )
    )
    transactions.extend(
        _generate_variable_transactions(
            rng,
            user.id,
            checking.id,
            window_start + timedelta(days=4),
            weeks,
            scenario["weekly_other_discretionary"],
            "discretionary",
            ["TARGET T-2198", "AMAZON MKTPLACE PMTS", "HOMEGOODS 0129"],
            "DEBIT CARD PURCHASE",
        )
    )

    for idx, card in enumerate(scenario["credit_cards"]):
        account = card_accounts[idx]
        extra_payment = 25.0
        if "inefficient-payments" in scenario["flags"]:
            extra_payment = 120.0
        elif "interest-leakage" in scenario["flags"]:
            extra_payment = 85.0
        elif "healthy" in scenario["flags"]:
            extra_payment = 150.0

        for month_idx in range(12):
            month_base = REFERENCE_DATE.replace(day=1) - relativedelta(months=month_idx)
            due_day = _month_day(month_base, card["due_day"])
            payment_amount = -(card["minimum_payment"] + extra_payment / max(1, len(scenario["credit_cards"])))
            transactions.append(
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(due_day - timedelta(days=2)),
                    amount=payment_amount,
                    merchant=f"{card['name'].upper()} PAYMENT THANK YOU",
                    description=f"ONLINE PAYMENT {card['name']} {card['last4']}",
                    category_key="debt_payment",
                    metadata={"target_account_id": account.id},
                )
            )
            transactions.append(
                _transaction(
                    user_id=user.id,
                    account_id=account.id,
                    dt=_safe_datetime(due_day - timedelta(days=2), hour=17),
                    amount=abs(payment_amount),
                    merchant=f"PAYMENT RECEIVED {card['name'].upper()}",
                    description=f"CARD PAYMENT RECEIVED {card['last4']}",
                    category_key="transfers",
                    is_transfer=True,
                )
            )

            monthly_interest = card["balance"] * (card["apr"] / 100) / 12
            if card["balance"] / card["limit"] > 0.35 or "interest-leakage" in scenario["flags"]:
                transactions.append(
                    _transaction(
                        user_id=user.id,
                        account_id=account.id,
                        dt=_safe_datetime(_month_day(month_base, min(card["due_day"] + 4, 28)), hour=11),
                        amount=-round(monthly_interest * rng.uniform(0.75, 1.05), 2),
                        merchant=f"{card['name'].upper()} INTEREST CHARGE",
                        description=f"INTEREST CHARGE PURCHASE APR {card['apr']}%",
                        category_key="interest",
                        is_interest_charge=True,
                    )
                )

        for offer in card.get("deferred_interest_offers", []):
            started_on = date.fromisoformat(offer["started_on"])
            if window_start <= started_on <= REFERENCE_DATE:
                transactions.append(
                    _transaction(
                        user_id=user.id,
                        account_id=account.id,
                        dt=_safe_datetime(started_on, hour=12),
                        amount=-offer["deferred_amount"],
                        merchant=f"{card['name'].upper()} SPECIAL FINANCING",
                        description=f"{offer['label']} SPECIAL FINANCING PURCHASE",
                        category_key="discretionary",
                        metadata={
                            "deferred_interest_offer_id": offer["id"],
                            "deferred_interest_offer": True,
                        },
                    )
                )

    if "savings" in accounts and scenario["savings_balance"] > 0 and "tight-buffer" not in scenario["flags"]:
        for month_idx in range(12):
            month_base = REFERENCE_DATE.replace(day=1) - relativedelta(months=month_idx)
            transfer_day = _month_day(month_base, 15)
            transfer_amount = round(min(350.0, scenario["monthly_income"] * 0.05), 2)
            transactions.append(
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(transfer_day),
                    amount=-transfer_amount,
                    merchant="TRANSFER TO ALLY SAVINGS",
                    description="INTERNAL TRANSFER TO SAVINGS",
                    category_key="savings",
                    is_transfer=True,
                )
            )
            transactions.append(
                _transaction(
                    user_id=user.id,
                    account_id=accounts["savings"].id,
                    dt=_safe_datetime(transfer_day, hour=18),
                    amount=transfer_amount,
                    merchant="TRANSFER FROM CHASE CHECKING",
                    description="INTERNAL TRANSFER FROM CHECKING",
                    category_key="savings",
                    is_transfer=True,
                )
            )

    if "overdraft-fees" in scenario["flags"]:
        for days_ago in [52, 21, 8]:
            transactions.append(
                _transaction(
                    user_id=user.id,
                    account_id=checking.id,
                    dt=_safe_datetime(REFERENCE_DATE - timedelta(days=days_ago), hour=16),
                    amount=-35.0,
                    merchant="OVERDRAFT FEE CHARGE",
                    description="OD FEE DAILY BALANCE BELOW ZERO",
                    category_key="fees",
                    is_fee=True,
                )
            )

    if "tight-buffer" in scenario["flags"]:
        transactions.append(
            _transaction(
                user_id=user.id,
                account_id=checking.id,
                dt=_safe_datetime(REFERENCE_DATE - timedelta(days=1), hour=14),
                amount=-47.35,
                merchant="CVS PHARMACY 1420",
                description="PENDING DEBIT PURCHASE CVS",
                category_key="discretionary",
                pending=True,
            )
        )

    for txn in transactions:
        db.add(txn)


def seed_users(db: Session) -> None:
    scenario_rows = load_json(settings.scenarios_path)
    scenario_ids = [scenario["id"] for scenario in scenario_rows]
    existing_users = {
        user.persona_key: user
        for user in db.query(User).filter(User.persona_key.in_(scenario_ids)).all()
    }
    refreshed_personas: list[str] = []

    for scenario in scenario_rows:
        user = existing_users.get(scenario["id"])
        if user is None:
            user = User(persona_key=scenario["id"])
            _update_user_from_scenario(user, scenario)
            db.add(user)
            db.flush()
            _seed_user_financials(db, user, scenario)
            refreshed_personas.append(user.persona_key)
            continue

        _update_user_from_scenario(user, scenario)
        if _seed_user_needs_refresh(db, user, scenario):
            _clear_user_seed_data(db, user.id)
            _seed_user_financials(db, user, scenario)
            refreshed_personas.append(user.persona_key)

    db.commit()

    for persona_key in refreshed_personas:
        _hydrate_user_seed_artifacts(db, persona_key)


def detect_recurring_from_transactions(transactions: list[Transaction]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for transaction in transactions:
        if transaction.category_key not in {"subscriptions", "bills"}:
            continue
        merchant_key = normalize_merchant_key(transaction.merchant_name_normalized)
        grouped[merchant_key].append(transaction)

    recurring: dict[str, dict[str, Any]] = {}
    for merchant_key, items in grouped.items():
        if len(items) < 3:
            continue
        items.sort(key=lambda item: item.posted_at)
        average_amount = abs(sum(item.amount for item in items) / len(items))
        recurring[merchant_key] = {
            "merchant_key": merchant_key,
            "label": items[-1].merchant_name_normalized.title(),
            "monthly_amount": round(average_amount, 2),
            "last_seen_at": items[-1].posted_at,
            "next_expected_at": items[-1].posted_at + relativedelta(months=1),
            "confidence": min(0.99, 0.72 + len(items) * 0.04),
            "account_id": items[-1].account_id,
        }
    return recurring


def ensure_seed_data(db: Session) -> None:
    create_categories(db)
    create_merchant_actions(db)
    seed_users(db)
