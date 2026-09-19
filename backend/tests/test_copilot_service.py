"""
RESILIENCE AI — Resilience Copilot (Google Gemini Integration) Test Suite
========================================================================
Validates that the Copilot:
1. Reasons strictly over structured application database data without metric fabrication.
2. Handles environment variables for GEMINI_API_KEY gracefully.
3. Provides a robust, zero-fabrication fallback demo mode when API keys are absent.
4. Correctly serves the /api/copilot/status and /api/copilot/query endpoints.
"""
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.gemini_copilot import gemini_copilot
from app.db.session import SessionLocal
from app.models.entities import PHC, Bed, Staff, RiskScore, RedistributionRecommendation

client = TestClient(app)

def get_auth_headers(email: str = "national.admin@resilience.gov.in", password: str = "resilience2026"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

ADMIN_HEADERS = get_auth_headers()


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


def test_copilot_status_endpoint():
    res = client.get("/api/copilot/status", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"
    assert "is_api_key_configured" in data
    assert data["mode"] in ["LIVE_GEMINI", "GROUNDED_FALLBACK_DEMO"]
    assert "model" in data
    assert data["zero_fabrication_guarantee"] is True


def test_copilot_env_variable_handling():
    # 1. Test placeholder filtering
    orig_key = os.environ.get("GEMINI_API_KEY")
    try:
        os.environ["GEMINI_API_KEY"] = "your_api_key_here"
        assert gemini_copilot._get_api_key() == ""
        assert gemini_copilot.is_api_configured() is False

        os.environ["GEMINI_API_KEY"] = "   "
        assert gemini_copilot._get_api_key() == ""

        os.environ["GEMINI_API_KEY"] = "AIzaSyFakeKeyForTesting1234567890"
        assert gemini_copilot._get_api_key() == "AIzaSyFakeKeyForTesting1234567890"
    finally:
        if orig_key is not None:
            os.environ["GEMINI_API_KEY"] = orig_key
        else:
            os.environ.pop("GEMINI_API_KEY", None)


def test_copilot_query_highest_risk_phcs(db_session):
    res = client.post("/api/copilot/query", json={
        "query": "Which Primary Health Centres are currently at highest risk?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 50
    assert data["confidence"] >= 0.85
    assert "supporting_metrics" in data
    assert data["supporting_metrics"]["total_monitored_phcs"] >= 90
    assert len(data["affected_phcs"]) > 0

    # Verify that the mentioned PHCs exist in the database
    first_phc_name = data["affected_phcs"][0]
    db_phc = db_session.query(PHC).filter(PHC.name == first_phc_name).first()
    assert db_phc is not None


def test_copilot_query_stockout_medicines(db_session):
    res = client.post("/api/copilot/query", json={
        "query": "What essential medicines are projected to stock out within the next 7 days?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "7-Day" in data["answer"] or "Stock-Out" in data["answer"] or "medicine" in data["answer"].lower()
    assert "recommended_actions" in data
    assert len(data["recommended_actions"]) >= 1


def test_copilot_query_bed_capacity(db_session):
    # Query actual bed capacity from database
    total_db_beds = db_session.query(PHC).join(Bed).count()
    assert total_db_beds > 0

    res = client.post("/api/copilot/query", json={
        "query": "What is the overall hospital bed capacity and ICU saturation?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "Bed Capacity" in data["answer"] or "beds" in data["answer"].lower()
    assert "bed_occupancy_rate" in data["supporting_metrics"]


def test_copilot_query_redistributions(db_session):
    res = client.post("/api/copilot/query", json={
        "query": "What cross-district medicine redistributions have been recommended?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "Redistribution" in data["answer"] or "transfer" in data["answer"].lower()
    assert "recommended_actions" in data


def test_copilot_query_national_summary():
    res = client.post("/api/copilot/query", json={
        "query": "Summarize the national healthcare resource situation today."
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "National Healthcare" in data["answer"] or "monitored" in data["answer"].lower()
    assert data["supporting_metrics"]["total_monitored_phcs"] >= 90


def test_copilot_query_validation():
    # Empty query validation
    res = client.post("/api/copilot/query", json={}, headers=ADMIN_HEADERS)
    assert res.status_code == 422


def test_copilot_query_unknown_information():
    res = client.post("/api/copilot/query", json={
        "query": "What is the MRI scanner queue time in Antarctica Research Station?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "I don't have enough application data to answer that reliably." in data["answer"] or "unavailable" in data["answer"].lower()
    assert len(data["affected_phcs"]) == 0
    assert data["risk_level"] == "INFORMATIONAL"


def test_copilot_query_critical_risks_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "What are today's most critical healthcare risks?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    assert "evidence" in data and len(data["evidence"]) > 0
    assert data["risk_level"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert "data_limitations" in data and data["data_limitations"]
    assert len(data["recommended_actions"]) > 0


def test_copilot_query_phcs_stockouts_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "Which PHCs may face medicine stock-outs?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    assert "evidence" in data and len(data["evidence"]) > 0
    assert "recommended_actions" in data


def test_copilot_query_redistribution_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "Where should resources be redistributed?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    assert "recommended_actions" in data


def test_copilot_query_why_district_high_risk_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "Why is this district high risk?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    # Explainability check: confirms that application fields are cited
    answer_text = data["answer"].lower()
    assert any(term in answer_text for term in ["risk", "days_stock_remaining", "consumption", "bed_occupancy", "lead_time", "district"])
    assert "data_limitations" in data


def test_copilot_query_emergency_situation_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "Summarize the current emergency situation."
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    assert "emergency" in data["answer"].lower() or "incident" in data["answer"].lower()


def test_copilot_query_yesterday_comparison_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "What changed compared with yesterday?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    assert "evidence" in data
    assert "data_limitations" in data


def test_copilot_query_resource_imbalance_prompt():
    res = client.post("/api/copilot/query", json={
        "query": "Which resource imbalance needs immediate attention?"
    }, headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data and data["summary"]
    assert "evidence" in data and len(data["evidence"]) > 0
    assert "recommended_actions" in data
