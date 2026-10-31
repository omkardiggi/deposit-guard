import json
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Institution, FDR, NotificationAlert, AuditBlock, LienRelease
from ..schemas import InstitutionResponse, InstitutionCreate

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])

# Statuses that mean the instrument is no longer providing live cover.
CLOSED_STATUSES = {"RELEASED", "RENEWED", "REJECTED"}


@router.get("", response_model=List[InstitutionResponse])
def list_institutions(
    state: Optional[str] = None,
    search: Optional[str] = Query(None, description="Type-ahead match on name, AICTE ID or city"),
    db: Session = Depends(get_db),
):
    query = db.query(Institution)
    if state:
        query = query.filter(Institution.state == state)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Institution.name.ilike(term),
                Institution.aicte_id.ilike(term),
                Institution.city.ilike(term),
                Institution.state.ilike(term),
            )
        )
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
        phone=payload.phone,
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst


def _days_until(date_str: Optional[str]) -> Optional[int]:
    try:
        return (datetime.strptime(date_str, "%Y-%m-%d").date() - date.today()).days
    except (ValueError, TypeError):
        return None


@router.get("/{id}/summary")
def institution_summary(id: str, db: Session = Depends(get_db)):
    """
    Consolidated AICTE-officer view of one institution: every instrument with
    its document-upload state, plus an explicit declaration of every mismatch
    or deficiency found across the institution's deposits.
    """
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    fdrs = db.query(FDR).filter(FDR.institution_id == inst.id).order_by(FDR.created_at.desc()).all()

    instruments = []
    findings = []           # explicit declarations of anything wrong
    with_doc = 0
    declared_total = 0.0
    confirmed_total = 0.0
    live_cover = 0.0

    def flag(severity, code, title, detail, f=None):
        findings.append({
            "severity": severity,
            "code": code,
            "title": title,
            "detail": detail,
            "fdr_id": f.id if f else None,
            "fdr_number": f.fdr_number if f else None,
        })

    for f in fdrs:
        verification = f.verifications[0] if f.verifications else None
        has_doc = bool(f.document_path)
        if has_doc:
            with_doc += 1

        ocr_record = None
        if f.ocr_extract:
            try:
                ocr_record = json.loads(f.ocr_extract)
            except (ValueError, TypeError):
                ocr_record = None

        inst_match = (ocr_record or {}).get("institution_match")
        days = _days_until(f.bank_confirmed_maturity_date or f.declared_maturity_date)

        declared_total += f.declared_amount or 0.0
        if f.bank_confirmed_amount is not None:
            confirmed_total += f.bank_confirmed_amount
        if f.status not in CLOSED_STATUSES:
            live_cover += (f.bank_confirmed_amount or f.declared_amount or 0.0)

        # ---------- declare every deficiency on this instrument ----------
        if not has_doc:
            flag("WARNING", "MISSING_DOCUMENT",
                 "Source instrument not uploaded",
                 f"No FDR document is on file for {f.fdr_number}. Regulatory verification cannot be evidenced.", f)

        if verification is None and f.status not in CLOSED_STATUSES:
            flag("INFO", "AWAITING_BANK_VERIFICATION",
                 "Awaiting bank attestation",
                 f"{f.fdr_number} has not yet been DSC-attested by {f.issuing_bank}.", f)

        if f.bank_confirmed_amount is not None and abs(f.bank_confirmed_amount - f.declared_amount) > 1.0:
            diff = f.declared_amount - f.bank_confirmed_amount
            flag("CRITICAL", "AMOUNT_MISMATCH",
                 "Declared amount does not match bank record",
                 f"{f.fdr_number}: declared ₹{f.declared_amount:,.2f} vs bank-confirmed "
                 f"₹{f.bank_confirmed_amount:,.2f} (shortfall ₹{diff:,.2f}).", f)

        if f.bank_confirmed_lien is False:
            flag("CRITICAL", "LIEN_NOT_MARKED",
                 "No AICTE lien in bank records",
                 f"{f.fdr_number}: the issuing bank confirms no lien marked in favour of "
                 f"Member Secretary, AICTE. The deposit is unencumbered.", f)

        if (f.bank_confirmed_maturity_date and
                f.bank_confirmed_maturity_date != f.declared_maturity_date):
            flag("WARNING", "MATURITY_MISMATCH",
                 "Maturity date differs from bank record",
                 f"{f.fdr_number}: declared {f.declared_maturity_date} vs bank-confirmed "
                 f"{f.bank_confirmed_maturity_date}.", f)

        if f.bank_confirmed_joint_holder and "AICTE" not in f.bank_confirmed_joint_holder.upper():
            flag("CRITICAL", "JOINT_HOLDER_MISMATCH",
                 "AICTE missing from account title",
                 f"{f.fdr_number}: bank records show '{f.bank_confirmed_joint_holder}' "
                 f"without the AICTE joint-holder clause.", f)

        if f.status == "FLAGGED_MISMATCH":
            flag("CRITICAL", "FLAGGED_INSTRUMENT",
                 "Instrument flagged in scrutiny",
                 f"{f.fdr_number} is flagged: {f.status_remarks or 'discrepancies recorded'}", f)

        if inst_match and inst_match.get("verdict") in ("NO_MATCH", "PARTIAL"):
            flag("CRITICAL" if inst_match["verdict"] == "NO_MATCH" else "WARNING",
                 "DOCUMENT_INSTITUTION_MISMATCH",
                 "Uploaded document may belong to another institution",
                 f"{f.fdr_number}: {inst_match.get('reason', '')} "
                 f"(match score {inst_match.get('score', 0)}).", f)

        mismatched_fields = [p.field_key for p in f.provenances if p.trust_tag == "MISMATCH"]
        if mismatched_fields:
            flag("WARNING", "PROVENANCE_MISMATCH",
                 "Field-level provenance mismatch",
                 f"{f.fdr_number}: {', '.join(mismatched_fields)} differ between the "
                 f"institution's declaration and the bank's record.", f)

        if days is not None and f.status not in CLOSED_STATUSES:
            if days <= 0 and f.status != "RENEWAL_IN_PROGRESS":
                flag("CRITICAL", "MATURED_NOT_RENEWED",
                     "Instrument matured without renewal",
                     f"{f.fdr_number} matured {abs(days)} day(s) ago and has no bank-confirmed "
                     f"replacement. Deposit cover has lapsed.", f)
            elif days <= 60:
                flag("WARNING", "EXPIRING_SOON",
                     "Maturity approaching",
                     f"{f.fdr_number} matures in {days} day(s). A no-gap replacement is required.", f)

        instruments.append({
            "id": f.id,
            "fdr_number": f.fdr_number,
            "status": f.status,
            "purpose": f.purpose,
            "issuing_bank": f.issuing_bank,
            "branch_name": f.branch_name,
            "declared_amount": f.declared_amount,
            "bank_confirmed_amount": f.bank_confirmed_amount,
            "issue_date": f.issue_date,
            "maturity_date": f.bank_confirmed_maturity_date or f.declared_maturity_date,
            "days_to_maturity": days,
            "document": {
                "uploaded": has_doc,
                "filename": f.document_filename,
                "stored_path": f.document_path,
                "download_url": f"/api/documents/{f.document_path}" if f.document_path else None,
                "extraction_method": (ocr_record or {}).get("method"),
                "fields_detected": (ocr_record or {}).get("detected_count"),
                "fields_total": (ocr_record or {}).get("total_fields"),
                "ocr_confidence": (ocr_record or {}).get("ocr_confidence"),
                "institution_match": inst_match,
            },
            "is_bank_verified": verification is not None,
            "mismatch_count": len(mismatched_fields),
        })

    severity_rank = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    findings.sort(key=lambda x: severity_rank.get(x["severity"], 3))

    status_counts: dict = {}
    for f in fdrs:
        status_counts[f.status] = status_counts.get(f.status, 0) + 1

    alerts = (
        db.query(NotificationAlert)
        .filter(NotificationAlert.institution_id == inst.id)
        .order_by(NotificationAlert.created_at.desc())
        .limit(20)
        .all()
    )

    fdr_ids = [f.id for f in fdrs]
    release_ids = [
        r.id for r in db.query(LienRelease).filter(LienRelease.institution_id == inst.id).all()
    ]
    recent_activity = (
        db.query(AuditBlock)
        .filter(AuditBlock.entity_id.in_(fdr_ids + release_ids + [inst.id]))
        .order_by(AuditBlock.block_index.desc())
        .limit(15)
        .all()
    ) if (fdr_ids or release_ids) else []

    total = len(fdrs)
    critical = sum(1 for x in findings if x["severity"] == "CRITICAL")
    warnings = sum(1 for x in findings if x["severity"] == "WARNING")

    if critical:
        posture, headline = "NON_COMPLIANT", f"{critical} critical deficiency(ies) require immediate action."
    elif warnings:
        posture, headline = "ATTENTION_REQUIRED", f"{warnings} item(s) need follow-up."
    elif total == 0:
        posture, headline = "NO_RECORDS", "No deposits are on record for this institution."
    else:
        posture, headline = "COMPLIANT", "All deposits are bank-verified and documented."

    return {
        "institution": {
            "id": inst.id,
            "aicte_id": inst.aicte_id,
            "name": inst.name,
            "institute_type": inst.institute_type,
            "state": inst.state,
            "city": inst.city,
            "address": inst.address,
            "contact_person": inst.contact_person,
            "email": inst.email,
            "phone": inst.phone,
            "created_at": inst.created_at,
        },
        # Headline summary for the AICTE officer
        "summary": {
            "compliance_posture": posture,
            "headline": headline,
            "total_instruments": total,
            "critical_findings": critical,
            "warning_findings": warnings,
            "info_findings": sum(1 for x in findings if x["severity"] == "INFO"),
            "bank_verified_count": sum(1 for i in instruments if i["is_bank_verified"]),
            "documents_uploaded": with_doc,
            "documents_missing": total - with_doc,
            "document_compliance_percent": round((with_doc / total) * 100, 1) if total else 0.0,
            "declared_total": round(declared_total, 2),
            "bank_confirmed_total": round(confirmed_total, 2),
            "live_deposit_cover": round(live_cover, 2),
            "amount_variance": round(confirmed_total - declared_total, 2) if confirmed_total else 0.0,
            "expiring_within_60_days": sum(
                1 for i in instruments
                if i["days_to_maturity"] is not None and 0 < i["days_to_maturity"] <= 60
            ),
            "matured_count": sum(
                1 for i in instruments
                if i["days_to_maturity"] is not None and i["days_to_maturity"] <= 0
            ),
            "status_breakdown": status_counts,
        },
        "findings": findings,
        "instruments": instruments,
        "alerts": [
            {
                "id": a.id, "alert_type": a.alert_type, "title": a.title,
                "message": a.message, "severity": a.severity,
                "is_read": a.is_read, "created_at": a.created_at,
            } for a in alerts
        ],
        "recent_activity": [
            {
                "block_index": b.block_index, "timestamp": b.timestamp, "action": b.action,
                "actor_name": b.actor_name, "actor_role": b.actor_role,
            } for b in recent_activity
        ],
    }
