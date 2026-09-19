from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime

from app.db.session import get_db
from app.models.entities import FederatedNode, FederatedTrainingRound, Country, AuditLog, User
from app.ml.federated_sim import federated_simulator
from app.schemas.schemas import TrainRoundRequest
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/federated", tags=["Federated AI Learning"])

@router.get("/nodes")
def list_federated_nodes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    nodes = db.query(FederatedNode).all()
    return [
        {
            "id": n.id,
            "node_name": n.node_name,
            "country_code": n.country.code if n.country else "IND",
            "country_name": n.country.name if n.country else "India",
            "status": n.status,
            "local_data_points": n.local_data_points,
            "local_accuracy": round(n.local_accuracy * 100.0, 1),
            "last_sync_time": n.last_sync_time.isoformat()
        }
        for n in nodes
    ]

@router.get("/rounds")
def list_training_rounds(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rounds_query = db.query(FederatedTrainingRound.round_number).distinct().order_by(
        FederatedTrainingRound.round_number.asc()
    ).all()
    
    round_numbers = [r[0] for r in rounds_query]
    results = []

    for r_num in round_numbers:
        records = db.query(FederatedTrainingRound).filter(
            FederatedTrainingRound.round_number == r_num
        ).all()
        if not records:
            continue

        first_rec = records[0]
        node_accs = [
            {
                "node_name": rec.node.node_name if rec.node else "",
                "country_code": rec.node.country.code if rec.node and rec.node.country else "IND",
                "local_accuracy": round(rec.local_accuracy * 100.0, 1),
                "local_loss": rec.local_loss,
            }
            for rec in records
        ]

        results.append({
            "round_number": r_num,
            "global_aggregated_accuracy": round(first_rec.global_aggregated_accuracy * 100.0, 1),
            "weights_divergence": first_rec.weights_divergence,
            "parameters_size_kb": first_rec.parameters_size_kb,
            "timestamp": first_rec.created_at.isoformat(),
            "node_accuracies": node_accs
        })

    return results

@router.post("/train")
@router.post("/train-round")
def run_federated_training_round(
    payload: TrainRoundRequest = None,
    current_user: User = Depends(require_role(["NATIONAL_ADMIN", "STATE_ADMIN"])),
    db: Session = Depends(get_db)
):
    nodes = db.query(FederatedNode).all()
    if not nodes:
        return {"error": "No federated nodes registered"}

    # Get latest round number
    max_round = db.query(FederatedTrainingRound.round_number).order_by(
        FederatedTrainingRound.round_number.desc()
    ).first()
    next_round = (max_round[0] + 1) if max_round else 1

    node_dicts = [
        {
            "id": n.id,
            "node_name": n.node_name,
            "country_code": n.country.code if n.country else "IND",
            "country_name": n.country.name if n.country else "India",
            "local_data_points": n.local_data_points,
            "local_accuracy": n.local_accuracy
        }
        for n in nodes
    ]

    # Execute FedAvg training simulation
    round_result = federated_simulator.execute_training_round(
        current_round=next_round,
        nodes=node_dicts,
        epochs=payload.epochs_per_node if payload else 5
    )

    now = datetime.utcnow()
    for update in round_result["node_updates"]:
        # Save training round record in DB
        ftr = FederatedTrainingRound(
            round_number=next_round,
            node_id=update["node_id"],
            local_loss=update["local_loss"],
            local_accuracy=update["local_accuracy"],
            global_aggregated_accuracy=round_result["global_aggregated_accuracy"],
            weights_divergence=update["weights_divergence"],
            parameters_size_kb=round_result["parameters_size_kb"],
            created_at=now
        )
        db.add(ftr)

        # Update node status in DB
        node_obj = db.query(FederatedNode).filter(FederatedNode.id == update["node_id"]).first()
        if node_obj:
            node_obj.local_accuracy = update["local_accuracy"]
            node_obj.last_sync_time = now
            node_obj.status = "CONNECTED"

    # Audit log
    log = AuditLog(
        user_email=current_user.email,
        action="FEDERATED_ROUND_EXECUTED",
        resource_type="FEDERATED_LEARNING",
        resource_id=str(next_round),
        details={
            "round": next_round,
            "global_accuracy": round_result["global_aggregated_accuracy"],
            "participating_nodes": len(nodes)
        }
    )
    db.add(log)
    db.commit()

    return round_result
