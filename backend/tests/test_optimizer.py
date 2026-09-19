import pytest
from app.ml.optimizer import optimizer

def test_redistribution_optimizer_matching():
    # Setup test nodes with 1 shortage node and 1 surplus node
    test_nodes = [
        {
            "district_id": 1,
            "district_name": "Salem",
            "phc_id": 101,
            "phc_name": "Valapady PHC",
            "latitude": 11.65,
            "longitude": 78.41,
            "medicine_id": 1,
            "medicine_name": "ORS (Oral Rehydration Salts)",
            "current_stock": 3500,
            "daily_burn": 100.0,
            "days_remaining": 35.0,
            "risk_level": "LOW",
            "catchment_population": 50000
        },
        {
            "district_id": 2,
            "district_name": "Namakkal",
            "phc_id": 102,
            "phc_name": "Kolli Hills Tribal PHC",
            "latitude": 11.24,
            "longitude": 78.33,
            "medicine_id": 1,
            "medicine_name": "ORS (Oral Rehydration Salts)",
            "current_stock": 200,
            "daily_burn": 100.0,
            "days_remaining": 2.0,
            "risk_level": "CRITICAL",
            "catchment_population": 38000
        }
    ]

    recommendations = optimizer.generate_recommendations(test_nodes)

    assert len(recommendations) >= 1
    rec = recommendations[0]
    assert rec["source_district_name"] == "Salem"
    assert rec["dest_district_name"] == "Namakkal"
    assert rec["recommended_quantity"] >= 1000
    assert rec["estimated_transit_hours"] > 0
    assert "stock-out risk" in rec["estimated_impact"].lower()
