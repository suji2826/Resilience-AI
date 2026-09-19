"""
RESILIENCE AI — Redistribution Service Test Suite
=================================================
Validates cross-district resource redistribution matching, safety stock preservation,
and explainable logistics recommendations generated from real database network state.
"""
import pytest
from app.db.session import SessionLocal
from app.services.redistribution_service import RedistributionService
from app.models.entities import RedistributionRecommendation


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


def test_redistribution_service_generate_from_db(db_session):
    res = RedistributionService.generate_network_recommendations(
        db=db_session,
        safety_stock_target_days=14,
        persist_to_db=True
    )

    assert res["success"] is True
    assert res["total_recommendations"] > 0
    assert "recommendations" in res
    assert len(res["recommendations"]) == res["total_recommendations"]

    rec = res["recommendations"][0]
    # Structure verification
    assert "recommendation_code" in rec
    assert "source_district_name" in rec
    assert "dest_district_name" in rec
    assert "recommended_quantity" in rec
    assert rec["recommended_quantity"] > 0

    # Explainability & confidence verification
    assert "confidence" in rec
    assert 0.70 <= rec["confidence"] <= 1.0
    assert "contributing_factors" in rec
    factors = rec["contributing_factors"]
    assert "source_surplus_units" in factors
    assert "dest_deficit_units" in factors
    assert "distance_km" in factors
    assert "estimated_transit_hours" in factors

    # Recommended action verification
    assert "recommended_action" in rec
    assert len(rec["recommended_action"]) > 15
    assert len(rec["recommended_actions"]) >= 2


def test_redistribution_service_list_with_explainability(db_session):
    items = RedistributionService.list_recommendations_with_explainability(
        db=db_session,
        status="RECOMMENDED"
    )

    assert len(items) > 0
    first = items[0]
    assert "id" in first
    assert "confidence" in first
    assert "contributing_factors" in first
    assert "recommended_action" in first
    assert "recommended_actions" in first


def test_multiple_recommendations_same_date_collision_resistant(db_session):
    # Running multiple recommendation generations on the same date should never crash or violate uniqueness
    res1 = RedistributionService.generate_network_recommendations(db=db_session, persist_to_db=True)
    res2 = RedistributionService.generate_network_recommendations(db=db_session, persist_to_db=True)

    assert res1["success"] is True
    assert res2["success"] is True
    assert len(res1["recommendations"]) > 0
    assert len(res2["recommendations"]) > 0

    # Ensure all codes generated are distinct
    codes1 = [r["recommendation_code"] for r in res1["recommendations"]]
    codes2 = [r["recommendation_code"] for r in res2["recommendations"]]
    assert len(codes1) == len(set(codes1))
    assert len(codes2) == len(set(codes2))
    # Different run should have distinct codes due to unique suffix
    assert set(codes1).isdisjoint(set(codes2))
