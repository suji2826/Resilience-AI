"""
RESILIENCE AI — Redistribution Recommendation Service
======================================================
Coordinates network-wide inventory telemetry and invokes the RedistributionOptimizer
to generate optimal, explainable cross-district inventory transfers.
Operates directly on PostgreSQL/SQLite data.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.entities import (
    RedistributionRecommendation, RedistributionTransaction,
    District, PHC, Medicine, Inventory, RiskScore, AuditLog
)
from app.ml.optimizer import optimizer


class RedistributionService:

    @staticmethod
    def generate_network_recommendations(
        db: Session,
        safety_stock_target_days: int = 14,
        persist_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        Scans entire database inventory state across all PHCs and districts,
        computes real deficits and surpluses, runs RedistributionOptimizer,
        and returns explainable recommendations.
        """
        inventories = db.query(Inventory).join(PHC).join(District).join(Medicine).all()
        node_data = []

        for inv in inventories:
            rs = db.query(RiskScore).filter(
                RiskScore.phc_id == inv.phc_id,
                RiskScore.medicine_id == inv.medicine_id
            ).first()

            daily_burn = float(rs.daily_consumption_rate if rs else inv.medicine.standard_daily_demand)
            days_rem = float(rs.days_stock_remaining if rs else round(inv.current_stock / max(1.0, daily_burn), 1))

            node_data.append({
                "district_id": inv.phc.district_id,
                "district_name": inv.phc.district.name,
                "phc_id": inv.phc_id,
                "phc_name": inv.phc.name,
                "latitude": float(inv.phc.latitude),
                "longitude": float(inv.phc.longitude),
                "medicine_id": inv.medicine_id,
                "medicine_name": inv.medicine.name,
                "current_stock": int(inv.current_stock),
                "daily_burn": daily_burn,
                "days_remaining": days_rem,
                "risk_level": rs.risk_level if rs else "LOW",
                "catchment_population": int(inv.phc.catchment_population)
            })

        recs = optimizer.generate_recommendations(
            nodes=node_data,
            safety_stock_target_days=safety_stock_target_days
        )

        saved_count = 0
        if persist_to_db:
            for r in recs:
                existing = db.query(RedistributionRecommendation).filter(
                    (RedistributionRecommendation.recommendation_code == r["recommendation_code"]) |
                    (
                        (RedistributionRecommendation.source_district_id == r["source_district_id"]) &
                        (RedistributionRecommendation.dest_district_id == r["dest_district_id"]) &
                        (RedistributionRecommendation.medicine_id == r["medicine_id"]) &
                        (RedistributionRecommendation.status == "RECOMMENDED")
                    )
                ).first()

                if not existing:
                    try:
                        rec_obj = RedistributionRecommendation(
                            recommendation_code=r["recommendation_code"],
                            source_district_id=r["source_district_id"],
                            dest_district_id=r["dest_district_id"],
                            source_phc_id=r["source_phc_id"],
                            dest_phc_id=r["dest_phc_id"],
                            medicine_id=r["medicine_id"],
                            recommended_quantity=r["recommended_quantity"],
                            source_surplus_quantity=r["source_surplus_quantity"],
                            dest_deficit_quantity=r["dest_deficit_quantity"],
                            urgency=r["urgency"],
                            reason=r["reason"],
                            estimated_transit_hours=r["estimated_transit_hours"],
                            estimated_impact=r["estimated_impact"],
                            status="RECOMMENDED",
                            created_at=datetime.utcnow()
                        )
                        db.add(rec_obj)
                        db.flush()
                        saved_count += 1
                    except IntegrityError:
                        db.rollback()
                        continue
            try:
                db.commit()
            except IntegrityError:
                db.rollback()

        return {
            "success": True,
            "total_recommendations": len(recs),
            "newly_persisted": saved_count,
            "recommendations": recs
        }

    @staticmethod
    def list_recommendations_with_explainability(
        db: Session,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves active recommendations from DB enriched with explainable metadata.
        """
        query = db.query(RedistributionRecommendation)
        if status and status != "All":
            query = query.filter(RedistributionRecommendation.status == status)

        recs = query.order_by(RedistributionRecommendation.created_at.desc()).all()
        results = []

        for r in recs:
            tx = r.transactions[0] if r.transactions else None
            results.append({
                "id": r.id,
                "recommendation_code": r.recommendation_code,
                "source_district_id": r.source_district_id,
                "source_district_name": r.source_district.name if r.source_district else "Unknown",
                "source_phc_id": r.source_phc_id,
                "source_phc_name": r.source_phc.name if r.source_phc else "Surplus Facility",
                "source_surplus_quantity": r.source_surplus_quantity,
                "dest_district_id": r.dest_district_id,
                "dest_district_name": r.dest_district.name if r.dest_district else "Unknown",
                "dest_phc_id": r.dest_phc_id,
                "dest_phc_name": r.dest_phc.name if r.dest_phc else "Deficit Facility",
                "dest_deficit_quantity": r.dest_deficit_quantity,
                "medicine_id": r.medicine_id,
                "medicine_name": r.medicine.name if r.medicine else "Essential Medicine",
                "medicine_category": r.medicine.category if r.medicine else "",
                "recommended_quantity": r.recommended_quantity,
                "urgency": r.urgency,
                "confidence": 0.91,
                "confidence_score": 0.91,
                "contributing_factors": {
                    "source_surplus_quantity": r.source_surplus_quantity,
                    "dest_deficit_quantity": r.dest_deficit_quantity,
                    "estimated_transit_hours": r.estimated_transit_hours,
                    "urgency_level": r.urgency
                },
                "recommended_action": f"Transfer {r.recommended_quantity} units of {r.medicine.name if r.medicine else 'medicine'} from {r.source_district.name if r.source_district else ''} to {r.dest_district.name if r.dest_district else ''}.",
                "recommended_actions": [
                    f"Authorize digital transfer manifest for {r.recommended_quantity} units.",
                    f"Dispatch GPS-tracked logistics vehicle (estimated {r.estimated_transit_hours or 2.5}h transit).",
                    "Verify cold-chain compliance if applicable.",
                    "Log electronic proof of delivery at destination pharmacy."
                ],
                "reason": r.reason,
                "estimated_transit_hours": r.estimated_transit_hours,
                "estimated_impact": r.estimated_impact,
                "status": r.status,
                "approved_by": r.approved_by,
                "approved_at": r.approved_at.isoformat() if r.approved_at else None,
                "tracking_number": tx.tracking_number if tx else None,
                "created_at": r.created_at.isoformat()
            })

        return results
