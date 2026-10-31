import secrets
from datetime import datetime, timedelta, timezone, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from ..database import get_db
from ..models import FDR, Institution, FieldProvenance, BankVerification, User, NotificationAlert
from ..schemas import FDRCreate, FDRRenewCreate, FDRResponse
from ..security import require_auth
from ..audit_chain import add_audit_block

router = APIRouter(prefix="/api/fdrs", tags=["FDRs"])

def generate_bank_token():
    return secrets.token_urlsafe(24)

@router.get("", response_model=List[FDRResponse])
def list_fdrs(
    institution_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    bank: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FDR)
    
    if institution_id:
        query = query.filter(FDR.institution_id == institution_id)
        
    if status_filter:
        if status_filter == "EXPIRING_SOON":
            query = query.filter(FDR.status.in_(["EXPIRING_SOON", "ACTIVE"]))
        else:
            query = query.filter(FDR.status == status_filter)
            
    if bank:
        query = query.filter(FDR.issuing_bank.ilike(f"%{bank}%"))
        
    if search:
        search_term = f"%{search}%"
        query = query.join(Institution).filter(
            or_(
                FDR.fdr_number.ilike(search_term),
                FDR.issuing_bank.ilike(search_term),
                FDR.branch_name.ilike(search_term),
                Institution.name.ilike(search_term),
                Institution.aicte_id.ilike(search_term)
            )
        )
    else:
        query = query.join(Institution)

    fdrs = query.order_by(FDR.created_at.desc()).all()
    
    results = []
    for f in fdrs:
        inst_name = f.institution.name if f.institution else "N/A"
        aicte_id = f.institution.aicte_id if f.institution else "N/A"
        
        # Format response
        results.append({
            "id": f.id,
            "fdr_number": f.fdr_number,
            "institution_id": f.institution_id,
            "institution_name": inst_name,
            "aicte_id": aicte_id,
            "purpose": f.purpose,
            "issuing_bank": f.issuing_bank,
            "branch_name": f.branch_name,
            "ifsc_code": f.ifsc_code,
            "declared_amount": f.declared_amount,
            "bank_confirmed_amount": f.bank_confirmed_amount,
            "currency": f.currency,
            "issue_date": f.issue_date,
            "declared_maturity_date": f.declared_maturity_date,
            "bank_confirmed_maturity_date": f.bank_confirmed_maturity_date,
            "tenure_months": f.tenure_months,
            "interest_rate": f.interest_rate,
            "declared_joint_holder": f.declared_joint_holder,
            "bank_confirmed_joint_holder": f.bank_confirmed_joint_holder,
            "declared_lien": f.declared_lien,
            "bank_confirmed_lien": f.bank_confirmed_lien,
            "auto_renewal_clause": f.auto_renewal_clause,
            "status": f.status,
            "status_remarks": f.status_remarks,
            "document_path": f.document_path,
            "document_filename": f.document_filename,
            "previous_fdr_id": f.previous_fdr_id,
            "replacement_fdr_id": f.replacement_fdr_id,
            "verification_token": f.verification_token,
            "verification_expires_at": f.verification_expires_at,
            "created_at": f.created_at,
            "updated_at": f.updated_at,
            "provenances": [
                {
                    "id": p.id,
                    "field_key": p.field_key,
                    "declared_val": p.declared_val,
                    "bank_val": p.bank_val,
                    "officer_val": p.officer_val,
                    "trust_tag": p.trust_tag,
                    "is_match": p.is_match,
                    "notes": p.notes
                }
                for p in f.provenances
            ],
            "verifications": [
                {
                    "id": v.id,
                    "bank_name": v.bank_name,
                    "branch_ifsc": v.branch_ifsc,
                    "nodal_officer_name": v.nodal_officer_name,
                    "confirmed_amount": v.confirmed_amount,
                    "confirmed_maturity_date": v.confirmed_maturity_date,
                    "confirmed_lien_to_aicte": v.confirmed_lien_to_aicte,
                    "confirmed_auto_renewal": v.confirmed_auto_renewal,
                    "confirmed_fdr_status": v.confirmed_fdr_status,
                    "dsc_signer_dn": v.dsc_signer_dn,
                    "dsc_cert_issuer": v.dsc_cert_issuer,
                    "dsc_cert_serial": v.dsc_cert_serial,
                    "dsc_timestamp": v.dsc_timestamp,
                    "dsc_signature_hex": v.dsc_signature_hex,
                    "dsc_verified": v.dsc_verified,
                    "discrepancies": v.discrepancies,
                    "verified_at": v.verified_at
                }
                for v in f.verifications
            ]
        })
    return results

@router.get("/{fdr_id}", response_model=FDRResponse)
def get_fdr(fdr_id: str, db: Session = Depends(get_db)):
    f = db.query(FDR).filter(FDR.id == fdr_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="FDR record not found")
        
    return {
        "id": f.id,
        "fdr_number": f.fdr_number,
        "institution_id": f.institution_id,
        "institution_name": f.institution.name if f.institution else "N/A",
        "aicte_id": f.institution.aicte_id if f.institution else "N/A",
        "purpose": f.purpose,
        "issuing_bank": f.issuing_bank,
        "branch_name": f.branch_name,
        "ifsc_code": f.ifsc_code,
        "declared_amount": f.declared_amount,
        "bank_confirmed_amount": f.bank_confirmed_amount,
        "currency": f.currency,
        "issue_date": f.issue_date,
        "declared_maturity_date": f.declared_maturity_date,
        "bank_confirmed_maturity_date": f.bank_confirmed_maturity_date,
        "tenure_months": f.tenure_months,
        "interest_rate": f.interest_rate,
        "declared_joint_holder": f.declared_joint_holder,
        "bank_confirmed_joint_holder": f.bank_confirmed_joint_holder,
        "declared_lien": f.declared_lien,
        "bank_confirmed_lien": f.bank_confirmed_lien,
        "auto_renewal_clause": f.auto_renewal_clause,
        "status": f.status,
        "status_remarks": f.status_remarks,
        "document_path": f.document_path,
        "document_filename": f.document_filename,
        "previous_fdr_id": f.previous_fdr_id,
        "replacement_fdr_id": f.replacement_fdr_id,
        "verification_token": f.verification_token,
        "verification_expires_at": f.verification_expires_at,
        "created_at": f.created_at,
        "updated_at": f.updated_at,
        "provenances": [
            {
                "id": p.id,
                "field_key": p.field_key,
                "declared_val": p.declared_val,
                "bank_val": p.bank_val,
                "officer_val": p.officer_val,
                "trust_tag": p.trust_tag,
                "is_match": p.is_match,
                "notes": p.notes
            }
            for p in f.provenances
        ],
        "verifications": [
            {
                "id": v.id,
                "bank_name": v.bank_name,
                "branch_ifsc": v.branch_ifsc,
                "nodal_officer_name": v.nodal_officer_name,
                "confirmed_amount": v.confirmed_amount,
                "confirmed_maturity_date": v.confirmed_maturity_date,
                "confirmed_lien_to_aicte": v.confirmed_lien_to_aicte,
                "confirmed_auto_renewal": v.confirmed_auto_renewal,
                "confirmed_fdr_status": v.confirmed_fdr_status,
                "dsc_signer_dn": v.dsc_signer_dn,
                "dsc_cert_issuer": v.dsc_cert_issuer,
                "dsc_cert_serial": v.dsc_cert_serial,
                "dsc_timestamp": v.dsc_timestamp,
                "dsc_signature_hex": v.dsc_signature_hex,
                "dsc_verified": v.dsc_verified,
                "discrepancies": v.discrepancies,
                "verified_at": v.verified_at
            }
            for v in f.verifications
        ]
    }

@router.post("", response_model=FDRResponse)
def submit_fdr(fdr_data: FDRCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(require_auth)):
    # Check if FDR number already exists
    existing = db.query(FDR).filter(FDR.fdr_number == fdr_data.fdr_number).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An FDR with receipt number '{fdr_data.fdr_number}' is already registered in the system."
        )

    # Verify institution exists
    inst = db.query(Institution).filter(Institution.id == fdr_data.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    token = generate_bank_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=15)

    fdr = FDR(
        fdr_number=fdr_data.fdr_number,
        institution_id=fdr_data.institution_id,
        purpose=fdr_data.purpose,
        issuing_bank=fdr_data.issuing_bank,
        branch_name=fdr_data.branch_name,
        ifsc_code=fdr_data.ifsc_code,
        declared_amount=fdr_data.declared_amount,
        issue_date=fdr_data.issue_date,
        declared_maturity_date=fdr_data.declared_maturity_date,
        tenure_months=fdr_data.tenure_months,
        interest_rate=fdr_data.interest_rate,
        declared_joint_holder=fdr_data.declared_joint_holder,
        declared_lien=fdr_data.declared_lien,
        auto_renewal_clause=fdr_data.auto_renewal_clause,
        status="PENDING_VERIFICATION",
        status_remarks="Awaiting digital bank attestation via 15-day secure bank portal request.",
        document_filename=fdr_data.document_filename or "fdr_receipt.pdf",
        verification_token=token,
        verification_expires_at=expires_at
    )
    db.add(fdr)
    db.flush()

    # Create Initial Field Provenances with tag 'DECLARED'
    provenance_fields = [
        ("amount", f"₹ {fdr_data.declared_amount:,.2f}"),
        ("maturity_date", fdr_data.declared_maturity_date),
        ("joint_holder", fdr_data.declared_joint_holder),
        ("lien_status", "Lien Marked to AICTE" if fdr_data.declared_lien else "Not Marked"),
        ("issuing_bank", f"{fdr_data.issuing_bank} ({fdr_data.branch_name})")
    ]
    for key, val in provenance_fields:
        prov = FieldProvenance(
            fdr_id=fdr.id,
            field_key=key,
            declared_val=val,
            trust_tag="DECLARED",
            is_match=True
        )
        db.add(prov)

    # Add Immutable Audit Block
    actor_name = current_user.full_name if current_user else inst.name
    actor_role = current_user.role if current_user else "INSTITUTION"
    add_audit_block(
        db=db,
        action="FDR_SUBMITTED",
        actor_role=actor_role,
        actor_name=actor_name,
        entity_type="FDR",
        entity_id=fdr.id,
        details={
            "fdr_number": fdr.fdr_number,
            "institution_name": inst.name,
            "aicte_id": inst.aicte_id,
            "amount": fdr.declared_amount,
            "issuing_bank": fdr.issuing_bank,
            "maturity_date": fdr.declared_maturity_date,
            "verification_token": token,
            "expiry": expires_at.isoformat()
        }
    )

    # Generate Notification Alert
    alert = NotificationAlert(
        fdr_id=fdr.id,
        institution_id=inst.id,
        alert_type="NEW_FDR_SUBMISSION",
        recipient="AICTE_REGULATION_BUREAU",
        title=f"New FDR Submitted: {fdr.fdr_number}",
        message=f"{inst.name} ({inst.aicte_id}) submitted FDR #{fdr.fdr_number} of ₹{fdr.declared_amount:,.2f}. One-time bank verification request dispatched to {fdr.issuing_bank}.",
        severity="INFO"
    )
    db.add(alert)

    db.commit()
    db.refresh(fdr)

    return get_fdr(fdr.id, db)

@router.post("/renew", response_model=FDRResponse)
def renew_fdr(renew_data: FDRRenewCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(require_auth)):
    """
    Implements the "No-Gap Renewal" Rule:
    An expiring FDR cannot close until its replacement is bank-confirmed!
    Maintains full chronological versioning and lineage.
    """
    old_fdr = db.query(FDR).filter(FDR.id == renew_data.previous_fdr_id).first()
    if not old_fdr:
        raise HTTPException(status_code=404, detail="Existing FDR to be renewed not found")

    inst = old_fdr.institution
    new_token = generate_bank_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=15)

    new_fdr = FDR(
        fdr_number=renew_data.new_fdr_number,
        institution_id=old_fdr.institution_id,
        purpose=f"Renewal of #{old_fdr.fdr_number} - {old_fdr.purpose}",
        issuing_bank=renew_data.issuing_bank,
        branch_name=renew_data.branch_name,
        ifsc_code=renew_data.ifsc_code,
        declared_amount=renew_data.declared_amount,
        issue_date=renew_data.issue_date,
        declared_maturity_date=renew_data.declared_maturity_date,
        tenure_months=renew_data.tenure_months,
        interest_rate=renew_data.interest_rate,
        declared_joint_holder=renew_data.declared_joint_holder,
        declared_lien=True,
        auto_renewal_clause=renew_data.auto_renewal_clause,
        status="RENEWAL_IN_PROGRESS",
        status_remarks=f"No-Gap Renewal: Replacing maturing FDR #{old_fdr.fdr_number}. Awaiting Bank DSC confirmation.",
        document_filename=renew_data.document_filename or "fdr_renewal_receipt.pdf",
        previous_fdr_id=old_fdr.id,
        verification_token=new_token,
        verification_expires_at=expires_at
    )
    db.add(new_fdr)
    db.flush()

    # Link old FDR to this replacement
    old_fdr.status = "RENEWAL_IN_PROGRESS"
    old_fdr.replacement_fdr_id = new_fdr.id
    old_fdr.status_remarks = f"Renewal in progress: Replacement FDR #{new_fdr.fdr_number} submitted. Old deposit remains legally intact under AICTE lien until new FDR is bank-confirmed."

    # Provenance fields for new FDR
    provenance_fields = [
        ("amount", f"₹ {renew_data.declared_amount:,.2f}"),
        ("maturity_date", renew_data.declared_maturity_date),
        ("joint_holder", renew_data.declared_joint_holder),
        ("lien_status", "Lien Marked to AICTE"),
        ("issuing_bank", f"{renew_data.issuing_bank} ({renew_data.branch_name})")
    ]
    for key, val in provenance_fields:
        prov = FieldProvenance(
            fdr_id=new_fdr.id,
            field_key=key,
            declared_val=val,
            trust_tag="DECLARED",
            is_match=True
        )
        db.add(prov)

    # Add Immutable Audit Block for Renewal
    actor_name = current_user.full_name if current_user else inst.name
    actor_role = current_user.role if current_user else "INSTITUTION"
    add_audit_block(
        db=db,
        action="NO_GAP_RENEWAL_INITIATED",
        actor_role=actor_role,
        actor_name=actor_name,
        entity_type="FDR",
        entity_id=new_fdr.id,
        details={
            "old_fdr_id": old_fdr.id,
            "old_fdr_number": old_fdr.fdr_number,
            "new_fdr_number": new_fdr.fdr_number,
            "institution_name": inst.name,
            "amount": new_fdr.declared_amount,
            "rule": "AICTE No-Gap Principle: Expiring deposit protection maintained without gap"
        }
    )

    db.commit()
    db.refresh(new_fdr)
    return get_fdr(new_fdr.id, db)

@router.post("/ocr-simulate")
def simulate_ocr_extraction(filename: Optional[str] = "fdr_scan.pdf"):
    """
    Simulates AI-powered OCR and regex data capture from FDR image or scan.
    Extracts core fields and returns pre-filled values with confidence scores.
    """
    return {
        "status": "SUCCESS",
        "filename": filename,
        "extracted_fields": {
            "fdr_number": "SBI-FDR-98241094",
            "issuing_bank": "State Bank of India",
            "branch_name": "Connaught Place Commercial Branch, New Delhi",
            "ifsc_code": "SBIN0000691",
            "amount": 2500000.00,
            "amount_in_words": "Rupees Twenty Five Lakhs Only",
            "issue_date": "2026-10-15",
            "maturity_date": "2031-10-15",
            "tenure_months": 60,
            "interest_rate": 7.15,
            "joint_holder": "Jointly with Member Secretary, AICTE, New Delhi",
            "lien_marked": True,
            "lien_clause": "Lien noted in bank records in favor of Member Secretary, AICTE vide ref AICTE/REG/DEPOSIT."
        },
        "confidence_scores": {
            "fdr_number": 0.99,
            "bank": 0.98,
            "amount": 0.99,
            "dates": 0.97,
            "lien_marker": 0.96
        },
        "ocr_engine": "AICTE-DepositGuard OCR v2.4 (RapidOCR / Leptonica Engine)",
        "message": "FDR details extracted with 98.2% composite confidence score."
    }
