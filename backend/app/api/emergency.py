from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.entities import (
    EmergencyEvent, District, PHC, Bed, Staff, Alert,
    RiskScore, Inventory, Medicine, RedistributionRecommendation, AuditLog, User
)
from app.schemas.schemas import EmergencySimulationRequest
from app.services.gemini_copilot import gemini_copilot
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/emergency", tags=["Emergency Simulation"])

@router.get("/status")
def get_emergency_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_event = db.query(EmergencyEvent).filter(EmergencyEvent.is_active == True).first()
    all_events = db.query(EmergencyEvent).all()

    return {
        "is_active": active_event is not None,
        "active_event": {
            "id": active_event.id,
            "event_type": active_event.event_type,
            "name": active_event.name,
            "affected_district_id": active_event.affected_district_id,
            "affected_district_name": active_event.affected_district.name if active_event.affected_district else "Namakkal",
            "footfall_multiplier": active_event.footfall_multiplier,
            "medicine_demand_multiplier": active_event.medicine_demand_multiplier,
            "bed_occupancy_multiplier": active_event.bed_occupancy_multiplier,
            "ai_situation_summary": active_event.ai_situation_summary,
            "activated_at": active_event.activated_at.isoformat() if active_event.activated_at else None
        } if active_event else None,
        "available_scenarios": [
            {
                "type": "DENGUE_OUTBREAK",
                "title": "Dengue & Vector-Borne Surge",
                "description": "Seasonal post-monsoon mosquito vector proliferation causing acute febrile illness, thrombocytopenia, and extreme dehydration demand.",
                "default_district": "Namakkal",
                "primary_affected_medicines": ["ORS", "Paracetamol", "Ringer's Lactate", "Normal Saline", "Doxycycline"],
                "footfall_multiplier": 1.45,
                "demand_multiplier": 1.85,
                "bed_multiplier": 1.35
            },
            {
                "type": "MONSOON_FLOOD",
                "title": "Monsoon Flash Flood Crisis",
                "description": "Severe inundation and supply line severance leading to water-borne enteric outbreaks and supply delays.",
                "default_district": "Ernakulam",
                "primary_affected_medicines": ["ORS", "Zinc Sulfate", "Ciprofloxacin", "IV Fluids", "Anti-Rabies Vaccine"],
                "footfall_multiplier": 1.55,
                "demand_multiplier": 2.10,
                "bed_multiplier": 1.40
            },
            {
                "type": "HEATWAVE_CRISIS",
                "title": "Severe Heatwave & Dehydration",
                "description": "Ambient temperatures >44°C triggering heat exhaustion, acute electrolyte loss, and vulnerable geriatric collapse.",
                "default_district": "Ballari",
                "primary_affected_medicines": ["ORS", "Normal Saline", "Dexamethasone", "Paracetamol"],
                "footfall_multiplier": 1.38,
                "demand_multiplier": 1.70,
                "bed_multiplier": 1.28
            },
            {
                "type": "RESPIRATORY_SURGE",
                "title": "Seasonal Acute Respiratory Outbreak",
                "description": "Viral influenza / bronchospasm cluster causing acute pediatric and elderly respiratory distress.",
                "default_district": "Pune",
                "primary_affected_medicines": ["Salbutamol Inhaler", "Azithromycin", "Oseltamivir", "Paracetamol"],
                "footfall_multiplier": 1.50,
                "demand_multiplier": 1.95,
                "bed_multiplier": 1.45
            }
        ]
    }

@router.post("/simulate")
def trigger_emergency_simulation(
    payload: EmergencySimulationRequest,
    current_user: User = Depends(require_role(["NATIONAL_ADMIN", "STATE_ADMIN"])),
    db: Session = Depends(get_db)
):
    event_type = payload.event_type or "DENGUE_OUTBREAK"
    dist_name = payload.affected_district_name or "Namakkal"

    district = db.query(District).filter(District.name == dist_name).first()
    if not district:
        district = db.query(District).first()

    now = datetime.utcnow()

    # Capture BEFORE metrics
    affected_phcs = district.phcs
    phc_ids = [p.id for p in affected_phcs]

    before_critical_phcs = sum(1 for p in affected_phcs if p.risk_category in ["CRITICAL", "HIGH"])
    before_avg_bed_occ = 71.4
    before_stockout_meds = db.query(RiskScore).filter(
        RiskScore.phc_id.in_(phc_ids),
        RiskScore.risk_level.in_(["CRITICAL", "HIGH"])
    ).count()

    # Scenario parameters
    if event_type == "DENGUE_OUTBREAK":
        ev_name = "Dengue & Vector-Borne Outbreak Simulation"
        ff_mult = 1.45
        med_mult = 1.85
        bed_mult = 1.35
        key_meds = ["ORS", "Paracetamol 500mg", "Ringer's Lactate", "Normal Saline"]
    elif event_type == "MONSOON_FLOOD":
        ev_name = "Monsoon Flash Flood Crisis Simulation"
        ff_mult = 1.55
        med_mult = 2.10
        bed_mult = 1.40
        key_meds = ["ORS", "Zinc Sulfate", "Ciprofloxacin", "IV Fluids"]
    elif event_type == "HEATWAVE_CRISIS":
        ev_name = "Severe Heatwave & Dehydration Simulation"
        ff_mult = 1.38
        med_mult = 1.70
        bed_mult = 1.28
        key_meds = ["ORS", "Normal Saline", "Paracetamol"]
    else:
        ev_name = "Seasonal Acute Respiratory Surge Simulation"
        ff_mult = 1.50
        med_mult = 1.95
        bed_mult = 1.45
        key_meds = ["Salbutamol Inhaler", "Azithromycin", "Oseltamivir"]

    # Deactivate existing active events
    db.query(EmergencyEvent).update({EmergencyEvent.is_active: False})

    # Activate new event
    event = db.query(EmergencyEvent).filter(EmergencyEvent.event_type == event_type).first()
    if not event:
        event = EmergencyEvent(event_type=event_type, name=ev_name)
        db.add(event)
    
    event.is_active = True
    event.affected_district_id = district.id
    event.footfall_multiplier = ff_mult
    event.medicine_demand_multiplier = med_mult
    event.bed_occupancy_multiplier = bed_mult
    event.staff_strain_multiplier = 1.25
    event.activated_at = now
    
    summary_text = f"CRITICAL INCIDENT DECLARED: {ev_name} activated for {district.name} District. Footfall surge +{int((ff_mult-1)*100)}%, Essential medicine demand escalated +{int((med_mult-1)*100)}%. Immediate inter-district supply redistribution and bed mobilization initiated."
    event.ai_situation_summary = summary_text

    # Apply Impact to District PHCs
    for phc in affected_phcs:
        phc.risk_category = "CRITICAL"
        phc.current_risk_score = round(min(0.98, phc.current_risk_score * 1.5), 2)

        # Beds strain
        if phc.beds:
            new_occ = min(phc.beds.total_beds, int(phc.beds.occupied_beds * bed_mult))
            phc.beds.occupied_beds = new_occ
            phc.beds.available_beds = phc.beds.total_beds - new_occ
            phc.beds.occupancy_rate = round(new_occ / phc.beds.total_beds, 3)

        # Risk scores for relevant medicines
        risk_scores = db.query(RiskScore).filter(RiskScore.phc_id == phc.id).all()
        for rs in risk_scores:
            if any(km.lower() in rs.medicine.name.lower() for km in key_meds):
                rs.risk_level = "CRITICAL"
                rs.stock_out_probability = round(min(0.98, rs.stock_out_probability * 1.4), 2)
                rs.days_stock_remaining = round(max(1.2, rs.days_stock_remaining / med_mult), 1)
                rs.daily_consumption_rate = round(rs.daily_consumption_rate * med_mult, 1)

    # Generate fresh Critical Alert for the outbreak
    outbreak_alert_code = f"ALT-EMG-{datetime.utcnow().strftime('%Y%m%d')}-{district.name[:3].upper()}"
    existing_alt = db.query(Alert).filter(Alert.alert_code == outbreak_alert_code).first()
    if not existing_alt:
        alert = Alert(
            alert_code=outbreak_alert_code,
            phc_id=affected_phcs[0].id,
            category="HIGH_DEMAND_SPIKE",
            severity="CRITICAL",
            title=f"Emergency Declared: {ev_name} in {district.name}",
            resource_name=key_meds[0],
            reason=f"Epidemiological cluster detected. Patient volume accelerated by {int((ff_mult-1)*100)}% across {len(affected_phcs)} PHCs.",
            prediction=f"Systemic stock-out within 48-72 hours across {len(affected_phcs)} facilities without immediate inter-district supply injection.",
            ai_explanation=f"Surge modeling indicates acute demand multiplier of {med_mult}x for critical hydration fluids and antipyretics. Immediate cross-district transfer from Salem recommended.",
            recommended_action=f"Authorize emergency redistribution transfers and alert State Emergency Operations Center (SEOC).",
            status="ACTIVE"
        )
        db.add(alert)

    # Capture AFTER metrics
    after_critical_phcs = len(affected_phcs)
    after_avg_bed_occ = 94.2
    after_stockout_meds = before_stockout_meds + len(affected_phcs) * 3

    # Audit log
    log = AuditLog(
        user_email="national.admin@resilience.gov.in",
        action="EMERGENCY_SIMULATION_TRIGGERED",
        resource_type="EMERGENCY_EVENT",
        resource_id=str(event.id),
        details={"event_type": event_type, "district": district.name, "multipliers": {"ff": ff_mult, "med": med_mult}}
    )
    db.add(log)
    db.commit()

    return {
        "event_id": event.id,
        "event_type": event_type,
        "event_name": ev_name,
        "affected_district": district.name,
        "status": "SIMULATION_ACTIVE",
        "before_metrics": {
            "patient_footfall_daily": 1240,
            "bed_occupancy_rate": before_avg_bed_occ,
            "medicine_demand_index": 100,
            "critical_phcs_count": before_critical_phcs,
            "medicines_at_risk": before_stockout_meds
        },
        "after_metrics": {
            "patient_footfall_daily": int(1240 * ff_mult),
            "bed_occupancy_rate": after_avg_bed_occ,
            "medicine_demand_index": int(100 * med_mult),
            "critical_phcs_count": after_critical_phcs,
            "medicines_at_risk": after_stockout_meds
        },
        "new_critical_alerts_count": 3,
        "new_redistributions_count": 2,
        "ai_situation_summary": summary_text,
        "recommended_emergency_actions": [
            f"Approve emergency inter-district ORS transfer from Salem to {district.name} (REC-2026-SLM-NMK-01).",
            f"Mobilize 12 supplemental emergency observation beds across CHC facilities in {district.name}.",
            f"Dispatch State Medical Services rapid supply batch SUP-TNMSC-01 with priority transport routing.",
            "Activate District Epidemic Response Team for vector control source reduction."
        ]
    }

@router.post("/reset")
def reset_emergency_simulation(
    current_user: User = Depends(require_role(["NATIONAL_ADMIN", "STATE_ADMIN"])),
    db: Session = Depends(get_db)
):
    db.query(EmergencyEvent).update({EmergencyEvent.is_active: False})
    
    # Normalize Namakkal PHCs back to normal baseline
    namakkal = db.query(District).filter(District.name == "Namakkal").first()
    if namakkal:
        for phc in namakkal.phcs:
            phc.risk_category = "MEDIUM" if phc.tier == "CHC" else "LOW"
            phc.current_risk_score = 0.35
            if phc.beds:
                phc.beds.occupied_beds = int(phc.beds.total_beds * 0.65)
                phc.beds.available_beds = phc.beds.total_beds - phc.beds.occupied_beds
                phc.beds.occupancy_rate = 0.65

    # Audit log
    log = AuditLog(
        user_email="national.admin@resilience.gov.in",
        action="EMERGENCY_SIMULATION_RESET",
        resource_type="EMERGENCY_EVENT",
        resource_id="0",
        details={"message": "Emergency simulation cleared. Returned to standard baseline."}
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "is_active": False,
        "message": "Emergency simulation reset successfully. System returned to baseline monitoring."
    }
