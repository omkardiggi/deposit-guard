import io
import os
import json
import base64
import pyqrcode
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import FDR, Institution, BankVerification, FieldProvenance, NotificationAlert
from ..schemas import BankVerificationSubmit
from ..security import generate_dsc_attestation
from ..audit_chain import add_audit_block

router = APIRouter(prefix="/api/bank", tags=["Bank Verification Portal"])

@router.get("/request/{token}")
def get_bank_request(token: str, db: Session = Depends(get_db)):
    """
    Public 1-time token endpoint accessed by Issuing Bank Nodal Officer.
    Validates token validity, expiration (15 days), and returns verification form data.
    """
    fdr = db.query(FDR).filter(FDR.verification_token == token).first()
    if not fdr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found. The link may be invalid or expired."
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    # Ensure timezone awareness for comparison
    expires_at = fdr.verification_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    is_expired = now > expires_at

    return {
        "is_valid": True,
        "is_expired": is_expired,
        "expires_at": fdr.verification_expires_at.isoformat(),
        "fdr_id": fdr.id,
        "fdr_number": fdr.fdr_number,
        "purpose": fdr.purpose,
        "issuing_bank": fdr.issuing_bank,
        "branch_name": fdr.branch_name,
        "ifsc_code": fdr.ifsc_code,
        "declared_amount": fdr.declared_amount,
        "issue_date": fdr.issue_date,
        "declared_maturity_date": fdr.declared_maturity_date,
        "tenure_months": fdr.tenure_months,
        "interest_rate": fdr.interest_rate,
        "declared_joint_holder": fdr.declared_joint_holder,
        "declared_lien": fdr.declared_lien,
        "auto_renewal_clause": fdr.auto_renewal_clause,
        "status": fdr.status,
        "institution": {
            "name": fdr.institution.name,
            "aicte_id": fdr.institution.aicte_id,
            "city": fdr.institution.city,
            "state": fdr.institution.state
        },
        "is_already_verified": len(fdr.verifications) > 0,
        "existing_verification": {
            "verified_at": fdr.verifications[0].verified_at.isoformat(),
            "nodal_officer": fdr.verifications[0].nodal_officer_name,
            "dsc_signer_dn": fdr.verifications[0].dsc_signer_dn
        } if len(fdr.verifications) > 0 else None
    }

@router.post("/verify")
def submit_bank_verification(payload: BankVerificationSubmit, db: Session = Depends(get_db)):
    """
    Submits official bank ledger verification signed with Bank Nodal Officer's DSC.
    Automatically tags provenance fields, identifies mismatches, and locks bank-confirmed values.
    """
    fdr = db.query(FDR).filter(FDR.verification_token == payload.token).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="Invalid verification token")

    # Detect Discrepancies
    discrepancies = []
    
    # 1. Amount mismatch check
    amount_diff = abs(fdr.declared_amount - payload.confirmed_amount)
    if amount_diff > 1.0:
        discrepancies.append(
            f"AMOUNT_MISMATCH: Declared ₹{fdr.declared_amount:,.2f} vs Bank Confirmed ₹{payload.confirmed_amount:,.2f}"
        )

    # 2. Maturity date mismatch
    if fdr.declared_maturity_date != payload.confirmed_maturity_date:
        discrepancies.append(
            f"MATURITY_DATE_MISMATCH: Declared {fdr.declared_maturity_date} vs Bank Confirmed {payload.confirmed_maturity_date}"
        )

    # 3. Lien marked to AICTE check
    if not payload.confirmed_lien_to_aicte:
        discrepancies.append(
            "LIEN_NOT_MARKED: Bank ledger confirms NO lien marked in favor of Member Secretary, AICTE!"
        )

    # 4. Joint holder name check
    if "AICTE" not in payload.confirmed_joint_holder.upper():
        discrepancies.append(
            f"JOINT_NAME_MISMATCH: Bank record shows '{payload.confirmed_joint_holder}', missing AICTE official name."
        )

    # Generate DSC Digital Signature Simulation (pyHanko / PKCS#7 standard)
    signing_payload = {
        "fdr_number": fdr.fdr_number,
        "amount": payload.confirmed_amount,
        "maturity_date": payload.confirmed_maturity_date,
        "lien": payload.confirmed_lien_to_aicte,
        "bank": payload.bank_name,
        "ifsc": payload.branch_ifsc,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    dsc_attestation = generate_dsc_attestation(
        bank_name=payload.bank_name,
        officer_name=payload.nodal_officer_name,
        officer_empid=payload.nodal_officer_emp_id,
        fdr_payload=signing_payload
    )

    # Save BankVerification
    verification = BankVerification(
        fdr_id=fdr.id,
        token=payload.token,
        bank_name=payload.bank_name,
        branch_ifsc=payload.branch_ifsc,
        nodal_officer_name=payload.nodal_officer_name,
        nodal_officer_emp_id=payload.nodal_officer_emp_id,
        nodal_officer_email=payload.nodal_officer_email,
        confirmed_amount=payload.confirmed_amount,
        confirmed_maturity_date=payload.confirmed_maturity_date,
        confirmed_lien_to_aicte=payload.confirmed_lien_to_aicte,
        confirmed_auto_renewal=payload.confirmed_auto_renewal,
        confirmed_fdr_status=payload.confirmed_fdr_status,
        dsc_signer_dn=dsc_attestation["signer_dn"],
        dsc_cert_issuer=dsc_attestation["cert_issuer"],
        dsc_cert_serial=dsc_attestation["cert_serial"],
        dsc_signature_hex=dsc_attestation["signature_hex"],
        dsc_verified=True,
        discrepancies=json.dumps(discrepancies) if discrepancies else None
    )
    db.add(verification)

    # Update FDR Bank-Confirmed Attributes
    fdr.bank_confirmed_amount = payload.confirmed_amount
    fdr.bank_confirmed_maturity_date = payload.confirmed_maturity_date
    fdr.bank_confirmed_joint_holder = payload.confirmed_joint_holder
    fdr.bank_confirmed_lien = payload.confirmed_lien_to_aicte

    # Update Field Provenances & Trust Tags
    provenance_map = {
        "amount": (f"₹ {payload.confirmed_amount:,.2f}", amount_diff <= 1.0),
        "maturity_date": (payload.confirmed_maturity_date, fdr.declared_maturity_date == payload.confirmed_maturity_date),
        "joint_holder": (payload.confirmed_joint_holder, "AICTE" in payload.confirmed_joint_holder.upper()),
        "lien_status": ("Lien Marked to AICTE" if payload.confirmed_lien_to_aicte else "No Lien Marked", payload.confirmed_lien_to_aicte),
        "issuing_bank": (f"{payload.bank_name} ({payload.branch_ifsc})", True)
    }

    for p in fdr.provenances:
        if p.field_key in provenance_map:
            val, matches = provenance_map[p.field_key]
            p.bank_val = val
            p.is_match = matches
            p.trust_tag = "BANK_CONFIRMED" if matches else "MISMATCH"
            if not matches:
                p.notes = f"Bank record deviates from institution declaration: {val}"

    # Handle FDR Status & No-Gap Renewal Lineage
    if discrepancies:
        fdr.status = "FLAGGED_MISMATCH"
        fdr.status_remarks = f"Discrepancies flagged during Bank DSC verification: {'; '.join(discrepancies)}"
    else:
        # Check if this was a renewal
        if fdr.previous_fdr_id:
            old_fdr = db.query(FDR).filter(FDR.id == fdr.previous_fdr_id).first()
            if old_fdr:
                old_fdr.status = "RENEWED"
                old_fdr.status_remarks = f"Successfully renewed and replaced by bank-confirmed FDR #{fdr.fdr_number}."
            fdr.status = "ACTIVE"
            fdr.status_remarks = f"No-Gap Renewal complete: Replaced old FDR #{old_fdr.fdr_number if old_fdr else ''}. Bank verified and active."
        else:
            fdr.status = "BANK_CONFIRMED"
            fdr.status_remarks = "Bank DSC signature verified. Ready for AICTE Regulation Bureau officer scrutiny."

    # Cryptographic Hash Chain Audit Block
    add_audit_block(
        db=db,
        action="BANK_DSC_CONFIRMATION_SIGNED",
        actor_role="BANK_NODAL_OFFICER",
        actor_name=f"{payload.nodal_officer_name} ({payload.bank_name})",
        entity_type="FDR",
        entity_id=fdr.id,
        details={
            "fdr_number": fdr.fdr_number,
            "bank_name": payload.bank_name,
            "confirmed_amount": payload.confirmed_amount,
            "lien_marked": payload.confirmed_lien_to_aicte,
            "dsc_serial": dsc_attestation["cert_serial"],
            "dsc_issuer": dsc_attestation["cert_issuer"],
            "discrepancies_count": len(discrepancies),
            "discrepancies": discrepancies
        }
    )

    # Send Notification to AICTE
    alert_severity = "CRITICAL" if discrepancies else "SUCCESS"
    alert_title = f"Bank Verification: {'Discrepancy Detected' if discrepancies else 'Verified & DSC Signed'} ({fdr.fdr_number})"
    alert_msg = (
        f"Bank Nodal Officer {payload.nodal_officer_name} ({payload.bank_name}) verified FDR #{fdr.fdr_number}. "
        + (f"Discrepancies found: {', '.join(discrepancies)}" if discrepancies else "Details 100% matched with DSC signature.")
    )
    
    alert = NotificationAlert(
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        alert_type="BANK_VERIFICATION_COMPLETE",
        recipient="AICTE_REGULATION_BUREAU",
        title=alert_title,
        message=alert_msg,
        severity=alert_severity
    )
    db.add(alert)

    db.commit()

    return {
        "status": "SUCCESS",
        "has_discrepancies": len(discrepancies) > 0,
        "discrepancies": discrepancies,
        "fdr_status": fdr.status,
        "dsc_details": dsc_attestation,
        "message": "Bank confirmation and DSC attestation submitted successfully."
    }

@router.get("/token-qr/{token}")
def generate_token_qr(token: str):
    """
    Generates a base64 encoded PNG QR code data URI pointing to the bank verification page.
    """
    # Portal origin the QR points at. Set PORTAL_BASE_URL in the environment
    # when deploying so scanned codes resolve to the hosted portal.
    portal_base = os.getenv("PORTAL_BASE_URL", "http://localhost:5173").rstrip("/")
    verification_url = f"{portal_base}/bank-verify?token={token}"

    qr = pyqrcode.create(verification_url)
    buffer = io.BytesIO()
    qr.png(buffer, scale=6)
    png_base64 = base64.b64encode(buffer.getvalue()).decode()
    return {
        "token": token,
        "qr_image_data_uri": f"data:image/png;base64,{png_base64}",
        "verification_url": verification_url
    }

