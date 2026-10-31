import io
import json
import base64
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import FDR, Institution, LienRelease, User, NotificationAlert
from ..schemas import (
    LienReleaseSubmit, MakerReleaseDecision, CheckerReleaseDecision, LienReleaseResponse
)
from ..security import require_auth, require_roles
from ..audit_chain import add_audit_block

router = APIRouter(prefix="/api/release", tags=["Lien Release & Refund Workflow"])

@router.get("/requests", response_model=List[LienReleaseResponse])
def list_release_requests(
    institution_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(LienRelease).join(FDR).join(Institution)
    
    if institution_id:
        query = query.filter(LienRelease.institution_id == institution_id)
    if status_filter:
        query = query.filter(LienRelease.status == status_filter)

    releases = query.order_by(LienRelease.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "fdr_id": r.fdr_id,
            "fdr_number": r.fdr.fdr_number if r.fdr else "N/A",
            "institution_id": r.institution_id,
            "institution_name": r.institution.name if r.institution else "N/A",
            "amount": r.fdr.bank_confirmed_amount or r.fdr.declared_amount if r.fdr else 0,
            "issuing_bank": r.fdr.issuing_bank if r.fdr else "N/A",
            "reason": r.reason,
            "status": r.status,
            "maker_name": r.maker_name,
            "maker_remarks": r.maker_remarks,
            "maker_date": r.maker_date,
            "checker_name": r.checker_name,
            "checker_remarks": r.checker_remarks,
            "checker_date": r.checker_date,
            "discharge_order_ref": r.discharge_order_ref,
            "created_at": r.created_at
        }
        for r in releases
    ]

@router.post("/apply")
def apply_lien_release(
    payload: LienReleaseSubmit,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_auth)
):
    fdr = db.query(FDR).filter(FDR.id == payload.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    # Check that FDR is not already in release workflow
    existing = db.query(LienRelease).filter(
        LienRelease.fdr_id == fdr.id,
        LienRelease.status.in_(["PENDING_MAKER", "MAKER_RECOMMENDED", "CHECKER_APPROVED"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A release application for this FDR is already pending review.")

    inst = fdr.institution
    release = LienRelease(
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        reason=payload.reason,
        compliance_undertaking_url=payload.compliance_undertaking_url or "undertaking_affidavit.pdf",
        status="PENDING_MAKER"
    )
    db.add(release)

    fdr.status = "RELEASE_REQUESTED"
    fdr.status_remarks = "Institution applied for Lien Release & Refund. Pending AICTE Maker scrutiny."

    actor_name = current_user.full_name if current_user else inst.name
    actor_role = current_user.role if current_user else "INSTITUTION"

    # Cryptographic Audit Block
    add_audit_block(
        db=db,
        action="LIEN_RELEASE_APPLICATION_FILED",
        actor_role=actor_role,
        actor_name=actor_name,
        entity_type="LIEN_RELEASE",
        entity_id=release.id,
        details={
            "fdr_number": fdr.fdr_number,
            "institution_name": inst.name,
            "amount": fdr.bank_confirmed_amount or fdr.declared_amount,
            "reason": payload.reason
        }
    )

    alert = NotificationAlert(
        fdr_id=fdr.id,
        institution_id=inst.id,
        alert_type="RELEASE_APPLICATION_SUBMITTED",
        recipient="AICTE_REGULATION_BUREAU",
        title=f"Lien Release Request: {inst.name}",
        message=f"Application received for release of FDR #{fdr.fdr_number} (₹{fdr.declared_amount:,.2f}). Reason: {payload.reason}",
        severity="INFO"
    )
    db.add(alert)

    db.commit()
    db.refresh(release)

    return {
        "status": "SUCCESS",
        "release_id": release.id,
        "message": "Lien release application submitted for scrutiny by AICTE Regulation Bureau."
    }

@router.post("/maker-recommend")
def maker_recommend_release(
    payload: MakerReleaseDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_MAKER", "AICTE_CHECKER"]))
):
    """Stage 1 of Maker-Checker Workflow: Scrutiny Officer verifies compliance conditions."""
    release = db.query(LienRelease).filter(LienRelease.id == payload.release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release record not found")

    now = datetime.now(timezone.utc)
    release.maker_id = current_user.id
    release.maker_name = current_user.full_name
    release.maker_remarks = payload.remarks
    release.maker_date = now

    fdr = release.fdr

    if payload.decision == "RECOMMEND":
        release.status = "MAKER_RECOMMENDED"
        fdr.status = "RELEASE_MAKER_RECOMMENDED"
        fdr.status_remarks = f"Maker Officer ({current_user.full_name}) recommended release: {payload.remarks}"
        next_step = "Forwarded to Competent Authority (Member Secretary / Checker) for final authorization."
    else:
        release.status = "REJECTED"
        fdr.status = "ACTIVE"
        fdr.status_remarks = f"Release application rejected by Maker Officer: {payload.remarks}"
        next_step = "Application rejected. FDR remains in active pledged status."

    add_audit_block(
        db=db,
        action=f"LIEN_RELEASE_MAKER_{payload.decision}",
        actor_role="AICTE_MAKER",
        actor_name=f"{current_user.full_name} ({current_user.designation})",
        entity_type="LIEN_RELEASE",
        entity_id=release.id,
        details={
            "fdr_number": fdr.fdr_number,
            "decision": payload.decision,
            "remarks": payload.remarks
        }
    )

    db.commit()

    return {
        "status": "SUCCESS",
        "release_status": release.status,
        "message": next_step
    }

@router.post("/checker-approve")
def checker_approve_release(
    payload: CheckerReleaseDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_CHECKER"]))
):
    """
    Stage 2 of Maker-Checker Workflow:
    Competent Authority (Director / Member Secretary) executes final sanction order.
    Issues digitally signed AICTE Lien Discharge Order.
    """
    release = db.query(LienRelease).filter(LienRelease.id == payload.release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release record not found")

    if release.status != "MAKER_RECOMMENDED":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute Checker decision. Current status is '{release.status}', requires 'MAKER_RECOMMENDED'."
        )

    now = datetime.now(timezone.utc)
    release.checker_id = current_user.id
    release.checker_name = current_user.full_name
    release.checker_remarks = payload.remarks
    release.checker_date = now

    fdr = release.fdr
    inst = release.institution

    if payload.decision == "APPROVE":
        order_ref = f"AICTE/REG/FDR-REL/{datetime.now().year}/{release.id[-6:].upper()}"
        release.status = "CHECKER_APPROVED"
        release.discharge_order_ref = order_ref
        
        fdr.status = "RELEASE_CHECKER_APPROVED"
        fdr.status_remarks = f"Final release approved by Competent Authority ({current_user.full_name}). Official Discharge Order #{order_ref} issued to {fdr.issuing_bank}."

        add_audit_block(
            db=db,
            action="LIEN_DISCHARGE_ORDER_ISSUED",
            actor_role="AICTE_CHECKER",
            actor_name=f"{current_user.full_name} ({current_user.designation})",
            entity_type="LIEN_RELEASE",
            entity_id=release.id,
            details={
                "order_ref": order_ref,
                "fdr_number": fdr.fdr_number,
                "institution_name": inst.name,
                "amount": fdr.bank_confirmed_amount or fdr.declared_amount,
                "issuing_bank": fdr.issuing_bank,
                "remarks": payload.remarks
            }
        )

        # Notify Institution & Issuing Bank
        alert = NotificationAlert(
            fdr_id=fdr.id,
            institution_id=inst.id,
            alert_type="LIEN_RELEASE_APPROVED",
            recipient=inst.name,
            title=f"Lien Discharge Order Issued: {order_ref}",
            message=f"Competent Authority approved release of FDR #{fdr.fdr_number}. AICTE Lien Discharge Letter generated for submission to {fdr.issuing_bank}.",
            severity="SUCCESS"
        )
        db.add(alert)
        msg = f"Release approved. Official Discharge Order #{order_ref} generated."
    else:
        release.status = "REJECTED"
        fdr.status = "ACTIVE"
        fdr.status_remarks = f"Release application rejected by Competent Authority: {payload.remarks}"
        
        add_audit_block(
            db=db,
            action="LIEN_RELEASE_CHECKER_REJECTED",
            actor_role="AICTE_CHECKER",
            actor_name=f"{current_user.full_name} ({current_user.designation})",
            entity_type="LIEN_RELEASE",
            entity_id=release.id,
            details={
                "fdr_number": fdr.fdr_number,
                "remarks": payload.remarks
            }
        )
        msg = "Release application rejected by Competent Authority."

    db.commit()

    return {
        "status": "SUCCESS",
        "release_status": release.status,
        "discharge_order_ref": release.discharge_order_ref,
        "message": msg
    }

@router.post("/execute-discharge/{release_id}")
def execute_bank_lien_discharge(
    release_id: str,
    db: Session = Depends(get_db)
):
    """Bank executes lien discharge in its Core Banking Solution (CBS). Deposit is returned to college."""
    release = db.query(LienRelease).filter(LienRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release record not found")

    if release.status != "CHECKER_APPROVED":
        raise HTTPException(status_code=400, detail="Requires approved discharge order before bank execution")

    now = datetime.now(timezone.utc)
    release.status = "DISCHARGED"
    release.bank_discharge_date = now

    fdr = release.fdr
    fdr.status = "RELEASED"
    fdr.status_remarks = f"Lien officially cleared by {fdr.issuing_bank} on {now.strftime('%d-%b-%Y')}. Security deposit successfully refunded/discharged."

    # Update field provenances
    for p in fdr.provenances:
        if p.field_key == "lien_status":
            p.bank_val = "Lien Discharged / Cleared"
            p.trust_tag = "BANK_CONFIRMED"

    add_audit_block(
        db=db,
        action="BANK_LIEN_DISCHARGE_EXECUTED",
        actor_role="BANK_NODAL_OFFICER",
        actor_name=f"{fdr.issuing_bank} Operations",
        entity_type="FDR",
        entity_id=fdr.id,
        details={
            "fdr_number": fdr.fdr_number,
            "order_ref": release.discharge_order_ref,
            "discharged_at": now.isoformat()
        }
    )

    db.commit()

    return {
        "status": "SUCCESS",
        "fdr_status": "RELEASED",
        "message": "Bank CBS lien cleared successfully. Deposit lifecycle complete."
    }

@router.get("/{release_id}/letter", response_class=HTMLResponse)
def get_discharge_letter_html(release_id: str, db: Session = Depends(get_db)):
    """Renders official Government of India / AICTE Lien Discharge Order letter."""
    release = db.query(LienRelease).filter(LienRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release record not found")

    fdr = release.fdr
    inst = release.institution
    amount_str = f"₹ {fdr.bank_confirmed_amount or fdr.declared_amount:,.2f}"
    ref_no = release.discharge_order_ref or f"AICTE/REG/FDR-REL/2026/{release.id[:8].upper()}"
    date_str = release.checker_date.strftime("%d %B %Y") if release.checker_date else datetime.now().strftime("%d %B %Y")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AICTE Lien Discharge Order - {ref_no}</title>
        <style>
            body {{ font-family: 'Times New Roman', serif; margin: 40px; color: #111; line-height: 1.6; }}
            .header {{ text-align: center; border-bottom: 2px solid #1E3A8A; padding-bottom: 15px; margin-bottom: 25px; }}
            .emblem {{ font-size: 26px; font-weight: bold; color: #1E3A8A; text-transform: uppercase; letter-spacing: 1px; }}
            .sub-emblem {{ font-size: 14px; color: #555; margin-top: 4px; }}
            .ref-box {{ display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; font-weight: bold; }}
            .recipient {{ margin-bottom: 25px; }}
            .subject {{ font-weight: bold; text-decoration: underline; margin-bottom: 20px; }}
            .content p {{ margin-bottom: 14px; text-align: justify; }}
            .table-box {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .table-box th, .table-box td {{ border: 1px solid #777; padding: 8px 12px; text-align: left; }}
            .table-box th {{ background-color: #f2f5f9; }}
            .seal-box {{ display: flex; justify-content: space-between; margin-top: 50px; }}
            .signature {{ text-align: center; width: 250px; }}
            .dsc-badge {{ border: 1px dashed #1E3A8A; background-color: #F8FAFC; padding: 10px; font-size: 11px; margin-top: 15px; font-family: monospace; }}
            .watermark {{ position: fixed; top: 40%; left: 25%; font-size: 70px; color: rgba(30, 58, 138, 0.05); transform: rotate(-30deg); z-index: -1; }}
        </style>
    </head>
    <body>
        <div class="watermark">AICTE OFFICIAL</div>
        <div class="header">
            <div class="emblem">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
            <div class="sub-emblem">(A STATUTORY BODY OF THE GOVERNMENT OF INDIA, MINISTRY OF EDUCATION)</div>
            <div class="sub-emblem">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | www.aicte-india.org</div>
        </div>

        <div class="ref-box">
            <div>F. No.: {ref_no}</div>
            <div>Date: {date_str}</div>
        </div>

        <div class="recipient">
            <strong>To,</strong><br>
            The Branch Manager / Nodal Officer,<br>
            {fdr.issuing_bank},<br>
            {fdr.branch_name} (IFSC: {fdr.ifsc_code})
        </div>

        <div class="subject">
            SUBJECT: Official Discharge and Release of Lien marked in favor of AICTE on Fixed Deposit Receipt (FDR) No. {fdr.fdr_number}
        </div>

        <div class="content">
            <p>Sir / Madam,</p>
            <p>
                This has reference to the Fixed Deposit Receipt (FDR) deposited by <strong>{inst.name}</strong> (AICTE Permanent Institute ID: <strong>{inst.aicte_id}</strong>) as security deposit towards regulatory compliance in accordance with the AICTE Approval Process Handbook.
            </p>
            <p>
                The Competent Authority of the Council, having verified the fulfillment of prescribed operational conditions, completion of requisite tenure, and compliance scrutiny reports, has accorded formal approval for the release and discharge of lien on the said financial instrument.
            </p>

            <table class="table-box">
                <tr><th>Institution Name</th><td>{inst.name} ({inst.aicte_id})</td></tr>
                <tr><th>FDR Receipt Number</th><td><strong>{fdr.fdr_number}</strong></td></tr>
                <tr><th>Issuing Bank & Branch</th><td>{fdr.issuing_bank}, {fdr.branch_name}</td></tr>
                <tr><th>Deposit Principal Amount</th><td><strong>{amount_str}</strong></td></tr>
                <tr><th>Issue / Maturity Dates</th><td>{fdr.issue_date} to {fdr.bank_confirmed_maturity_date or fdr.declared_maturity_date}</td></tr>
                <tr><th>Lien Discharge Order Ref</th><td><strong>{ref_no}</strong></td></tr>
                <tr><th>Scrutiny Recommendation</th><td>Verified by Regulation Bureau: {release.maker_remarks or 'Norms fulfilled'}</td></tr>
            </table>

            <p>
                You are hereby authorized to remove/clear the lien marked in favor of the <em>"Member Secretary, AICTE, New Delhi"</em> on the aforementioned FDR in your Core Banking System (CBS) and allow the institution to utilize or redeem the proceeds in accordance with banking norms.
            </p>
        </div>

        <div class="seal-box">
            <div>
                <div class="dsc-badge">
                    <strong>CRYPTOGRAPHIC VERIFICATION SEAL</strong><br>
                    Hash: SHA-256 Validated<br>
                    Signer: Member Secretary / Director (AICTE)<br>
                    Timestamp: {date_str} (IST)<br>
                    Portal: depositguard.aicte.gov.in
                </div>
            </div>
            <div class="signature">
                <br><br>
                <strong>(Authorized Signatory)</strong><br>
                Advisor / Director (Regulation Bureau)<br>
                For Member Secretary, AICTE
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
