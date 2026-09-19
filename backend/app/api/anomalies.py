"""
RESILIENCE AI — Anomaly Detection REST API Router
=================================================
Provides multivariate statistical anomaly detection across healthcare facilities
using robust Z-Score, Median Absolute Deviation (MAD), and IQR fence models
applied directly to real historical database telemetry.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from app.db.session import get_db
from app.services.anomaly_service import AnomalyService
from app.models.entities import User
from app.core.security import get_current_user

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Scan Network for Telemetry Anomalies",
    description="Executes multivariate statistical anomaly detection across all PHC facilities using actual database telemetry (PatientFootfall, syndromic fever cases, and MedicineConsumption)."
)
def get_detected_anomalies(
    limit: int = Query(30, ge=1, le=100, description="Maximum number of anomalies to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AnomalyService.scan_network_anomalies(db=db, limit=limit)


@router.get(
    "/phc/{phc_id}",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get Facility-Specific Anomalies",
    description="Runs statistical anomaly detection on patient footfall and medicine consumption series for a specific PHC."
)
def get_phc_anomalies(
    phc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        footfall_anoms = AnomalyService.detect_phc_footfall_anomalies(db=db, phc_id=phc_id)
        cons_anoms = AnomalyService.detect_phc_consumption_anomalies(db=db, phc_id=phc_id)
        combined = footfall_anoms + cons_anoms
        combined.sort(key=lambda x: x.get("z_score", 0.0), reverse=True)
        return combined
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
