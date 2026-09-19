from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.db.session import get_db
from app.models.entities import AuditLog, User
from app.core.security import require_role

router = APIRouter(prefix="/audit", tags=["Audit Logs & Governance"])

@router.get("")
def list_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_role(["NATIONAL_ADMIN"])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_email": l.user_email or "system@resilience.gov.in",
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details or {},
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]
