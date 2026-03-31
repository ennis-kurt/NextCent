from __future__ import annotations

def test_healthcheck(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_personas_endpoint(client):
    response = client.get("/api/v1/personas")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 11
    assert any(item["id"] == "high-debt-strong-income" for item in data)
    assert any(item["id"] == "promo-financing-deferred-interest" for item in data)


def test_dashboard_contains_recommendations(client):
    response = client.get("/api/v1/dashboard", params={"persona_id": "thin-checking-upcoming-bills"})
    assert response.status_code == 200
    data = response.json()
    assert data["safe_to_spend"]["spending_velocity_status"] in {"safe", "caution", "likely_overspend"}
    assert data["investment_guidance"]["posture"] in {"invest_now", "debt_first", "buffer_first"}
    assert len(data["top_recommendations"]) >= 1


def test_investment_guidance_endpoint(client):
    response = client.get("/api/v1/investment-guidance", params={"persona_id": "healthy-cashflow"})
    assert response.status_code == 200
    data = response.json()
    assert data["posture"] in {"invest_now", "debt_first", "buffer_first"}
    assert data["priority_destination"]


def test_credit_summary_exposes_interest_rollups(client):
    response = client.get("/api/v1/credit-summaries", params={"persona_id": "credit-score-pressure"})
    assert response.status_code == 200
    data = response.json()
    assert data["cards"]
    assert "interest_charged_this_month" in data["cards"][0]
    assert "interest_charged_last_six_months" in data["cards"][0]
    assert data["cards"][0]["interest_charged_last_six_months"] >= data["cards"][0]["interest_charged_this_month"]


def test_cash_flow_endpoint_exposes_twelve_month_history_and_upcoming_events(client):
    response = client.get("/api/v1/cash-flow", params={"persona_id": "high-debt-strong-income"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["monthly_series"]) == 12
    assert len(data["ending_balance_series"]) == 12
    assert data["upcoming_events"]
    assert "lowest_projected_balance" in data["paycheck_to_paycheck_view"]
    assert any(event["kind"] == "income" for event in data["upcoming_events"])


def test_credit_summary_exposes_deferred_interest_fields(client):
    response = client.get("/api/v1/credit-summaries", params={"persona_id": "good-cash-poor-payment-allocation"})
    assert response.status_code == 200
    data = response.json()
    promo_card = next(card for card in data["cards"] if card["deferred_interest_offers"])
    assert promo_card["minimum_monthly_payment_to_avoid_deferred_interest"] > promo_card["minimum_payment"]
    assert len(promo_card["balance_history"]) == 12
    assert promo_card["deferred_interest_offers"][0]["required_monthly_payment_to_avoid_deferred_interest"] > 0


def test_simulation_endpoint(client):
    response = client.post(
        "/api/v1/simulate",
        json={
            "persona_id": "credit-score-pressure",
            "name": "Can I afford this payment?",
            "scenario_type": "custom_outflow",
            "cadence": "one_time",
            "effective_date": "2026-04-03",
            "amount": 400,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["comfort_level"] in {"comfortable", "tight", "risky"}
    assert data["planner"]["mode"] == "affordability"
    assert len(data["planner"]["impact_cards"]) == 3
    assert "monthly_surplus" in data["deltas"]


def test_custom_allocation_simulation_returns_split_plan(client):
    response = client.post(
        "/api/v1/simulate",
        json={
            "persona_id": "promo-financing-deferred-interest",
            "name": "Where should my next dollar go?",
            "scenario_type": "custom_allocation",
            "cadence": "one_time",
            "effective_date": "2026-04-03",
            "amount": 500,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["planner"]["mode"] == "allocation"
    assert data["planner"]["allocation_plan"]["minimums_preserved"] is True
    assert data["planner"]["allocation_plan"]["rows"]
    assert any(row["target_type"] == "debt" for row in data["planner"]["allocation_plan"]["rows"])
    assert data["planner"]["deficit_analysis"]["largest_safe_amount"] >= 0


def test_chat_endpoint_returns_grounded_answer(client):
    session_response = client.post("/api/v1/chat/sessions", params={"persona_id": "subscription-heavy"})
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]
    response = client.post(
        "/api/v1/chat/messages",
        json={
            "persona_id": "subscription-heavy",
            "session_id": session_id,
            "message": "Which subscriptions should I review first?",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["facts"]
    assert "subscription" in data["answer"].lower()


def test_latest_chat_session_returns_persisted_messages(client):
    session_response = client.post("/api/v1/chat/sessions", params={"persona_id": "subscription-heavy"})
    session_id = session_response.json()["id"]

    client.post(
        "/api/v1/chat/messages",
        json={
            "persona_id": "subscription-heavy",
            "session_id": session_id,
            "message": "How much can I safely spend this week?",
        },
    )

    response = client.get("/api/v1/chat/sessions/latest", params={"persona_id": "subscription-heavy"})
    assert response.status_code == 200
    data = response.json()
    assert data["session"]["id"] == session_id
    assert len(data["messages"]) == 2
    assert [message["role"] for message in data["messages"]] == ["user", "assistant"]


def test_chat_session_must_belong_to_requested_persona(client):
    session_response = client.post("/api/v1/chat/sessions", params={"persona_id": "subscription-heavy"})
    session_id = session_response.json()["id"]

    response = client.post(
        "/api/v1/chat/messages",
        json={
            "persona_id": "credit-score-pressure",
            "session_id": session_id,
            "message": "Which card should I pay first?",
        },
    )

    assert response.status_code == 404


def test_simulation_history_returns_recent_records(client):
    simulation_response = client.post(
        "/api/v1/simulate",
        json={
            "persona_id": "credit-score-pressure",
            "name": "Can I afford this payment?",
            "scenario_type": "custom_outflow",
            "cadence": "one_time",
            "effective_date": "2026-04-03",
            "amount": 400,
        },
    )
    scenario_id = simulation_response.json()["scenario_id"]

    response = client.get("/api/v1/simulations", params={"persona_id": "credit-score-pressure", "limit": 1})
    assert response.status_code == 200
    data = response.json()
    assert data[0]["scenario_id"] == scenario_id
    assert data[0]["result"]["scenario_id"] == scenario_id
