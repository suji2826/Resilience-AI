"""
RESILIENCE AI — PHC Repository
===============================
Database queries for Primary Health Centres, facility details, and bed/staff capacities.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import (
    PHC, District, State, Bed, Staff, Alert, RiskScore, Inventory, PatientFootfall
)


class PHCRepository:

    @staticmethod
    def list_phcs(
        db: Session,
        search: Optional[str] = None,
        state: Optional[str] = None,
        district: Optional[str] = None,
        risk: Optional[str] = None,
        tier: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[int, List[Dict[str, Any]]]:
        query = db.query(PHC).join(District).join(State)

        if search:
            query = query.filter(
                (PHC.name.ilike(f"%{search}%")) |
                (PHC.code.ilike(f"%{search}%")) |
                (District.name.ilike(f"%{search}%"))
            )
        if state and state != "All":
            query = query.filter(State.name == state)
        if district and district != "All":
            query = query.filter(District.name == district)
        if risk and risk != "All":
            query = query.filter(PHC.risk_category == risk)
        if tier and tier != "All":
            query = query.filter(PHC.tier == tier)

        total_count = query.count()
        phcs = query.offset(skip).limit(limit).all()

        results = []
        for p in phcs:
            bed_occ = p.beds.occupancy_rate if p.beds else 0.5
            staff_att = (p.staff[0].attendance_rate if p.staff else 0.9)
            risk_meds = db.query(RiskScore).filter(
                RiskScore.phc_id == p.id,
                RiskScore.risk_level.in_(["CRITICAL", "HIGH"])
            ).count()
            alerts_count = db.query(Alert).filter(Alert.phc_id == p.id, Alert.status == "ACTIVE").count()

            results.append({
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "district_id": p.district_id,
                "district_name": p.district.name if p.district else "",
                "state_name": p.district.state.name if p.district and p.district.state else "",
                "tier": p.tier,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "catchment_population": p.catchment_population,
                "contact_phone": p.contact_phone,
                "is_active": p.is_active,
                "current_risk_score": p.current_risk_score,
                "risk_category": p.risk_category,
                "total_beds": p.beds.total_beds if p.beds else 0,
                "occupied_beds": p.beds.occupied_beds if p.beds else 0,
                "available_beds": p.beds.available_beds if p.beds else 0,
                "occupancy_rate": round(bed_occ * 100.0, 1),
                "attendance_rate": round(staff_att * 100.0, 1),
                "medicines_at_risk": risk_meds,
                "active_alerts": alerts_count,
            })

        return total_count, results

    @staticmethod
    def get_phc_by_id(db: Session, phc_id: int) -> Optional[PHC]:
        return db.query(PHC).filter(PHC.id == phc_id).first()

    @staticmethod
    def get_phc_detail(db: Session, phc: PHC) -> Dict[str, Any]:
        bed = phc.beds
        staff_members = phc.staff
        total_sanctioned = sum(s.sanctioned_count for s in staff_members)
        total_present = sum(s.present_today for s in staff_members)

        # Critical medicines for this PHC
        risk_scores = db.query(RiskScore).filter(RiskScore.phc_id == phc.id)\
            .order_by(RiskScore.stock_out_probability.desc())\
            .limit(8).all()

        crit_meds = []
        for rs in risk_scores:
            inv = db.query(Inventory).filter(
                Inventory.phc_id == phc.id,
                Inventory.medicine_id == rs.medicine_id
            ).first()
            crit_meds.append({
                "medicine_id": rs.medicine_id,
                "medicine_name": rs.medicine.name if rs.medicine else "",
                "current_stock": rs.current_stock,
                "daily_consumption": rs.daily_consumption_rate,
                "days_remaining": rs.days_stock_remaining,
                "supplier_lead_time_days": rs.supplier_lead_time_days,
                "risk_level": rs.risk_level,
                "stock_out_probability": rs.stock_out_probability,
                "recommended_action": rs.recommended_action
            })

        # 14-day footfall history
        now = datetime.utcnow()
        start_date = (now - timedelta(days=14)).replace(hour=0, minute=0, second=0, microsecond=0)
        footfall_history = db.query(PatientFootfall).filter(
            PatientFootfall.phc_id == phc.id,
            PatientFootfall.date >= start_date
        ).order_by(PatientFootfall.date.asc()).all()

        ff_data = [
            {
                "date": f.date.strftime("%Y-%m-%d"),
                "outpatient": f.outpatient_count,
                "inpatient": f.inpatient_count,
                "emergency": f.emergency_count,
                "fever_respiratory": f.fever_respiratory_count,
                "total": f.total_footfall,
                "is_surge": f.is_surge_anomaly
            }
            for f in footfall_history
        ]

        # Active Alerts for this PHC
        alerts = db.query(Alert).filter(Alert.phc_id == phc.id).order_by(Alert.created_at.desc()).limit(5).all()
        alerts_data = [
            {
                "id": a.id,
                "alert_code": a.alert_code,
                "category": a.category,
                "severity": a.severity,
                "title": a.title,
                "reason": a.reason,
                "status": a.status,
                "created_at": a.created_at.isoformat()
            }
            for a in alerts
        ]

        return {
            "id": phc.id,
            "code": phc.code,
            "name": phc.name,
            "district_id": phc.district_id,
            "district_name": phc.district.name if phc.district else "",
            "state_name": phc.district.state.name if phc.district and phc.district.state else "",
            "tier": phc.tier,
            "latitude": phc.latitude,
            "longitude": phc.longitude,
            "catchment_population": phc.catchment_population,
            "contact_phone": phc.contact_phone,
            "is_active": phc.is_active,
            "current_risk_score": phc.current_risk_score,
            "risk_category": phc.risk_category,
            "beds": {
                "total": bed.total_beds if bed else 0,
                "occupied": bed.occupied_beds if bed else 0,
                "available": bed.available_beds if bed else 0,
                "icu_total": bed.icu_beds if bed else 0,
                "icu_occupied": bed.icu_occupied if bed else 0,
                "oxygen_total": bed.oxygen_beds if bed else 0,
                "oxygen_occupied": bed.oxygen_occupied if bed else 0,
                "isolation_total": bed.isolation_beds if bed else 0,
                "isolation_occupied": bed.isolation_occupied if bed else 0,
                "occupancy_rate": round(bed.occupancy_rate * 100.0, 1) if bed else 0.0
            },
            "workforce": {
                "total_sanctioned": total_sanctioned,
                "total_present": total_present,
                "attendance_rate": round((total_present / total_sanctioned * 100.0), 1) if total_sanctioned > 0 else 100.0,
                "roles": [
                    {
                        "role_type": s.role_type,
                        "sanctioned": s.sanctioned_count,
                        "present": s.present_today,
                        "on_leave": s.on_leave,
                        "attendance_rate": round(s.attendance_rate * 100.0, 1)
                    }
                    for s in staff_members
                ]
            },
            "critical_medicines": crit_meds,
            "footfall_history_14d": ff_data,
            "active_alerts": alerts_data
        }
