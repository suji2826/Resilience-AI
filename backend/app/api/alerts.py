"""
RESILIENCE AI — Early Warning & Alerts REST API Router
======================================================
Provides active alert feeds, risk categorization, acknowledge/resolve state machine, and audit tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.repositories.alert_repo import AlertRepository
from app.models.entities import User
from app.core.security import get_current_user, check_alert_action_access

router = APIRouter(prefix="/alerts", tags=["Alerts & Early Warning"])


class AlertActionRequest(BaseModel):
    action: str  # acknowledge, resolve, dismiss
    user_name: Optional[str] = None
    notes: Optional[str] = None


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Early Warning Alerts",
    description="Retrieve all alerts with optional filtering by status (ACTIVE, ACKNOWLEDGED, RESOLVED), severity, and alert category."
)
def list_alerts(
    status: Optional[str] = Query("ACTIVE", description="Alert Status filter"),
    severity: Optional[str] = Query(None, description="Severity filter (CRITICAL, HIGH, MEDIUM, LOW)"),
    category: Optional[str] = Query(None, description="Alert category"),
    phc_id: Optional[int] = Query(None, description="Filter by PHC ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AlertRepository.list_alerts(
        db=db,
        status=status,
        severity=severity,
        category=category,
        phc_id=phc_id
    )


@router.get(
    "/{alert_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Alert Details",
    description="Retrieve full telemetry, root cause explainability, and recommended action for a single alert."
)
def get_alert_detail(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alt = AlertRepository.get_alert_by_id(db, alert_id)
    if not alt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found."
        )

    return {
        "id": alt.id,
        "alert_code": alt.alert_code,
        "phc_id": alt.phc_id,
        "phc_name": alt.phc.name if alt.phc else "",
        "district_name": alt.phc.district.name if alt.phc and alt.phc.district else "",
        "state_name": alt.phc.district.state.name if alt.phc and alt.phc.district and alt.phc.district.state else "",
        "category": alt.category,
        "severity": alt.severity,
        "title": alt.title,
        "resource_name": alt.resource_name,
        "reason": alt.reason,
        "prediction": alt.prediction,
        "ai_explanation": alt.ai_explanation,
        "recommended_action": alt.recommended_action,
        "status": alt.status,
        "acknowledged_by": alt.acknowledged_by,
        "acknowledged_at": alt.acknowledged_at.isoformat() if alt.acknowledged_at else None,
        "resolved_by": alt.resolved_by,
        "resolved_at": alt.resolved_at.isoformat() if alt.resolved_at else None,
        "created_at": alt.created_at.isoformat()
    }


@router.post(
    "/{alert_id}/action",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Perform Alert Action (Acknowledge / Resolve / Dismiss)",
    description="Update alert lifecycle state and record an immutable audit ledger entry."
)
def perform_alert_action(
    alert_id: int,
    req: AlertActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alt = AlertRepository.get_alert_by_id(db, alert_id)
    if not alt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found."
        )

    # Enforce facility scope: user cannot modify alerts of unauthorized PHCs
    check_alert_action_access(current_user, alt)

    if req.action.lower() not in ["acknowledge", "resolve", "dismiss"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{req.action}'. Must be acknowledge, resolve, or dismiss."
        )

    # Authoritative user identity from JWT
    actor_name = current_user.full_name or current_user.email

    updated_alt = AlertRepository.update_alert_status(
        db=db,
        alert=alt,
        action=req.action.lower(),
        user_name=actor_name
    )

    return {
        "status": "SUCCESS",
        "alert_id": updated_alt.id,
        "new_status": updated_alt.status,
        "updated_at": datetime.utcnow().isoformat()
    }

