"""
RESILIENCE AI — Historical Analytics & Epidemiological Trends REST API Router
=============================================================================
Provides multi-variable historical analytics (7D, 30D, 90D), category distributions, and district risk matrices.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.db.session import get_db
from app.repositories.analytics_repo import AnalyticsRepository
from app.models.entities import User
from app.core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["Historical Analytics & Trends"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Multi-Horizon Epidemiological Analytics",
    description="Retrieve aggregated time-series telemetry for patient footfall, fever outbreak surges, medicine consumption velocity, formulary category breakdowns, and district vulnerability matrices."
)
def get_analytics_data(
    range_days: int = Query(30, ge=7, le=90, description="Historical analysis window in days (7, 30, 90)"),
    state: Optional[str] = Query(None, description="Filter by State name"),
    district: Optional[str] = Query(None, description="Filter by District name"),
    medicine: Optional[str] = Query(None, description="Filter by Medicine name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnalyticsRepository.get_analytics(
        db=db,
        range_days=range_days,
        state=state,
        district=district,
        medicine=medicine
    )
