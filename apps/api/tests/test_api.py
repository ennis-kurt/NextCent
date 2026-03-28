from __future__ import annotations

def test_healthcheck(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_personas_endpoint(client):
    response = client.get("/api/v1/personas")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    assert any(item["id"] == "high-debt-strong-income" for item in data)


def test_dashboard_contains_recommendations(client):
    response = client.get("/api/v1/dashboard", params={"persona_id": "thin-checking-upcoming-bills"})
    assert response.status_code == 200
    data = response.json()
    assert data["safe_to_spend"]["spending_velocity_status"] in {"safe", "caution", "likely_overspend"}
    assert len(data["top_recommendations"]) >= 1


def test_simulation_endpoint(client):
    response = client.post(
        "/api/v1/simulate",
        json={
            "persona_id": "credit-score-pressure",
            "name": "New car payment",
            "scenario_type": "new_monthly_expense",
            "amount": 400,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["comfort_level"] in {"comfortable", "tight", "risky"}
    assert "monthly_surplus" in data["deltas"]


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
            "name": "New car payment",
            "scenario_type": "new_monthly_expense",
            "amount": 400,
        },
    )
    scenario_id = simulation_response.json()["scenario_id"]

    response = client.get("/api/v1/simulations", params={"persona_id": "credit-score-pressure", "limit": 1})
    assert response.status_code == 200
    data = response.json()
    assert data[0]["scenario_id"] == scenario_id
    assert data[0]["result"]["scenario_id"] == scenario_id
