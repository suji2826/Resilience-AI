"""
RESILIENCE AI — Stock-out Risk Calculation Service
==================================================
Coordinates inventory depletion telemetry, supplier lead times, and outbreak demand
acceleration to compute live, explainable stock-out risk metrics across facilities.
Operates directly on PostgreSQL/SQLite data.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import (
    Inventory, RiskScore, PHC, Medicine, District, State, Supplier,
    MedicineConsumption, PatientFootfall, EmergencyEvent
)
from app.ml.risk_engine import risk_engine
from app.ml.forecasting import forecaster


class RiskService:

    @staticmethod
    def calculate_phc_medicine_risk(
        db: Session,
        phc_id: int,
        medicine_id: int,
        persist_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        Calculates live stock-out risk for a specific PHC and medicine
        using real inventory levels, historical consumption velocity, and supplier metrics.
        """
        inv = db.query(Inventory).filter(
            Inventory.phc_id == phc_id,
            Inventory.medicine_id == medicine_id
        ).first()

        if not inv:
            raise ValueError(f"Inventory not found for PHC {phc_id} and Medicine {medicine_id}")

        phc = inv.phc
        med = inv.medicine
        supplier = inv.supplier

        # 1. Fetch recent 14-day daily consumption velocity
        now = datetime.utcnow()
        start_date = (now - timedelta(days=14)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        recent_cons = db.query(MedicineConsumption.quantity_consumed).filter(
            MedicineConsumption.phc_id == phc_id,
            MedicineConsumption.medicine_id == medicine_id,
            MedicineConsumption.date >= start_date
        ).all()

        if recent_cons:
            daily_burn = float(np_mean := sum(r[0] for r in recent_cons) / len(recent_cons))
        else:
            daily_burn = float(med.standard_daily_demand if med else 50.0)

        # 2. Check footfall surge rate in recent 7 days vs prior
        recent_ff = db.query(func.avg(PatientFootfall.total_footfall)).filter(
            PatientFootfall.phc_id == phc_id,
            PatientFootfall.date >= (now - timedelta(days=7))
        ).scalar() or 100.0

        prior_ff = db.query(func.avg(PatientFootfall.total_footfall)).filter(
            PatientFootfall.phc_id == phc_id,
            PatientFootfall.date < (now - timedelta(days=7)),
            PatientFootfall.date >= (now - timedelta(days=21))
        ).scalar() or 100.0

        footfall_surge_pct = max(0.0, ((recent_ff - prior_ff) / max(1.0, prior_ff)) * 100.0)

        # 3. Check for active emergency event
        active_emergency = db.query(EmergencyEvent).filter(
            EmergencyEvent.is_active == True,
            EmergencyEvent.affected_district_id == phc.district_id
        ).first()

        emergency_multiplier = float(active_emergency.medicine_demand_multiplier) if active_emergency else 1.0

        # 4. Invoke ML Risk Engine
        lead_time = int(supplier.lead_time_days if supplier else 5)
        safety_days = int(med.safety_stock_days if med else 14)

        risk_res = risk_engine.calculate_risk(
            current_stock=inv.current_stock,
            daily_consumption=daily_burn,
            safety_stock_days=safety_days,
            supplier_lead_time_days=lead_time,
            incoming_stock=inv.incoming_stock,
            footfall_surge_pct=footfall_surge_pct,
            emergency_multiplier=emergency_multiplier
        )

        # 5. Persist or Update RiskScore in DB
        if persist_to_db:
            rs = db.query(RiskScore).filter(
                RiskScore.phc_id == phc_id,
                RiskScore.medicine_id == medicine_id
            ).first()

            if rs:
                rs.stock_out_probability = risk_res["stock_out_probability"]
                rs.risk_level = risk_res["risk_level"]
                rs.days_stock_remaining = risk_res["days_stock_remaining"]
                rs.current_stock = inv.current_stock
                rs.daily_consumption_rate = risk_res["effective_daily_rate"]
                rs.supplier_lead_time_days = lead_time
                rs.contributing_factors = risk_res["contributing_factors"]
                rs.recommended_action = risk_res["recommended_action"]
                rs.confidence = risk_res["confidence"]
                rs.calculated_at = now
            else:
                rs = RiskScore(
                    phc_id=phc_id,
                    medicine_id=medicine_id,
                    stock_out_probability=risk_res["stock_out_probability"],
                    risk_level=risk_res["risk_level"],
                    days_stock_remaining=risk_res["days_stock_remaining"],
                    current_stock=inv.current_stock,
                    daily_consumption_rate=risk_res["effective_daily_rate"],
                    supplier_lead_time_days=lead_time,
                    contributing_factors=risk_res["contributing_factors"],
                    recommended_action=risk_res["recommended_action"],
                    confidence=risk_res["confidence"],
                    calculated_at=now
                )
                db.add(rs)
            db.commit()

        return {
            "phc_id": phc.id,
            "phc_name": phc.name,
            "district_name": phc.district.name if phc.district else "",
            "state_name": phc.district.state.name if phc.district and phc.district.state else "",
            "medicine_id": med.id,
            "medicine_code": med.code,
            "medicine_name": med.name,
            "medicine_category": med.category,
            "current_stock": inv.current_stock,
            "daily_consumption_rate": risk_res["effective_daily_rate"],
            "days_stock_remaining": risk_res["days_stock_remaining"],
            "stock_out_probability": risk_res["stock_out_probability"],
            "risk_level": risk_res["risk_level"],
            "supplier_lead_time_days": lead_time,
            "supplier_name": supplier.name if supplier else "State Central Depot",
            "incoming_stock": inv.incoming_stock,
            "confidence": risk_res["confidence"],
            "confidence_score": risk_res["confidence_score"],
            "contributing_factors": risk_res["contributing_factors"],
            "recommended_action": risk_res["recommended_action"],
            "recommended_actions": risk_res["recommended_actions"],
            "explainability_summary": risk_res["explainability_summary"],
            "calculated_at": now.isoformat()
        }

    @staticmethod
    def recalculate_facility_risk(
        db: Session,
        phc_id: int
    ) -> Dict[str, Any]:
        """
        Recalculates risk scores for all medicines at a PHC and updates
        the PHC's overall risk category.
        """
        inventories = db.query(Inventory).filter(Inventory.phc_id == phc_id).all()
        risk_results = []
        scores = []

        for inv in inventories:
            res = RiskService.calculate_phc_medicine_risk(
                db=db,
                phc_id=phc_id,
                medicine_id=inv.medicine_id,
                persist_to_db=True
            )
            risk_results.append(res)
            scores.append(res["stock_out_probability"])

        avg_score = sum(scores) / len(scores) if scores else 0.15
        max_score = max(scores) if scores else 0.15
        # Composite score weights the most critical item 50%
        composite = round(0.5 * max_score + 0.5 * avg_score, 2)

        phc = db.query(PHC).filter(PHC.id == phc_id).first()
        if phc:
            phc.current_risk_score = composite
            if composite >= 0.75:
                phc.risk_category = "CRITICAL"
            elif composite >= 0.55:
                phc.risk_category = "HIGH"
            elif composite >= 0.35:
                phc.risk_category = "MEDIUM"
            else:
                phc.risk_category = "LOW"
            db.commit()

        return {
            "phc_id": phc_id,
            "phc_name": phc.name if phc else "",
            "composite_risk_score": composite,
            "risk_category": phc.risk_category if phc else "LOW",
            "total_medicines_evaluated": len(risk_results),
            "critical_medicines_count": sum(1 for r in risk_results if r["risk_level"] == "CRITICAL"),
            "high_medicines_count": sum(1 for r in risk_results if r["risk_level"] == "HIGH"),
            "items": risk_results
        }
