"""
RESILIENCE AI — Workforce & Duty Attendance REST API Router
============================================================
Provides healthcare workforce staffing intelligence, duty attendance rates, and district shortage tracking.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.db.session import get_db
from app.repositories.resource_repo import ResourceRepository
from app.models.entities import User
from app.core.security import get_current_user

router = APIRouter(prefix="/workforce", tags=["Workforce Intelligence"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Workforce Intelligence & Attendance",
    description="Retrieve workforce staffing metrics, role breakdown for doctors/nurses/pharmacists, and district attendance matrix."
)
def get_workforce_intelligence(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ResourceRepository.get_workforce_resources(db)
