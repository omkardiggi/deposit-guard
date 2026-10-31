from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserLogin, TokenResponse, UserResponse
from ..security import verify_password, create_access_token, require_auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "name": user.full_name,
        "bank_name": user.bank_name,
        "department": user.department
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "designation": user.designation,
            "email": user.email,
            "phone": user.phone,
            "bank_name": user.bank_name,
            "department": user.department
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_auth)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "designation": current_user.designation,
        "email": current_user.email,
        "phone": current_user.phone,
        "bank_name": current_user.bank_name,
        "department": current_user.department
    }

@router.get("/accounts")
def list_accounts(db: Session = Depends(get_db)):
    """Returns the two authorized portal accounts: AICTE Officer & Bank Officer."""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "full_name": u.full_name,
            "designation": u.designation,
            "bank_name": u.bank_name,
            "department": u.department,
            "email": u.email
        }
        for u in users
    ]
