import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ─────────────────────────────────────────────────
# Shared auth helper — obtain a real National Admin token once
# ─────────────────────────────────────────────────
def get_auth_headers(email: str = "national.admin@resilience.gov.in", password: str = "resilience2026"):
    """Return Authorization headers for the given demo user."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

# Module-level: obtain NATIONAL_ADMIN headers once for all tests
ADMIN_HEADERS = get_auth_headers()

# 1. Foundation & Health Endpoints
def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["project"] == "RESILIENCE AI"
    assert data["status"] == "OPERATIONAL"

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_liveness_check():
    res = client.get("/health/liveness")
    assert res.status_code == 200
    assert res.json()["status"] == "alive"

# 2. Auth & RBAC Endpoints
def test_auth_login_and_roles():
    login_res = client.post("/api/auth/login", json={
        "email": "national.admin@resilience.gov.in",
        "password": "resilience2026"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    token = data["access_token"]

    # Test /auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "national.admin@resilience.gov.in"

    # Test /auth/roles
    roles_res = client.get("/api/auth/roles")
    assert roles_res.status_code == 200
    assert len(roles_res.json()) >= 5

def test_auth_login_invalid_credentials():
    res = client.post("/api/auth/login", json={
        "email": "invalid.user@resilience.gov.in",
        "password": "wrongpassword"
    })
    assert res.status_code == 401

# 3. Dashboard Endpoints
def test_dashboard_api():
    res = client.get("/api/dashboard", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert data["kpis"]["total_phcs"] >= 90
    assert "map_markers" in data
    assert len(data["map_markers"]) >= 90
    assert "national_trends_7d" in data
    assert len(data["national_trends_7d"]) == 7

# 4. PHC Management Endpoints
def test_phcs_list_and_detail():
    res = client.get("/api/phcs?limit=10", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 90
    assert len(data["items"]) == 10

    first_phc_id = data["items"][0]["id"]
    detail_res = client.get(f"/api/phcs/{first_phc_id}", headers=ADMIN_HEADERS)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "beds" in detail
    assert "workforce" in detail
    assert "critical_medicines" in detail
    assert "footfall_history_14d" in detail

def test_phc_not_found():
    res = client.get("/api/phcs/999999", headers=ADMIN_HEADERS)
    assert res.status_code == 404

# 5. Inventory Endpoints
def test_inventory_list_and_detail():
    res = client.get("/api/inventory?limit=10", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    assert len(data["items"]) == 10

    first_inv_id = data["items"][0]["id"]
    detail_res = client.get(f"/api/inventory/{first_inv_id}", headers=ADMIN_HEADERS)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "historical_consumption_30d" in detail
    assert "forecast_7d" in detail
    assert "confidence_score" in detail

def test_inventory_not_found():
    res = client.get("/api/inventory/999999", headers=ADMIN_HEADERS)
    assert res.status_code == 404

# 6. Workforce & Resource Endpoints
def test_workforce_intelligence():
    res = client.get("/api/workforce", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "role_breakdown" in data
    assert "district_workforce" in data
    assert len(data["role_breakdown"]) == 5

def test_resource_bed_capacity():
    res = client.get("/api/resources", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "district_capacity" in data
    assert data["summary"]["total_beds"] > 0
    assert data["summary"]["overall_occupancy_rate"] > 0

# 7. Alerts & Early Warning Endpoints
def test_alerts_list_and_action():
    res = client.get("/api/alerts?status=ACTIVE", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) > 0

    first_alert_id = alerts[0]["id"]
    detail_res = client.get(f"/api/alerts/{first_alert_id}", headers=ADMIN_HEADERS)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == first_alert_id

    # Test perform action
    action_res = client.post(f"/api/alerts/{first_alert_id}/action", headers=ADMIN_HEADERS, json={
        "action": "acknowledge",
        "user_name": "Test Officer"
    })
    assert action_res.status_code == 200
    assert action_res.json()["new_status"] == "ACKNOWLEDGED"

def test_alert_action_invalid():
    res = client.post("/api/alerts/1/action", headers=ADMIN_HEADERS, json={"action": "invalid_action"})
    assert res.status_code in [400, 404]

# 8. Analytics & Trends Endpoints
def test_analytics_multi_horizon():
    for days in [7, 30, 90]:
        res = client.get(f"/api/analytics?range_days={days}", headers=ADMIN_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["range_days"] == days
        assert "time_series" in data
        assert len(data["time_series"]) > 0
        assert "category_distribution" in data
        assert "district_matrix" in data

# 9. Redistribution Optimization Endpoints
def test_redistribution_recommendations_and_approval():
    res = client.get("/api/redistribution", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0

    first_rec_id = items[0]["id"]
    approve_res = client.post(f"/api/redistribution/{first_rec_id}/approve", headers=ADMIN_HEADERS, json={
        "approved_by": "National Commander"
    })
    assert approve_res.status_code == 200
    data = approve_res.json()
    assert data["status"] == "IN_TRANSIT"
    assert "tracking_number" in data

def test_redistribution_generate():
    res = client.post("/api/redistribution/generate", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "recommendations_generated" in data
    assert data["recommendations_generated"] >= 0

def test_redistribution_complete_workflow():
    # Fetch list
    res = client.get("/api/redistribution", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) > 0
    rec_id = recs[0]["id"]

    # Ensure approved
    client.post(f"/api/redistribution/{rec_id}/approve", headers=ADMIN_HEADERS, json={"action": "approve"})

    # Complete transfer
    comp_res = client.post(f"/api/redistribution/{rec_id}/complete", headers=ADMIN_HEADERS)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["success"] is True
    assert comp_data["status"] == "DELIVERED"
    assert "quantity_credited" in comp_data

# 10. Emergency Outbreak Simulation Endpoints
def test_emergency_simulation_cycle():
    # 1. Check initial status
    st_res = client.get("/api/emergency/status", headers=ADMIN_HEADERS)
    assert st_res.status_code == 200
    assert "available_scenarios" in st_res.json()

    # 2. Test all 4 scenarios
    scenarios = [
        ("DENGUE_OUTBREAK", "Namakkal"),
        ("MONSOON_FLOOD", "Ernakulam"),
        ("HEATWAVE_CRISIS", "Ballari"),
        ("RESPIRATORY_SURGE", "Pune"),
    ]
    for ev_type, dist in scenarios:
        sim_res = client.post("/api/emergency/simulate", headers=ADMIN_HEADERS, json={
            "event_type": ev_type,
            "affected_district_name": dist
        })
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert sim_data["status"] == "SIMULATION_ACTIVE"
        assert sim_data["event_type"] == ev_type
        assert sim_data["after_metrics"]["patient_footfall_daily"] > sim_data["before_metrics"]["patient_footfall_daily"]
        assert "recommended_emergency_actions" in sim_data
        assert len(sim_data["recommended_emergency_actions"]) > 0

    # 3. Reset outbreak simulation
    reset_res = client.post("/api/emergency/reset", headers=ADMIN_HEADERS)
    assert reset_res.status_code == 200
    assert reset_res.json()["is_active"] is False

# 11. Federated Learning (BRICS Mesh) Endpoints
def test_federated_mesh_endpoints():
    nodes_res = client.get("/api/federated/nodes", headers=ADMIN_HEADERS)
    assert nodes_res.status_code == 200
    nodes = nodes_res.json()
    assert len(nodes) == 5  # BRICS 5 countries

    rounds_res = client.get("/api/federated/rounds", headers=ADMIN_HEADERS)
    assert rounds_res.status_code == 200
    rounds = rounds_res.json()
    assert len(rounds) >= 2

    train_res = client.post("/api/federated/train-round", headers=ADMIN_HEADERS, json={"epochs_per_node": 5})
    assert train_res.status_code == 200
    assert "global_aggregated_accuracy" in train_res.json()

# 12. Google Gemini Resilience Copilot
def test_copilot_query_endpoint():
    res = client.post("/api/copilot/query", headers=ADMIN_HEADERS, json={"query": "Which PHCs are at highest risk?"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 20
    assert data["confidence"] >= 0.85

# 13. Automated System & Data Consistency Checks (Section 33 Compliance)
def test_api_health_consistency():
    """Verify that /api/health and /health return consistent database connectivity."""
    res1 = client.get("/health")
    res2 = client.get("/api/health")
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["status"] == "healthy"
    assert res1.json()["database"] == "connected"
    assert res2.json()["database"] == "connected"

def test_copilot_mode_consistency():
    """Verify copilot status mode strictly matches API key presence with zero fabrication."""
    res = client.get("/api/copilot/status", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"
    assert data["zero_fabrication_guarantee"] is True
    assert data["mode"] in ("LIVE_GEMINI", "GROUNDED_FALLBACK_DEMO")
    if not data["is_api_key_configured"]:
        assert data["mode"] == "GROUNDED_FALLBACK_DEMO"

def test_federated_consistency_guarantee():
    """Verify that federated learning rounds only exist when nodes are registered, and metrics are consistent."""
    nodes_res = client.get("/api/federated/nodes", headers=ADMIN_HEADERS)
    rounds_res = client.get("/api/federated/rounds", headers=ADMIN_HEADERS)
    assert nodes_res.status_code == 200
    assert rounds_res.status_code == 200
    nodes = nodes_res.json()
    rounds = rounds_res.json()

    assert len(nodes) == 5
    if len(nodes) > 0 and len(rounds) > 0:
        latest = rounds[-1]
        assert 0.0 <= latest["global_aggregated_accuracy"] <= 100.0
        assert latest["parameters_size_kb"] > 0
        assert len(latest["node_accuracies"]) == len(nodes)

def test_redistribution_nonexistent_fails_safely():
    """Verify that nonexistent redistribution approvals fail with 404, never faking success."""
    res = client.post("/api/redistribution/999999/approve", headers=ADMIN_HEADERS, json={"action": "approve"})
    assert res.status_code == 404

