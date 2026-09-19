"""
RESILIENCE AI — Stock-out Risk Calculation REST API Router
==========================================================
Provides real-time stock-out risk probability scoring, runway estimation, lead-time deficit
analysis, and explainable operational intervention actions computed from database inventory.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List, Optional

from app.db.session import get_db
from app.models.entities import RiskScore, PHC, Medicine, District, State, User
from app.services.risk_service import RiskService
from app.core.security import get_current_user

router = APIRouter(prefix="/risk", tags=["Stock-out Risk Engine"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="List Stock-Out Risk Scores",
    description="Retrieve inventory stock-out risk scores with filtering by risk level, district, state, and pagination."
)
def list_risk_scores(
    risk_level: Optional[str] = Query(None, description="Risk level filter (CRITICAL, HIGH, MEDIUM, LOW)"),
    district: Optional[str] = Query(None, description="Filter by District name"),
    state: Optional[str] = Query(None, description="Filter by State name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RiskScore).join(PHC).join(Medicine).join(District).join(State)

    if risk_level and risk_level != "All":
        query = query.filter(RiskScore.risk_level == risk_level)
    if district and district != "All":
        query = query.filter(District.name == district)
    if state and state != "All":
        query = query.filter(State.name == state)

    total_count = query.count()
    items = query.order_by(RiskScore.stock_out_probability.desc()).offset(skip).limit(limit).all()

    results = []
    for rs in items:
        results.append({
            "id": rs.id,
            "phc_id": rs.phc_id,
            "phc_name": rs.phc.name if rs.phc else "",
            "district_name": rs.phc.district.name if rs.phc and rs.phc.district else "",
            "state_name": rs.phc.district.state.name if rs.phc and rs.phc.district and rs.phc.district.state else "",
            "medicine_id": rs.medicine_id,
            "medicine_name": rs.medicine.name if rs.medicine else "",
            "medicine_category": rs.medicine.category if rs.medicine else "",
            "stock_out_probability": rs.stock_out_probability,
            "risk_level": rs.risk_level,
            "days_stock_remaining": rs.days_stock_remaining,
            "current_stock": rs.current_stock,
            "daily_consumption_rate": rs.daily_consumption_rate,
            "supplier_lead_time_days": rs.supplier_lead_time_days,
            "contributing_factors": rs.contributing_factors or {},
            "recommended_action": rs.recommended_action,
            "confidence": rs.confidence,
            "calculated_at": rs.calculated_at.isoformat()
        })

    return {
        "total": total_count,
        "items": results
    }


@router.get(
    "/summary",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Network Risk Summary & District Rankings",
    description="Returns aggregate count of medicines across risk tiers and average risk rankings per district."
)
def get_risk_summary(db: Session = Depends(get_db)):
    crit_count = db.query(RiskScore).filter(RiskScore.risk_level == "CRITICAL").count()
    high_count = db.query(RiskScore).filter(RiskScore.risk_level == "HIGH").count()
    med_count = db.query(RiskScore).filter(RiskScore.risk_level == "MEDIUM").count()
    low_count = db.query(RiskScore).filter(RiskScore.risk_level == "LOW").count()

    district_risks = db.query(
        District.name,
        func.avg(PHC.current_risk_score).label("avg_risk"),
        func.count(PHC.id).label("phc_count")
    ).join(PHC).group_by(District.name).order_by(func.avg(PHC.current_risk_score).desc()).all()

    dist_data = [
        {
            "district_name": r[0],
            "average_risk_score": round(float(r[1]), 3),
            "phc_count": r[2],
            "risk_status": "CRITICAL" if r[1] > 0.75 else ("HIGH" if r[1] > 0.55 else ("MEDIUM" if r[1] > 0.35 else "LOW"))
        }
        for r in district_risks
    ]

    return {
        "distribution": {
            "CRITICAL": crit_count,
            "HIGH": high_count,
            "MEDIUM": med_count,
            "LOW": low_count,
        },
        "district_rankings": dist_data
    }


@router.get(
    "/{phc_id}/{medicine_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Calculate Live Stock-Out Risk for Single Item",
    description="Calculates live stock-out probability, runway days, lead-time gap, and operational directives from database records."
)
def calculate_single_risk(
    phc_id: int,
    medicine_id: int,
    db: Session = Depends(get_db)
):
    try:
        return RiskService.calculate_phc_medicine_risk(
            db=db,
            phc_id=phc_id,
            medicine_id=medicine_id,
            persist_to_db=True
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/recalculate/{phc_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Recalculate Entire Facility Risk Profile",
    description="Recalculates risk scores for all monitored medicines at a PHC and updates the facility's overall risk classification."
)
def recalculate_facility_profile(
    phc_id: int,
    db: Session = Depends(get_db)
):
    try:
        return RiskService.recalculate_facility_risk(db=db, phc_id=phc_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
