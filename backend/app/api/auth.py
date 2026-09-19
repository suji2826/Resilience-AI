from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User, Role, AuditLog
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut
from app.core.security import verify_password, create_access_token, get_current_user
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    role_name = user.role.name if user.role else "NATIONAL_ADMIN"
    token = create_access_token(subject=user.email, role=role_name)
    
    # Audit log login
    log = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action="USER_LOGIN",
        resource_type="USER",
        resource_id=str(user.id),
        details={"email": user.email, "role": role_name}
    )
    db.add(log)
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": role_name,
            "state_id": user.state_id,
            "district_id": user.district_id,
            "phc_id": user.phc_id,
        }
    )

@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.name if current_user.role else "NATIONAL_ADMIN",
        "state_id": current_user.state_id,
        "district_id": current_user.district_id,
        "phc_id": current_user.phc_id,
        "is_active": current_user.is_active,
    }

@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.name if u.role else "NATIONAL_ADMIN",
            "role_description": u.role.description if u.role else "",
            "password": "resilience2026"
        }
        for u in users
    ]

@router.get("/roles")
def list_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
        }
        for r in roles
    ]
