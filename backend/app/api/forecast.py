"""
RESILIENCE AI — Demand Forecasting REST API Router
===================================================
Provides multi-horizon AI consumption predictions (7D, 14D, 30D), confidence intervals,
contributing factors, and recommended operational procurement actions directly computed
from real database telemetry.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from app.db.session import get_db
from app.models.entities import Medicine, PHC, User
from app.services.forecasting_service import ForecastingService
from app.core.security import get_current_user

router = APIRouter(prefix="/forecast", tags=["Demand Forecasting"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Multi-Horizon Demand Forecast",
    description="Calculates deterministic multi-horizon consumption predictions (7D, 14D, 30D) using EWMA, seasonality, and patient footfall cross-elasticity on real historical database telemetry."
)
def get_demand_forecast(
    phc_id: Optional[int] = Query(None, description="Primary Health Centre ID (defaults to Kolli Hills Tribal PHC)"),
    medicine_id: Optional[int] = Query(None, description="Essential Medicine ID (defaults to ORS)"),
    horizon_days: int = Query(7, ge=1, le=90, description="Forecast horizon in days (7, 14, 30)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not phc_id:
        phc = db.query(PHC).filter(PHC.code == "PHC-TN-NMK-01").first() or db.query(PHC).first()
        phc_id = phc.id if phc else 1
    if not medicine_id:
        med = db.query(Medicine).filter(Medicine.code == "MED-ORS-01").first() or db.query(Medicine).first()
        medicine_id = med.id if med else 1

    try:
        return ForecastingService.get_phc_medicine_forecast(
            db=db,
            phc_id=phc_id,
            medicine_id=medicine_id,
            horizon_days=horizon_days,
            persist_to_db=False
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{phc_id}/{medicine_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Specific Facility & Medicine Demand Forecast",
    description="Retrieve deep-dive demand forecast with upper/lower uncertainty bounds, contributing factors, and operational procurement actions."
)
def get_phc_medicine_forecast_path(
    phc_id: int,
    medicine_id: int,
    horizon_days: int = Query(7, ge=1, le=90, description="Forecast horizon in days"),
    db: Session = Depends(get_db)
):
    try:
        return ForecastingService.get_phc_medicine_forecast(
            db=db,
            phc_id=phc_id,
            medicine_id=medicine_id,
            horizon_days=horizon_days,
            persist_to_db=False
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/facility/{phc_id}",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get All Medicine Forecasts for a Facility",
    description="Runs demand forecasting across all essential medicines monitored at a specific PHC facility."
)
def get_facility_forecasts(
    phc_id: int,
    horizon_days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    return ForecastingService.get_facility_all_forecasts(
        db=db,
        phc_id=phc_id,
        horizon_days=horizon_days
    )
