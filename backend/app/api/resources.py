"""
RESILIENCE AI — Beds & Capacity REST API Router
================================================
Provides facility bed metrics, ICU and oxygen bed saturation, and district-level capacity status.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.db.session import get_db
from app.repositories.resource_repo import ResourceRepository
from app.models.entities import User
from app.core.security import get_current_user

router = APIRouter(prefix="/resources", tags=["Beds & Resource Capacity"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Bed Capacity & Resource Utilization",
    description="Retrieve nationwide bed capacity summary, ICU/Oxygen saturation rates, and district-level occupancy matrix."
)
def get_resource_capacity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ResourceRepository.get_bed_resources(db)
