"""
RESILIENCE AI — Resource Redistribution REST API Router
========================================================
Provides linear/greedy optimized cross-district inventory transfer recommendations,
multi-criteria logistics cost matching, explainability factors, and approval/dispatch workflows.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.entities import (
    RedistributionRecommendation, RedistributionTransaction,
    District, PHC, Medicine, Inventory, RiskScore, AuditLog, User
)
from app.services.redistribution_service import RedistributionService
from app.schemas.schemas import RedistributionActionRequest
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/redistribution", tags=["Resource Redistribution"])


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Redistribution Recommendations",
    description="Retrieve all cross-district resource redistribution recommendations with optional status filtering."
)
def list_redistributions(
    status: Optional[str] = Query(None, description="Filter by status (RECOMMENDED, APPROVED, IN_TRANSIT, DELIVERED, REJECTED)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return RedistributionService.list_recommendations_with_explainability(db=db, status=status)


@router.post(
    "/{rec_id}/approve",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Approve Redistribution & Dispatch Vehicle",
    description="Approves transfer, generates tracking number, decrements source stock, increments incoming dest stock, and emits audit log."
)
def approve_redistribution(
    rec_id: int,
    payload: RedistributionActionRequest,
    current_user: User = Depends(require_role(["NATIONAL_ADMIN", "STATE_ADMIN", "SUPPLY_CHAIN_MANAGER"])),
    db: Session = Depends(get_db)
):
    rec = db.query(RedistributionRecommendation).filter(RedistributionRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    # Authoritative identity from authenticated token, NOT client-modifiable payload
    user_name = current_user.full_name or current_user.email
    now = datetime.utcnow()

    # Guard against double-approval
    if rec.status in ("IN_TRANSIT", "DELIVERED"):
        # Already approved — return existing tracking info idempotently
        existing_tx = db.query(RedistributionTransaction).filter(
            RedistributionTransaction.recommendation_id == rec.id
        ).order_by(RedistributionTransaction.dispatched_at.desc()).first()
        return {
            "success": True,
            "message": f"Transfer {rec.recommendation_code} was already approved.",
            "status": "IN_TRANSIT",
            "tracking_number": existing_tx.tracking_number if existing_tx else None,
            "estimated_arrival_hours": rec.estimated_transit_hours
        }

    # Progress to IN_TRANSIT
    rec.status = "IN_TRANSIT"
    rec.approved_by = user_name
    rec.approved_at = now

    # Create Transaction Tracking (unique per day per recommendation)
    tracking_code = f"MED-TRK-{datetime.utcnow().strftime('%Y%m%d')}-{rec.id:04d}"
    # Check if tracking already exists (idempotency across test re-runs)
    existing_tx = db.query(RedistributionTransaction).filter(
        RedistributionTransaction.tracking_number == tracking_code
    ).first()
    if not existing_tx:
        tx = RedistributionTransaction(
            recommendation_id=rec.id,
            tracking_number=tracking_code,
            current_status="IN_TRANSIT",
            dispatched_at=now,
            estimated_arrival=now + timedelta(hours=rec.estimated_transit_hours or 2.5),
            vehicle_details="Refrigerated Medical Van KA-04-E-9021",
            temperature_logged_celsius=4.2
        )
        db.add(tx)
    else:
        tracking_code = existing_tx.tracking_number


    # Deduct from source and add to incoming for dest
    if rec.source_phc_id:
        src_inv = db.query(Inventory).filter(
            Inventory.phc_id == rec.source_phc_id,
            Inventory.medicine_id == rec.medicine_id
        ).first()
        if src_inv:
            src_inv.current_stock = max(0, src_inv.current_stock - rec.recommended_quantity)
    
    if rec.dest_phc_id:
        dest_inv = db.query(Inventory).filter(
            Inventory.phc_id == rec.dest_phc_id,
            Inventory.medicine_id == rec.medicine_id
        ).first()
        if dest_inv:
            dest_inv.incoming_stock += rec.recommended_quantity
            dest_inv.incoming_delivery_date = now + timedelta(hours=rec.estimated_transit_hours or 2.5)

    # Log in audit ledger
    log = AuditLog(
        user_email=user_name,
        action="REDISTRIBUTION_APPROVED",
        resource_type="REDISTRIBUTION",
        resource_id=str(rec.id),
        details={
            "code": rec.recommendation_code,
            "source": rec.source_district.name if rec.source_district else "",
            "dest": rec.dest_district.name if rec.dest_district else "",
            "quantity": rec.recommended_quantity,
            "tracking_number": tracking_code
        }
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Transfer {rec.recommendation_code} successfully approved and dispatched.",
        "status": "IN_TRANSIT",
        "tracking_number": tracking_code,
        "estimated_arrival_hours": rec.estimated_transit_hours
    }


@router.post(
    "/{rec_id}/reject",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Reject Redistribution Recommendation",
    description="Marks recommendation as REJECTED with mandatory audit rationale."
)
def reject_redistribution(
    rec_id: int,
    payload: RedistributionActionRequest,
    current_user: User = Depends(require_role(["NATIONAL_ADMIN", "STATE_ADMIN", "SUPPLY_CHAIN_MANAGER"])),
    db: Session = Depends(get_db)
):
    rec = db.query(RedistributionRecommendation).filter(RedistributionRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    user_name = current_user.full_name or current_user.email
    rec.status = "REJECTED"
    rec.rejected_reason = payload.notes or "Rejected by Administrator"

    log = AuditLog(
        user_email=user_name,
        action="REDISTRIBUTION_REJECTED",
        resource_type="REDISTRIBUTION",
        resource_id=str(rec.id),
        details={"code": rec.recommendation_code, "reason": rec.rejected_reason}
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Recommendation {rec.recommendation_code} rejected.",
        "status": "REJECTED"
    }


@router.post(
    "/{rec_id}/complete",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Mark Transfer Received & Completed",
    description="Transitions status from IN_TRANSIT → DELIVERED. Credits recommended_quantity to destination current_stock and decrements incoming_stock. Records delivered_at timestamp and emits an immutable AuditLog entry."
)
def complete_redistribution(
    rec_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(RedistributionRecommendation).filter(RedistributionRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    now = datetime.utcnow()
    if rec.status == "DELIVERED":
        return {
            "success": True,
            "message": f"Transfer {rec.recommendation_code} was already marked as delivered.",
            "status": "DELIVERED",
            "quantity_credited": rec.recommended_quantity,
            "delivered_at": now.isoformat()
        }

    if rec.status not in ("IN_TRANSIT", "APPROVED"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot complete a transfer with status '{rec.status}'. Only IN_TRANSIT or APPROVED transfers can be marked complete."
        )

    rec.status = "DELIVERED"

    # Credit destination inventory
    if rec.dest_phc_id:
        dest_inv = db.query(Inventory).filter(
            Inventory.phc_id == rec.dest_phc_id,
            Inventory.medicine_id == rec.medicine_id
        ).first()
        if dest_inv:
            dest_inv.current_stock += rec.recommended_quantity
            dest_inv.incoming_stock = max(0, dest_inv.incoming_stock - rec.recommended_quantity)
            dest_inv.incoming_delivery_date = None
            dest_inv.last_updated = now

    # Update transaction record
    tx = db.query(RedistributionTransaction).filter(
        RedistributionTransaction.recommendation_id == rec.id
    ).order_by(RedistributionTransaction.dispatched_at.desc()).first()
    if tx:
        tx.current_status = "STOCKED"
        tx.delivered_at = now

    # Immutable audit entry
    log = AuditLog(
        user_email=current_user.email,
        action="REDISTRIBUTION_COMPLETED",
        resource_type="REDISTRIBUTION",
        resource_id=str(rec.id),
        details={
            "code": rec.recommendation_code,
            "source": rec.source_district.name if rec.source_district else "",
            "dest": rec.dest_district.name if rec.dest_district else "",
            "medicine": rec.medicine.name if rec.medicine else "",
            "quantity_received": rec.recommended_quantity,
            "delivered_at": now.isoformat()
        }
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Transfer {rec.recommendation_code} marked as received and stocked at destination.",
        "status": "DELIVERED",
        "quantity_credited": rec.recommended_quantity,
        "delivered_at": now.isoformat()
    }


@router.post(
    "/generate",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Generate Fresh Optimization Recommendations",
    description="Scans entire network state across the database and applies the RedistributionOptimizer to generate optimal cross-district transfer recommendations."
)
def generate_fresh_optimizations(
    current_user: User = Depends(require_role(["NATIONAL_ADMIN", "STATE_ADMIN", "SUPPLY_CHAIN_MANAGER"])),
    db: Session = Depends(get_db)
):
    res = RedistributionService.generate_network_recommendations(db=db, persist_to_db=True)
    return {
        "success": True,
        "recommendations_generated": res["total_recommendations"],
        "newly_persisted": res["newly_persisted"]
    }

