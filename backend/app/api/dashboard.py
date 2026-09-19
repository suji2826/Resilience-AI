"""
RESILIENCE AI — Dashboard REST API Router
==========================================
Serves live KPIs, geospatial facility markers, active early warnings,
critical medicine stockout risks, and 7-day epidemiological trends.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.db.session import get_db
from app.repositories.dashboard_repo import DashboardRepository
from app.models.entities import (
    Alert, RiskScore, Inventory, RedistributionRecommendation, EmergencyEvent, User
)
from app.core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Executive Command Center Summary",
    description="Returns live platform KPIs, nationwide geospatial markers, top alerts, critical medicine risks, and 7-day aggregated trends directly from the database."
)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. KPIs
    kpis = DashboardRepository.get_kpis(db)

    # 2. National Map Data (all PHCs)
    map_markers = DashboardRepository.get_map_markers(db)

    # 3. Top Critical Alerts
    top_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").order_by(
        Alert.severity.desc(), Alert.created_at.desc()
    ).limit(5).all()
    alerts_data = [
        {
            "id": a.id,
            "alert_code": a.alert_code,
            "phc_id": a.phc_id,
            "phc_name": a.phc.name if a.phc else "",
            "district_name": a.phc.district.name if a.phc and a.phc.district else "",
            "state_name": a.phc.district.state.name if a.phc and a.phc.district and a.phc.district.state else "",
            "category": a.category,
            "severity": a.severity,
            "title": a.title,
            "resource_name": a.resource_name,
            "reason": a.reason,
            "prediction": a.prediction,
            "ai_explanation": a.ai_explanation,
            "recommended_action": a.recommended_action,
            "status": a.status,
            "created_at": a.created_at.isoformat()
        }
        for a in top_alerts
    ]

    # 4. Top Medicines At Risk
    top_risk_scores = db.query(RiskScore).filter(
        RiskScore.risk_level.in_(["CRITICAL", "HIGH"])
    ).order_by(RiskScore.stock_out_probability.desc()).limit(6).all()
    
    meds_risk_data = []
    for rs in top_risk_scores:
        inv = db.query(Inventory).filter(
            Inventory.phc_id == rs.phc_id,
            Inventory.medicine_id == rs.medicine_id
        ).first()
        
        meds_risk_data.append({
            "id": rs.id,
            "phc_id": rs.phc_id,
            "phc_name": rs.phc.name if rs.phc else "",
            "district_name": rs.phc.district.name if rs.phc and rs.phc.district else "",
            "state_name": rs.phc.district.state.name if rs.phc and rs.phc.district and rs.phc.district.state else "",
            "medicine_id": rs.medicine_id,
            "medicine_name": rs.medicine.name if rs.medicine else "",
            "medicine_category": rs.medicine.category if rs.medicine else "",
            "current_stock": rs.current_stock,
            "daily_consumption": rs.daily_consumption_rate,
            "days_remaining": rs.days_stock_remaining,
            "forecasted_demand_7d": round(rs.daily_consumption_rate * 7.8, 1),
            "incoming_stock": inv.incoming_stock if inv else 0,
            "supplier_lead_time_days": rs.supplier_lead_time_days,
            "risk_level": rs.risk_level,
            "stock_out_probability": rs.stock_out_probability,
            "last_updated": rs.calculated_at.isoformat()
        })

    # 5. Top Redistribution Recommendations
    redists = db.query(RedistributionRecommendation).order_by(
        RedistributionRecommendation.created_at.desc()
    ).limit(4).all()
    
    redist_data = []
    for r in redists:
        tx = r.transactions[0] if r.transactions else None
        redist_data.append({
            "id": r.id,
            "recommendation_code": r.recommendation_code,
            "source_district_id": r.source_district_id,
            "source_district_name": r.source_district.name if r.source_district else "",
            "source_surplus_quantity": r.source_surplus_quantity,
            "dest_district_id": r.dest_district_id,
            "dest_district_name": r.dest_district.name if r.dest_district else "",
            "dest_deficit_quantity": r.dest_deficit_quantity,
            "medicine_id": r.medicine_id,
            "medicine_name": r.medicine.name if r.medicine else "",
            "recommended_quantity": r.recommended_quantity,
            "urgency": r.urgency,
            "reason": r.reason,
            "estimated_transit_hours": r.estimated_transit_hours,
            "estimated_impact": r.estimated_impact,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "tracking_number": tx.tracking_number if tx else None
        })

    # 6. 7-Day National Trends (Aggregated from real DB time series)
    trends_7d = DashboardRepository.get_national_trends_7d(db)

    # 7. Active Emergency Check
    emergency = db.query(EmergencyEvent).filter(EmergencyEvent.is_active == True).first()

    return {
        "kpis": kpis,
        "map_markers": map_markers,
        "top_critical_alerts": alerts_data,
        "medicines_at_risk": meds_risk_data,
        "top_redistributions": redist_data,
        "national_trends_7d": trends_7d,
        "emergency_active": emergency is not None,
        "active_emergency_details": {
            "id": emergency.id,
            "event_type": emergency.event_type,
            "name": emergency.name,
            "affected_district": emergency.affected_district.name if emergency and emergency.affected_district else "Namakkal",
            "footfall_multiplier": emergency.footfall_multiplier if emergency else 1.0,
            "medicine_multiplier": emergency.medicine_demand_multiplier if emergency else 1.0,
            "ai_situation_summary": emergency.ai_situation_summary if emergency else ""
        } if emergency else None
    }
