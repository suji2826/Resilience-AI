import pytest
from app.ml.risk_engine import risk_engine

def test_risk_engine_critical_shortage():
    # 200 units stock, daily consumption 90 units/day -> ~2.2 days left
    # Lead time is 5 days -> Lead time deficit -> CRITICAL Risk
    res = risk_engine.calculate_risk(
        current_stock=200,
        daily_consumption=90.0,
        safety_stock_days=14,
        supplier_lead_time_days=5,
        incoming_stock=0,
        footfall_surge_pct=35.0
    )

    assert res["risk_level"] == "CRITICAL"
    assert res["stock_out_probability"] >= 0.80
    assert res["days_stock_remaining"] < 3.0
    assert "cross-district redistribution" in res["recommended_action"].lower()

def test_risk_engine_healthy_surplus():
    # 3500 units stock, daily consumption 100 units/day -> 35 days left -> LOW Risk
    res = risk_engine.calculate_risk(
        current_stock=3500,
        daily_consumption=100.0,
        safety_stock_days=14,
        supplier_lead_time_days=5,
        incoming_stock=500
    )

    assert res["risk_level"] == "LOW"
    assert res["stock_out_probability"] <= 0.20
    assert res["days_stock_remaining"] >= 30.0
