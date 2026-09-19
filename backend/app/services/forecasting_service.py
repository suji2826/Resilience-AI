"""
RESILIENCE AI — Demand Forecasting Service
==========================================
Coordinates database telemetry extraction and invokes the DemandForecaster ML engine
to generate deterministic, explainable multi-horizon consumption predictions.
Operates directly on PostgreSQL/SQLite data.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    MedicineConsumption, PatientFootfall, PHC, Medicine, District, Forecast, EmergencyEvent,
    Inventory, RiskScore
)
from app.ml.forecasting import forecaster


class ForecastingService:

    @staticmethod
    def get_phc_medicine_forecast(
        db: Session,
        phc_id: int,
        medicine_id: int,
        horizon_days: int = 7,
        persist_to_db: bool = False
    ) -> Dict[str, Any]:
        """
        Executes ML demand forecasting for a specific PHC and medicine
        using actual historical consumption and patient footfall telemetry from the DB.
        """
        phc = db.query(PHC).filter(PHC.id == phc_id).first()
        if not phc:
            raise ValueError(f"PHC with id {phc_id} not found")

        med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
        if not med:
            raise ValueError(f"Medicine with id {medicine_id} not found")

        # 1. Fetch real historical consumption (up to 90 days)
        now = datetime.utcnow()
        start_date = (now - timedelta(days=90)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        consumption_records = db.query(MedicineConsumption).filter(
            MedicineConsumption.phc_id == phc_id,
            MedicineConsumption.medicine_id == medicine_id,
            MedicineConsumption.date >= start_date
        ).order_by(MedicineConsumption.date.asc()).all()

        # 2. Fetch real historical footfall
        footfall_records = db.query(PatientFootfall).filter(
            PatientFootfall.phc_id == phc_id,
            PatientFootfall.date >= start_date
        ).order_by(PatientFootfall.date.asc()).all()

        consumption_series = [r.quantity_consumed for r in consumption_records]
        footfall_series = [pf.total_footfall for pf in footfall_records]

        # 3. Check for active emergency outbreak event affecting this district
        active_emergency = db.query(EmergencyEvent).filter(
            EmergencyEvent.is_active == True,
            EmergencyEvent.affected_district_id == phc.district_id
        ).first()

        emergency_multiplier = float(active_emergency.medicine_demand_multiplier) if active_emergency else 1.0

        # 4. Run ML Forecaster across 7D, 14D, 30D horizons
        fc_7 = forecaster.forecast_demand(
            historical_consumption=consumption_series,
            historical_footfall=footfall_series,
            forecast_horizon_days=7,
            emergency_multiplier=emergency_multiplier
        )
        fc_14 = forecaster.forecast_demand(
            historical_consumption=consumption_series,
            historical_footfall=footfall_series,
            forecast_horizon_days=14,
            emergency_multiplier=emergency_multiplier
        )
        fc_30 = forecaster.forecast_demand(
            historical_consumption=consumption_series,
            historical_footfall=footfall_series,
            forecast_horizon_days=30,
            emergency_multiplier=emergency_multiplier
        )

        selected_fc = fc_7 if horizon_days == 7 else (fc_14 if horizon_days == 14 else fc_30)

        # 5. Extract 30-day historical points for UI plotting
        hist_points = [
            {
                "date": r.date.strftime("%Y-%m-%d"),
                "actual_demand": r.quantity_consumed,
                "is_anomaly": r.is_anomaly
            }
            for r in consumption_records[-30:]
        ]

        # 6. Fetch current inventory for this PHC/medicine
        inv = db.query(Inventory).filter(
            Inventory.phc_id == phc_id,
            Inventory.medicine_id == medicine_id
        ).first()
        current_stock = inv.current_stock if inv else 0
        incoming_stock = inv.incoming_stock if inv else 0

        # 7. Fetch latest risk score for explainability
        risk_rec = db.query(RiskScore).filter(
            RiskScore.phc_id == phc_id,
            RiskScore.medicine_id == medicine_id
        ).order_by(RiskScore.calculated_at.desc()).first()
        days_stock_remaining = risk_rec.days_stock_remaining if risk_rec else None
        stock_out_probability = risk_rec.stock_out_probability if risk_rec else None
        risk_level = risk_rec.risk_level if risk_rec else "MEDIUM"

        # 8. Optionally persist/update Forecast table in DB
        if persist_to_db and selected_fc["daily_points"]:
            now_dt = datetime.utcnow()
            for dp in selected_fc["daily_points"]:
                fc_obj = Forecast(
                    phc_id=phc_id,
                    medicine_id=medicine_id,
                    forecast_horizon_days=horizon_days,
                    predicted_daily_demand=dp["predicted_demand"],
                    total_forecasted_demand=selected_fc["total_forecasted_demand"],
                    current_avg_demand=selected_fc["current_avg_demand"],
                    demand_change_percent=selected_fc["demand_change_percent"],
                    lower_bound=dp["lower_bound"],
                    upper_bound=dp["upper_bound"],
                    confidence_score=selected_fc["confidence_score"],
                    trend=selected_fc["trend"],
                    generated_at=now_dt
                )
                db.add(fc_obj)
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
            "unit": med.unit,
            "current_stock": current_stock,
            "incoming_stock": incoming_stock,
            "days_stock_remaining": days_stock_remaining,
            "stock_out_probability": stock_out_probability,
            "risk_level": risk_level,
            "predicted_daily_demand": selected_fc["predicted_daily_demand"],
            "current_avg_daily_demand": selected_fc["current_avg_demand"],
            "forecast_7d_daily": fc_7["predicted_daily_demand"],
            "forecast_14d_daily": fc_14["predicted_daily_demand"],
            "forecast_30d_daily": fc_30["predicted_daily_demand"],
            "forecast_7d_total": fc_7["total_forecasted_demand"],
            "forecast_14d_total": fc_14["total_forecasted_demand"],
            "forecast_30d_total": fc_30["total_forecasted_demand"],
            "total_forecasted_demand": selected_fc["total_forecasted_demand"],
            "demand_change_percent": selected_fc["demand_change_percent"],
            "confidence": selected_fc["confidence"],
            "confidence_score": selected_fc["confidence_score"],
            "confidence_level": selected_fc["confidence_level"],
            "trend": selected_fc["trend"],
            "horizon_days": horizon_days,
            "forecast_points": selected_fc["daily_points"],
            "historical_points_30d": hist_points,
            "contributing_factors": selected_fc["contributing_factors"],
            "recommended_action": selected_fc["recommended_action"],
            "recommended_actions": selected_fc["recommended_actions"],
            "explainability_summary": selected_fc["explainability_summary"],
            "emergency_active": active_emergency is not None,
            "emergency_details": active_emergency.name if active_emergency else None
        }

    @staticmethod
    def get_facility_all_forecasts(
        db: Session,
        phc_id: int,
        horizon_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Runs ML demand forecasting for all medicines present at a facility.
        """
        consumptions = db.query(MedicineConsumption.medicine_id).filter(
            MedicineConsumption.phc_id == phc_id
        ).distinct().all()

        med_ids = [c[0] for c in consumptions]
        results = []
        for m_id in med_ids:
            try:
                fc = ForecastingService.get_phc_medicine_forecast(
                    db=db,
                    phc_id=phc_id,
                    medicine_id=m_id,
                    horizon_days=horizon_days,
                    persist_to_db=False
                )
                results.append(fc)
            except Exception:
                continue

        return results
