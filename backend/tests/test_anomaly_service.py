"""
RESILIENCE AI — Anomaly Detection Service Test Suite
====================================================
Validates multivariate statistical anomaly detection on real database telemetry,
ensuring results are mathematically computed rather than hardcoded.
"""
import pytest
from app.db.session import SessionLocal
from app.services.anomaly_service import AnomalyService
from app.ml.anomaly_detector import anomaly_detector
from app.models.entities import PHC, PatientFootfall


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


def test_anomaly_detector_synthetic_spike():
    # Normal baseline around 100 with small noise, followed by an anomalous spike of 320
    series = [100.0 + (i % 5) * 2.0 for i in range(25)] + [320.0]

    res = anomaly_detector.detect_series_anomaly(
        values=series,
        metric_name="ORS Consumption",
        z_threshold=2.0
    )

    assert res["is_anomaly"] is True
    assert res["z_score"] >= 2.0
    assert res["deviation_percent"] > 100.0
    assert res["severity"] in ["CRITICAL", "HIGH"]
    assert res["confidence"] >= 0.80

    # Contributing factors check
    assert "baseline_mean" in res["contributing_factors"]
    assert "median_absolute_deviation" in res["contributing_factors"]
    assert "iqr_upper_threshold" in res["contributing_factors"]

    # Recommended action check
    assert "recommended_action" in res
    assert len(res["recommended_action"]) > 20
    assert len(res["recommended_actions"]) >= 1


def test_anomaly_detector_normal_series():
    # Stable series with mild fluctuations within normal baseline
    series = [100.0 + (i % 7) * 3.0 for i in range(30)]

    res = anomaly_detector.detect_series_anomaly(
        values=series,
        metric_name="Patient Footfall",
        z_threshold=2.2
    )

    assert res["is_anomaly"] is False
    assert res["severity"] == "NORMAL"
    assert res["z_score"] < 2.2


def test_anomaly_service_scan_network(db_session):
    scan_res = AnomalyService.scan_network_anomalies(db=db_session, limit=20)

    assert "total_anomalies_active" in scan_res
    assert "anomalies" in scan_res
    assert isinstance(scan_res["anomalies"], list)

    if scan_res["anomalies"]:
        first = scan_res["anomalies"][0]
        assert "phc_id" in first
        assert "metric_name" in first
        assert "z_score" in first
        assert "confidence" in first
        assert "contributing_factors" in first
        assert "recommended_action" in first
