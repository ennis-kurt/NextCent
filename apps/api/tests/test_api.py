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
