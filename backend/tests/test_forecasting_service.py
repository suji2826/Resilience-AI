"""
RESILIENCE AI — Demand Forecasting Service Test Suite
=====================================================
Validates that the AI Demand Forecasting engine operates directly on synthetic database
telemetry and returns explainable results with confidence, contributing factors, and actions.
"""
import pytest
from app.db.session import SessionLocal
from app.services.forecasting_service import ForecastingService
from app.models.entities import PHC, Medicine, MedicineConsumption, PatientFootfall


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


def test_forecasting_service_real_db_data(db_session):
    # Retrieve a known PHC and medicine
    phc = db_session.query(PHC).filter(PHC.code == "PHC-TN-NMK-01").first() or db_session.query(PHC).first()
    med = db_session.query(Medicine).filter(Medicine.code == "MED-ORS-01").first() or db_session.query(Medicine).first()

    assert phc is not None
    assert med is not None

    forecast = ForecastingService.get_phc_medicine_forecast(
        db=db_session,
        phc_id=phc.id,
        medicine_id=med.id,
        horizon_days=7
    )

    # 1. Output structure assertions
    assert forecast["phc_id"] == phc.id
    assert forecast["medicine_id"] == med.id
    assert forecast["predicted_daily_demand"] > 0
    assert forecast["total_forecasted_demand"] > 0
    assert forecast["horizon_days"] == 7
    assert len(forecast["forecast_points"]) == 7

    # 2. Confidence assertions
    assert "confidence" in forecast
    assert 0.70 <= forecast["confidence"] <= 1.0
    assert forecast["confidence_level"] in ["HIGH", "MODERATE", "LOW"]

    # 3. Contributing factors explainability
    factors = forecast["contributing_factors"]
    assert "baseline_daily_consumption" in factors
    assert "footfall_elasticity_factor" in factors
    assert "trend_growth_rate_percent" in factors
    assert factors["sample_history_days"] > 0

    # 4. Actionable recommendations
    assert "recommended_action" in forecast
    assert len(forecast["recommended_action"]) > 15
    assert isinstance(forecast["recommended_actions"], list)
    assert len(forecast["recommended_actions"]) >= 1

    # 5. Uncertainty bounds
    first_pt = forecast["forecast_points"][0]
    assert first_pt["lower_bound"] <= first_pt["predicted_demand"] <= first_pt["upper_bound"]


def test_forecasting_multi_horizon(db_session):
    phc = db_session.query(PHC).first()
    med = db_session.query(Medicine).first()

    for horizon in [7, 14, 30]:
        fc = ForecastingService.get_phc_medicine_forecast(
            db=db_session,
            phc_id=phc.id,
            medicine_id=med.id,
            horizon_days=horizon
        )
        assert len(fc["forecast_points"]) == horizon
        assert fc["total_forecasted_demand"] > fc["predicted_daily_demand"]


def test_facility_all_forecasts(db_session):
    phc = db_session.query(PHC).first()
    results = ForecastingService.get_facility_all_forecasts(
        db=db_session,
        phc_id=phc.id,
        horizon_days=7
    )
    assert len(results) > 0
    assert all("predicted_daily_demand" in r for r in results)
