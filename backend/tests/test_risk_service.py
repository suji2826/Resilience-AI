"""
RESILIENCE AI — Stock-out Risk Calculation Service Test Suite
=============================================================
Validates that the AI Stock-out Risk engine computes dynamic probabilities from real DB
inventories and returns explainable factors, runway estimations, and action directives.
"""
import pytest
from app.db.session import SessionLocal
from app.services.risk_service import RiskService
from app.models.entities import Inventory, PHC, Medicine, RiskScore


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


def test_calculate_phc_medicine_risk_real_db(db_session):
    inv = db_session.query(Inventory).first()
    assert inv is not None

    risk = RiskService.calculate_phc_medicine_risk(
        db=db_session,
        phc_id=inv.phc_id,
        medicine_id=inv.medicine_id,
        persist_to_db=True
    )

    # 1. Output structure
    assert risk["phc_id"] == inv.phc_id
    assert risk["medicine_id"] == inv.medicine_id
    assert 0.0 <= risk["stock_out_probability"] <= 1.0
    assert risk["risk_level"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert risk["days_stock_remaining"] >= 0.0

    # 2. Confidence assertions
    assert "confidence" in risk
    assert 0.70 <= risk["confidence"] <= 1.0

    # 3. Contributing factors explainability
    factors = risk["contributing_factors"]
    assert "days_remaining" in factors
    assert "effective_daily_burn" in factors
    assert "supplier_lead_time_days" in factors
    assert "lead_time_deficit_days" in factors

    # 4. Actionable operational guidance
    assert "recommended_action" in risk
    assert len(risk["recommended_action"]) > 15
    assert isinstance(risk["recommended_actions"], list)
    assert len(risk["recommended_actions"]) >= 1

    # 5. Database persistence verification
    saved_rs = db_session.query(RiskScore).filter(
        RiskScore.phc_id == inv.phc_id,
        RiskScore.medicine_id == inv.medicine_id
    ).first()
    assert saved_rs is not None
    assert saved_rs.stock_out_probability == risk["stock_out_probability"]


def test_recalculate_facility_risk(db_session):
    phc = db_session.query(PHC).first()
    assert phc is not None

    res = RiskService.recalculate_facility_risk(db=db_session, phc_id=phc.id)

    assert res["phc_id"] == phc.id
    assert 0.0 <= res["composite_risk_score"] <= 1.0
    assert res["risk_category"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert res["total_medicines_evaluated"] > 0
    assert len(res["items"]) == res["total_medicines_evaluated"]
