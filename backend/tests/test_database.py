import pytest
from sqlalchemy import func, text
from app.db.session import SessionLocal
from app.data.generator import SyntheticDataGenerator, SYNTHETIC_DATA_DISCLAIMER
from app.models.entities import (
    Country, State, District, PHC, Medicine, Supplier, Inventory,
    MedicineConsumption, PatientFootfall, Bed, Staff, StaffAttendance,
    Alert, RedistributionRecommendation, EmergencyEvent, FederatedNode,
    AuditLog
)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

def test_database_entity_counts(db_session):
    # Verify core entities are populated
    phc_count = db_session.query(PHC).count()
    assert phc_count >= 90, f"Expected >= 90 PHCs, found {phc_count}"

    med_count = db_session.query(Medicine).count()
    assert med_count >= 20, f"Expected >= 20 medicines, found {med_count}"

    dist_count = db_session.query(District).count()
    assert dist_count >= 20, f"Expected >= 20 districts, found {dist_count}"

    state_count = db_session.query(State).count()
    assert state_count == 6, f"Expected 6 states, found {state_count}"

    country_count = db_session.query(Country).count()
    assert country_count == 5, f"Expected 5 BRICS countries, found {country_count}"

def test_inventory_and_timeseries_integrity(db_session):
    # Verify inventory records exist per PHC
    inv_count = db_session.query(Inventory).count()
    phc_count = db_session.query(PHC).count()
    med_count = db_session.query(Medicine).count()
    assert inv_count == phc_count * med_count, "Each PHC must have inventory rows for all medicines"

    # Verify time-series data exists
    footfall_count = db_session.query(PatientFootfall).count()
    assert footfall_count > 1000, "Patient footfall time-series must be populated"

    consumption_count = db_session.query(MedicineConsumption).count()
    assert consumption_count > 10000, "Medicine consumption time-series must be populated"

def test_facility_resources_and_workforce(db_session):
    # Verify beds 1-to-1 relationship with PHCs
    bed_count = db_session.query(Bed).count()
    phc_count = db_session.query(PHC).count()
    assert bed_count == phc_count, "Every PHC must have an associated bed census record"

    # Verify staff rosters
    staff_count = db_session.query(Staff).count()
    assert staff_count == phc_count * 5, "Every PHC must have 5 sanctioned staff categories"

    # Verify attendance
    att_count = db_session.query(StaffAttendance).count()
    assert att_count >= staff_count, "Staff attendance records must be generated"

def test_synthetic_data_labeling_and_provenance(db_session):
    # Verify synthetic provenance in audit logs
    audit = db_session.query(AuditLog).filter(AuditLog.action == "SYSTEM_INITIALIZED").first()
    assert audit is not None, "System initialization audit record must exist"
    assert "provenance" in audit.details
    assert "DEMONSTRATION DATA ONLY" in audit.details["provenance"]

def test_crisis_district_and_redistribution_scenario(db_session):
    # Verify Namakkal is marked with CRITICAL risk
    namakkal = db_session.query(District).filter(District.name == "Namakkal").first()
    assert namakkal is not None
    assert namakkal.risk_level == "CRITICAL"

    # Verify Salem is marked as healthy surplus
    salem = db_session.query(District).filter(District.name == "Salem").first()
    assert salem is not None
    assert salem.risk_level == "LOW"

    # Verify linear redistribution recommendation connects Salem surplus to Namakkal shortage
    rec = db_session.query(RedistributionRecommendation).filter(
        RedistributionRecommendation.recommendation_code == "REC-2026-SLM-NMK-01"
    ).first()
    assert rec is not None
    assert rec.source_district_id == salem.id
    assert rec.dest_district_id == namakkal.id
    assert rec.recommended_quantity == 1900

def test_complex_analytical_sql_queries(db_session):
    # Aggregation query: Total bed capacity vs total occupied across state
    result = db_session.query(
        State.name,
        func.count(PHC.id).label("phc_count"),
        func.sum(Bed.total_beds).label("total_beds"),
        func.sum(Bed.occupied_beds).label("occupied_beds")
    ).join(District, District.state_id == State.id)\
     .join(PHC, PHC.district_id == District.id)\
     .join(Bed, Bed.phc_id == PHC.id)\
     .group_by(State.name)\
     .all()

    assert len(result) == 6
    for st_name, phcs, tot_b, occ_b in result:
        assert phcs > 0
        assert tot_b > 0
        assert occ_b > 0
        assert occ_b <= tot_b
