"""
RESILIENCE AI — Primary Health Centre (PHC) REST API Router
============================================================
Provides facility directory, filtering by state/district/tier/risk, and detailed operational hub telemetry.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.db.session import get_db
from app.repositories.phc_repo import PHCRepository
from app.models.entities import User
from app.core.security import get_current_user, check_phc_access

router = APIRouter(prefix="/phcs", tags=["PHC Management"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="List and Filter Primary Health Centres",
    description="Retrieve paginated list of monitored PHCs with filters for search term, state, district, risk level, and tier."
)
def list_phcs(
    search: Optional[str] = Query(None, description="Search by PHC name, code, or district"),
    state: Optional[str] = Query(None, description="Filter by State (e.g. Tamil Nadu)"),
    district: Optional[str] = Query(None, description="Filter by District (e.g. Namakkal)"),
    risk: Optional[str] = Query(None, description="Filter by Risk Category (LOW, MEDIUM, HIGH, CRITICAL)"),
    tier: Optional[str] = Query(None, description="Filter by Tier (Tier-1, Tier-2, CHC, Urban PHC)"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(100, ge=1, le=500, description="Limit of results per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_count, results = PHCRepository.list_phcs(
        db=db,
        search=search,
        state=state,
        district=district,
        risk=risk,
        tier=tier,
        skip=skip,
        limit=limit
    )

    return {
        "total": total_count,
        "items": results
    }


@router.get(
    "/{phc_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Primary Health Centre Operational Dashboard",
    description="Retrieve single PHC deep-dive telemetry including bed census, workforce roster, 14-day footfall time-series, critical medicines, and active alerts."
)
def get_phc_detail(
    phc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    phc = PHCRepository.get_phc_by_id(db, phc_id)
    if not phc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Primary Health Centre with ID {phc_id} not found."
        )

    # Enforce geographic / operational facility scope
    check_phc_access(current_user, phc)

    return PHCRepository.get_phc_detail(db, phc)

