from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import FDR, NotificationAlert, Institution
from ..schemas import NotificationResponse

router = APIRouter(prefix="/api/alerts", tags=["Smart Maturity Watch & Alerts"])

@router.get("", response_model=List[NotificationResponse])
def get_alerts(
    recipient: Optional[str] = None,
    institution_id: Optional[str] = None,
    unread_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(NotificationAlert)

    if recipient:
        # Scope alerts to the signed-in persona. The AICTE officer also sees
        # bureau-wide and institution/maturity alerts; the bank officer sees
        # only alerts explicitly routed to the bank nodal cell.
        if recipient == "AICTE_OFFICER":
            query = query.filter(NotificationAlert.recipient != "BANK_OFFICER")
        else:
            query = query.filter(NotificationAlert.recipient == recipient)

    if institution_id:
        query = query.filter(NotificationAlert.institution_id == institution_id)
    if unread_only:
        query = query.filter(NotificationAlert.is_read == False)

    alerts = query.order_by(NotificationAlert.created_at.desc()).limit(100).all()
    return alerts

@router.post("/run-scheduler")
def trigger_maturity_scheduler(db: Session = Depends(get_db)):
    """
    Executes the Daily Automated Maturity & Validity Watch Scheduler (Slides 2 & 3).
    Evaluates 60, 30, 15 days thresholds, updates FDR states, and fires multi-tier alerts.
    """
    today = date.today()
    fdrs = db.query(FDR).filter(FDR.status.in_(["ACTIVE", "EXPIRING_SOON", "BANK_CONFIRMED"])).all()
    
    generated_alerts = []
    updated_fdrs = []

    for f in fdrs:
        mat_date_str = f.bank_confirmed_maturity_date or f.declared_maturity_date
        try:
            mat_date = datetime.strptime(mat_date_str, "%Y-%m-%d").date()
        except Exception:
            continue

        days_remaining = (mat_date - today).days

        # Check existing alerts for this FDR today to avoid duplicate alerts
        existing_alert = db.query(NotificationAlert).filter(
            NotificationAlert.fdr_id == f.id,
            NotificationAlert.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        ).first()

        if days_remaining <= 0:
            # Instrument has matured
            if f.status != "MATURED":
                f.status = "MATURED"
                f.status_remarks = f"Instrument matured on {mat_date_str}. Immediate renewal or release action required."
                updated_fdrs.append(f.fdr_number)

            if not existing_alert:
                alert = NotificationAlert(
                    fdr_id=f.id,
                    institution_id=f.institution_id,
                    alert_type="MATURED_OVERDUE",
                    recipient=f.institution.name if f.institution else "Institution",
                    title=f"CRITICAL: FDR #{f.fdr_number} Matured!",
                    message=f"Deposit of ₹{f.declared_amount:,.2f} at {f.issuing_bank} matured on {mat_date_str}. Incurring compliance non-conformity. Submit renewal or release application immediately.",
                    severity="CRITICAL"
                )
                db.add(alert)
                generated_alerts.append(alert.title)

        elif days_remaining <= 15:
            if f.status != "EXPIRING_SOON":
                f.status = "EXPIRING_SOON"
                updated_fdrs.append(f.fdr_number)
            
            if not existing_alert:
                alert = NotificationAlert(
                    fdr_id=f.id,
                    institution_id=f.institution_id,
                    alert_type="MATURITY_15_DAYS",
                    recipient=f.institution.name if f.institution else "Institution",
                    title=f"URGENT: FDR #{f.fdr_number} Matures in {days_remaining} Days",
                    message=f"Fixed Deposit of ₹{f.declared_amount:,.2f} at {f.issuing_bank} will mature on {mat_date_str}. Submit replacement FDR for No-Gap Renewal to maintain regulatory approval.",
                    severity="CRITICAL"
                )
                db.add(alert)
                generated_alerts.append(alert.title)

        elif days_remaining <= 30:
            if f.status != "EXPIRING_SOON":
                f.status = "EXPIRING_SOON"
                updated_fdrs.append(f.fdr_number)

            if not existing_alert:
                alert = NotificationAlert(
                    fdr_id=f.id,
                    institution_id=f.institution_id,
                    alert_type="MATURITY_30_DAYS",
                    recipient=f.institution.name if f.institution else "Institution",
                    title=f"Notice: FDR #{f.fdr_number} Matures in {days_remaining} Days",
                    message=f"Deposit of ₹{f.declared_amount:,.2f} will mature on {mat_date_str}. Please notify bank and prepare renewal documentation.",
                    severity="WARNING"
                )
                db.add(alert)
                generated_alerts.append(alert.title)

        elif days_remaining <= 60:
            if not existing_alert:
                alert = NotificationAlert(
                    fdr_id=f.id,
                    institution_id=f.institution_id,
                    alert_type="MATURITY_60_DAYS",
                    recipient=f.institution.name if f.institution else "Institution",
                    title=f"Advance Reminder: FDR #{f.fdr_number} Matures in {days_remaining} Days",
                    message=f"Deposit of ₹{f.declared_amount:,.2f} has upcoming maturity on {mat_date_str}.",
                    severity="INFO"
                )
                db.add(alert)
                generated_alerts.append(alert.title)

    db.commit()

    return {
        "status": "SUCCESS",
        "scheduler_run_date": today.isoformat(),
        "total_fdrs_evaluated": len(fdrs),
        "status_updated_count": len(updated_fdrs),
        "updated_fdr_numbers": updated_fdrs,
        "new_alerts_generated": len(generated_alerts),
        "alert_titles": generated_alerts
    }

@router.post("/{alert_id}/mark-read")
def mark_alert_read(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(NotificationAlert).filter(NotificationAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"status": "SUCCESS", "alert_id": alert_id}

