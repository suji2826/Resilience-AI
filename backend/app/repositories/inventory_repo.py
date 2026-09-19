"""
RESILIENCE AI — Inventory Repository
=====================================
Database queries for medicine inventory stock levels, risk metrics, and 30-day consumption history.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.entities import (
    Inventory, Medicine, PHC, District, State, Supplier, RiskScore, Forecast, MedicineConsumption
)
from app.ml.forecasting import forecaster
from app.ml.risk_engine import risk_engine


class InventoryRepository:

    @staticmethod
    def list_inventory(
        db: Session,
        search: Optional[str] = None,
        risk: Optional[str] = None,
        district: Optional[str] = None,
        state: Optional[str] = None,
        medicine: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[int, List[Dict[str, Any]]]:
        query = db.query(Inventory).join(Medicine).join(PHC).join(District).join(State)

        if search:
            query = query.filter(
                (Medicine.name.ilike(f"%{search}%")) |
                (Medicine.code.ilike(f"%{search}%")) |
                (PHC.name.ilike(f"%{search}%")) |
                (District.name.ilike(f"%{search}%"))
            )
        if state and state != "All":
            query = query.filter(State.name == state)
        if district and district != "All":
            query = query.filter(District.name == district)
        if medicine and medicine != "All":
            query = query.filter(Medicine.name == medicine)
        if category and category != "All":
            query = query.filter(Medicine.category == category)

        total_count = query.count()
        items = query.offset(skip).limit(limit).all()

        results = []
        for inv in items:
            rs = db.query(RiskScore).filter(
                RiskScore.phc_id == inv.phc_id,
                RiskScore.medicine_id == inv.medicine_id
            ).first()

            risk_lvl = rs.risk_level if rs else "LOW"
            if risk and risk != "All" and risk_lvl != risk:
                continue

            days_rem = rs.days_stock_remaining if rs else round(inv.current_stock / max(1.0, inv.medicine.standard_daily_demand), 1)
            prob = rs.stock_out_probability if rs else 0.10
            daily_burn = rs.daily_consumption_rate if rs else inv.medicine.standard_daily_demand
            lead_time = rs.supplier_lead_time_days if rs else 5

            results.append({
                "id": inv.id,
                "phc_id": inv.phc_id,
                "phc_name": inv.phc.name if inv.phc else "",
                "district_name": inv.phc.district.name if inv.phc and inv.phc.district else "",
                "state_name": inv.phc.district.state.name if inv.phc and inv.phc.district and inv.phc.district.state else "",
                "medicine_id": inv.medicine_id,
                "medicine_code": inv.medicine.code if inv.medicine else "",
                "medicine_name": inv.medicine.name if inv.medicine else "",
                "medicine_category": inv.medicine.category if inv.medicine else "",
                "unit": inv.medicine.unit if inv.medicine else "units",
                "current_stock": inv.current_stock,
                "daily_consumption": daily_burn,
                "days_remaining": days_rem,
                "forecasted_demand_7d": round(daily_burn * 7.5, 1),
                "incoming_stock": inv.incoming_stock,
                "supplier_lead_time_days": lead_time,
                "risk_level": risk_lvl,
                "stock_out_probability": prob,
                "last_updated": inv.last_updated.isoformat()
            })

        return total_count, results

    @staticmethod
    def get_inventory_by_id(db: Session, inventory_id: int) -> Optional[Inventory]:
        return db.query(Inventory).filter(Inventory.id == inventory_id).first()

    @staticmethod
    def get_inventory_detail(db: Session, inv: Inventory) -> Dict[str, Any]:
        rs = db.query(RiskScore).filter(
            RiskScore.phc_id == inv.phc_id,
            RiskScore.medicine_id == inv.medicine_id
        ).first()

        # 30-day historical consumption
        now = datetime.utcnow()
        start_date = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        history = db.query(MedicineConsumption).filter(
            MedicineConsumption.phc_id == inv.phc_id,
            MedicineConsumption.medicine_id == inv.medicine_id,
            MedicineConsumption.date >= start_date
        ).order_by(MedicineConsumption.date.asc()).all()

        history_points = [
            {
                "date": h.date.strftime("%Y-%m-%d"),
                "quantity_consumed": h.quantity_consumed,
                "is_anomaly": h.is_anomaly
            }
            for h in history
        ]

        # Holt-Winters 7-day forecast
        consumption_series = [h.quantity_consumed for h in history]
        fc_res = forecaster.forecast_demand(
            historical_consumption=consumption_series,
            historical_footfall=[],
            forecast_horizon_days=7
        )

        risk_calc = risk_engine.calculate_risk(
            current_stock=inv.current_stock,
            daily_consumption=fc_res["predicted_daily_demand"],
            safety_stock_days=inv.medicine.safety_stock_days if inv.medicine else 14,
            supplier_lead_time_days=inv.supplier.lead_time_days if inv.supplier else 5,
            incoming_stock=inv.incoming_stock
        )

        return {
            "id": inv.id,
            "phc_id": inv.phc_id,
            "phc_name": inv.phc.name if inv.phc else "",
            "district_name": inv.phc.district.name if inv.phc and inv.phc.district else "",
            "state_name": inv.phc.district.state.name if inv.phc and inv.phc.district and inv.phc.district.state else "",
            "medicine_id": inv.medicine_id,
            "medicine_code": inv.medicine.code if inv.medicine else "",
            "medicine_name": inv.medicine.name if inv.medicine else "",
            "medicine_category": inv.medicine.category if inv.medicine else "",
            "unit": inv.medicine.unit if inv.medicine else "units",
            "batch_number": inv.batch_number,
            "current_stock": inv.current_stock,
            "daily_consumption": round(fc_res["predicted_daily_demand"], 1),
            "days_remaining": risk_calc["days_stock_remaining"],
            "forecast_7d": round(fc_res["predicted_daily_demand"], 1),
            "forecast_14d": round(fc_res["predicted_daily_demand"] * 1.05, 1),
            "forecast_30d": round(fc_res["predicted_daily_demand"] * 1.10, 1),
            "forecast_trend": fc_res["trend"],
            "confidence_score": fc_res["confidence_score"],
            "forecast_points_7d": fc_res["daily_points"],
            "historical_consumption_30d": history_points,
            "incoming_stock": inv.incoming_stock,
            "incoming_delivery_date": inv.incoming_delivery_date.strftime("%Y-%m-%d") if inv.incoming_delivery_date else None,
            "supplier_id": inv.supplier_id,
            "supplier_name": inv.supplier.name if inv.supplier else "State Central Depot",
            "supplier_lead_time_days": inv.supplier.lead_time_days if inv.supplier else 5,
            "supplier_reliability": inv.supplier.reliability_score if inv.supplier else 0.94,
            "risk_level": risk_calc["risk_level"],
            "stock_out_probability": risk_calc["stock_out_probability"],
            "ai_risk_explanation": risk_calc.get("explainability_summary", ""),
            "contributing_factors": risk_calc.get("contributing_factors", {}),
            "recommended_action": risk_calc["recommended_action"],
            "recommended_actions": risk_calc.get("recommended_actions", []),
            "reorder_level": int((inv.medicine.safety_stock_days if inv.medicine else 14) * fc_res["predicted_daily_demand"]),
            "last_updated": inv.last_updated.isoformat()
        }
