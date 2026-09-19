import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

DEMO_USERS = {
    "NATIONAL_ADMIN":       "national.admin@resilience.gov.in",
    "STATE_ADMIN":          "state.tn.admin@resilience.gov.in",
    "DISTRICT_ADMIN":       "district.namakkal@resilience.gov.in",
    "PHC_ADMIN":            "phc.kollihills@resilience.gov.in",
    "SUPPLY_CHAIN_MANAGER": "supply.chain@resilience.gov.in",
}
PASSWORD = "resilience2026"


def get_token(role):
    email = DEMO_USERS[role]
    res = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 200, f"Login failed for {role}: {res.text}"
    return res.json()["access_token"]


TOKENS = {role: get_token(role) for role in DEMO_USERS}


def hdr(role):
    return {"Authorization": f"Bearer {TOKENS[role]}"}


PROTECTED_GET = [
    "/api/dashboard", "/api/phcs", "/api/phcs/1",
    "/api/inventory", "/api/workforce", "/api/resources",
    "/api/alerts", "/api/analytics", "/api/redistribution",
    "/api/risk", "/api/forecast", "/api/anomalies",
    "/api/emergency/status", "/api/federated/nodes",
    "/api/federated/rounds", "/api/audit", "/api/copilot/status",
]

PROTECTED_POST = [
    ("/api/emergency/simulate", {"event_type": "DENGUE_OUTBREAK", "affected_district_name": "Namakkal"}),
    ("/api/emergency/reset", {}),
    ("/api/redistribution/generate", {}),
    ("/api/federated/train-round", {}),
    ("/api/copilot/query", {"query": "test"}),
]


@pytest.mark.parametrize("endpoint", PROTECTED_GET)
def test_unauthenticated_get_returns_401(endpoint):
    res = client.get(endpoint)
    assert res.status_code == 401, f"Expected 401 on GET {endpoint} without token, got {res.status_code}"


@pytest.mark.parametrize("endpoint,payload", PROTECTED_POST)
def test_unauthenticated_post_returns_401(endpoint, payload):
    res = client.post(endpoint, json=payload)
    assert res.status_code == 401, f"Expected 401 on POST {endpoint} without token, got {res.status_code}"


def test_invalid_jwt_returns_401():
    bad = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlckBleGFtcGxlLmNvbSIsInJvbGUiOiJOQVRJT05BTF9BRE1JTiJ9.BADSIG"
    res = client.get("/api/dashboard", headers={"Authorization": f"Bearer {bad}"})
    assert res.status_code == 401


def test_malformed_bearer_returns_401():
    res = client.get("/api/dashboard", headers={"Authorization": "Bearer notajwt"})
    assert res.status_code == 401


def test_missing_bearer_prefix_returns_401():
    res = client.get("/api/dashboard", headers={"Authorization": TOKENS["NATIONAL_ADMIN"]})
    assert res.status_code == 401


def test_phc_admin_can_access_own_phc():
    me = client.get("/api/auth/me", headers=hdr("PHC_ADMIN")).json()
    phc_id = me.get("phc_id")
    if not phc_id:
        pytest.skip("PHC_ADMIN has no phc_id in test DB")
    res = client.get(f"/api/phcs/{phc_id}", headers=hdr("PHC_ADMIN"))
    assert res.status_code == 200


def test_phc_admin_cannot_access_other_phc():
    own_phc_id = client.get("/api/auth/me", headers=hdr("PHC_ADMIN")).json().get("phc_id", 1)
    all_phcs = client.get("/api/phcs?limit=5", headers=hdr("NATIONAL_ADMIN")).json()["items"]
    other = next((p for p in all_phcs if p["id"] != own_phc_id), None)
    if not other:
        pytest.skip("Not enough PHCs in test DB")
    res = client.get(f"/api/phcs/{other['id']}", headers=hdr("PHC_ADMIN"))
    assert res.status_code == 403, f"PHC_ADMIN cross-PHC should be 403, got {res.status_code}"


def test_district_admin_cannot_approve_redistribution():
    items = client.get("/api/redistribution", headers=hdr("NATIONAL_ADMIN")).json()
    if not items:
        pytest.skip("No redistribution records in test DB")
    rec_id = items[0]["id"]
    res = client.post(f"/api/redistribution/{rec_id}/approve", headers=hdr("DISTRICT_ADMIN"), json={"approved_by": "hacker"})
    assert res.status_code == 403


def test_phc_admin_cannot_generate_redistribution():
    res = client.post("/api/redistribution/generate", headers=hdr("PHC_ADMIN"))
    assert res.status_code == 403


def test_phc_admin_cannot_trigger_emergency():
    res = client.post("/api/emergency/simulate", headers=hdr("PHC_ADMIN"),
                      json={"event_type": "DENGUE_OUTBREAK", "affected_district_name": "Namakkal"})
    assert res.status_code == 403


def test_district_admin_cannot_reset_emergency():
    res = client.post("/api/emergency/reset", headers=hdr("DISTRICT_ADMIN"))
    assert res.status_code == 403


def test_phc_admin_cannot_start_federated_round():
    res = client.post("/api/federated/train-round", headers=hdr("PHC_ADMIN"), json={})
    assert res.status_code == 403


def test_supply_chain_manager_can_approve_redistribution():
    items = client.get("/api/redistribution", headers=hdr("NATIONAL_ADMIN")).json()
    if not items:
        pytest.skip("No redistribution records in test DB")
    rec_id = items[0]["id"]
    res = client.post(f"/api/redistribution/{rec_id}/approve", headers=hdr("SUPPLY_CHAIN_MANAGER"),
                      json={"approved_by": "Supply Chain Mgr"})
    assert res.status_code == 200, f"SUPPLY_CHAIN_MANAGER approve should be 200, got {res.status_code}: {res.text}"


def test_supply_chain_manager_can_generate_redistribution():
    res = client.post("/api/redistribution/generate", headers=hdr("SUPPLY_CHAIN_MANAGER"))
    assert res.status_code == 200


def test_national_admin_can_access_all_get_endpoints():
    for endpoint in PROTECTED_GET:
        res = client.get(endpoint, headers=hdr("NATIONAL_ADMIN"))
        assert res.status_code in [200, 404], f"NATIONAL_ADMIN GET {endpoint} returned {res.status_code}"


def test_national_admin_emergency_cycle():
    res = client.post("/api/emergency/simulate", headers=hdr("NATIONAL_ADMIN"),
                      json={"event_type": "DENGUE_OUTBREAK", "affected_district_name": "Namakkal"})
    assert res.status_code == 200
    res = client.post("/api/emergency/reset", headers=hdr("NATIONAL_ADMIN"))
    assert res.status_code == 200


def test_national_admin_can_start_federated_round():
    res = client.post("/api/federated/train-round", headers=hdr("NATIONAL_ADMIN"), json={})
    assert res.status_code == 200


def test_audit_phc_admin_403():
    assert client.get("/api/audit", headers=hdr("PHC_ADMIN")).status_code == 403


def test_audit_district_admin_403():
    assert client.get("/api/audit", headers=hdr("DISTRICT_ADMIN")).status_code == 403


def test_audit_supply_chain_403():
    assert client.get("/api/audit", headers=hdr("SUPPLY_CHAIN_MANAGER")).status_code == 403


def test_audit_national_admin_200():
    assert client.get("/api/audit", headers=hdr("NATIONAL_ADMIN")).status_code == 200


SECRETS = ["GEMINI_API_KEY", "JWT_SECRET", "resilience-ai-super-secret-key", "AIzaSy"]


@pytest.mark.parametrize("endpoint", ["/api/dashboard", "/api/copilot/status", "/api/auth/me", "/api/auth/roles"])
def test_no_secret_leakage(endpoint):
    body = client.get(endpoint, headers=hdr("NATIONAL_ADMIN")).text
    for s in SECRETS:
        assert s not in body, f"SECRET LEAK: '{s}' found in GET {endpoint} response"


def test_demo_users_no_secret_leakage():
    body = client.get("/api/auth/demo-users").text
    for s in SECRETS:
        assert s not in body, f"SECRET LEAK: '{s}' in /api/auth/demo-users"


def test_login_no_secret_leakage():
    res = client.post("/api/auth/login", json={"email": "national.admin@resilience.gov.in", "password": "resilience2026"})
    assert res.status_code == 200
    for s in SECRETS:
        assert s not in res.text, f"SECRET LEAK: '{s}' in login response"


def test_audit_identity_from_jwt():
    client.post("/api/copilot/query", headers=hdr("NATIONAL_ADMIN"), json={"query": "PHCs at risk"})
    logs = client.get("/api/audit?limit=10", headers=hdr("NATIONAL_ADMIN")).json()
    copilot_logs = [l for l in logs if l["action"] == "COPILOT_QUERY"]
    assert copilot_logs, "No COPILOT_QUERY audit log entry found"
    assert copilot_logs[0]["user_email"] == DEMO_USERS["NATIONAL_ADMIN"], \
        f"Audit identity should be JWT email, got {copilot_logs[0]['user_email']}"
