from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import FDR, FieldProvenance, User, NotificationAlert
from ..schemas import MakerScrutinySubmit
from ..security import require_roles
from ..audit_chain import add_audit_block

router = APIRouter(prefix="/api/scrutiny", tags=["AICTE Scrutiny Workflow"])

@router.post("/decision")
def submit_scrutiny_decision(
    payload: MakerScrutinySubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_MAKER", "AICTE_CHECKER"]))
):
    """
    AICTE Regulation Bureau Officer Scrutiny:
    Approves bank-confirmed FDR into active status or flags deficiencies to institution.
    """
    fdr = db.query(FDR).filter(FDR.id == payload.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    new_status = payload.decision
    if new_status not in ["ACTIVE", "FLAGGED_MISMATCH", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid scrutiny decision")

    fdr.status = new_status
    fdr.status_remarks = payload.remarks

    # Update Field Provenance Trust Tags to OFFICER_VERIFIED if approved
    for p in fdr.provenances:
        p.officer_val = p.bank_val if p.bank_val else p.declared_val
        if new_status == "ACTIVE":
            p.trust_tag = "OFFICER_VERIFIED"
        elif new_status == "FLAGGED_MISMATCH":
            p.trust_tag = "MISMATCH"

    # Add Immutable Audit Block
    add_audit_block(
        db=db,
        action=f"OFFICER_SCRUTINY_{new_status}",
        actor_role=current_user.role,
        actor_name=f"{current_user.full_name} ({current_user.designation})",
        entity_type="FDR",
        entity_id=fdr.id,
        details={
            "fdr_number": fdr.fdr_number,
            "institution_id": fdr.institution_id,
            "decision": new_status,
            "remarks": payload.remarks,
            "officer_email": current_user.email
        }
    )

    # Notify College
    inst = fdr.institution
    alert_type = "SCRUTINY_APPROVED" if new_status == "ACTIVE" else "SCRUTINY_DEFICIENCY"
    severity = "SUCCESS" if new_status == "ACTIVE" else "WARNING"
    alert = NotificationAlert(
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        alert_type=alert_type,
        recipient=inst.name,
        title=f"AICTE Scrutiny Decision: {new_status} (FDR #{fdr.fdr_number})",
        message=f"AICTE Regulation Bureau scrutinized your FDR: {payload.remarks}",
        severity=severity
    )
    db.add(alert)

    db.commit()

    return {
        "status": "SUCCESS",
        "fdr_id": fdr.id,
        "new_status": fdr.status,
        "message": f"Scrutiny decision '{new_status}' recorded and logged to audit trail."
    }
