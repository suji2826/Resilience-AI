"""
RESILIENCE AI — Medicine Inventory REST API Router
===================================================
Provides inventory catalog, risk filtering, stock-out probabilities, and deep-dive demand forecasts.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.db.session import get_db
from app.repositories.inventory_repo import InventoryRepository
from app.models.entities import User
from app.core.security import get_current_user

router = APIRouter(prefix="/inventory", tags=["Medicine Inventory"])


@router.get(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="List and Filter Medicine Inventory",
    description="Retrieve paginated medicine inventory with filters for medicine name, risk category, district, state, and therapeutic class."
)
def list_inventory(
    search: Optional[str] = Query(None, description="Search by medicine name, code, PHC name, or district"),
    risk: Optional[str] = Query(None, description="Filter by Risk Level (LOW, MEDIUM, HIGH, CRITICAL)"),
    district: Optional[str] = Query(None, description="Filter by District name"),
    state: Optional[str] = Query(None, description="Filter by State name"),
    medicine: Optional[str] = Query(None, description="Filter by Medicine name"),
    category: Optional[str] = Query(None, description="Filter by Therapeutic Category"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_count, results = InventoryRepository.list_inventory(
        db=db,
        search=search,
        risk=risk,
        district=district,
        state=state,
        medicine=medicine,
        category=category,
        skip=skip,
        limit=limit
    )

    return {
        "total": total_count,
        "items": results
    }


@router.get(
    "/{inventory_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get Inventory Item Deep-Dive Telemetry",
    description="Retrieve single medicine inventory record with 30-day historical consumption area curve, 7/14/30-day Holt-Winters forecasts, confidence intervals, supplier lead time, and AI explanation."
)
def get_inventory_detail(inventory_id: int, db: Session = Depends(get_db)):
    inv = InventoryRepository.get_inventory_by_id(db, inventory_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found."
        )

    return InventoryRepository.get_inventory_detail(db, inv)
