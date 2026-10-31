from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Institution
from ..schemas import InstitutionResponse, InstitutionCreate

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionResponse])
def list_institutions(state: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Institution)
    if state:
        query = query.filter(Institution.state == state)
    return query.order_by(Institution.name.asc()).all()

@router.get("/{id}", response_model=InstitutionResponse)
def get_institution(id: str, db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst

@router.post("", response_model=InstitutionResponse)
def create_institution(payload: InstitutionCreate, db: Session = Depends(get_db)):
    existing = db.query(Institution).filter(Institution.aicte_id == payload.aicte_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution with this AICTE ID already exists")

    inst = Institution(
        aicte_id=payload.aicte_id,
        name=payload.name,
        institute_type=payload.institute_type,
        state=payload.state,
        city=payload.city,
        address=payload.address,
        contact_person=payload.contact_person,
        email=payload.email,
        phone=payload.phone
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst

