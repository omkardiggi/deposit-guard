import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import FDR, Institution, BankVerification, LienRelease
from ..schemas import DashboardStatsResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    fdrs = db.query(FDR).all()
    
    total_fdrs = len(fdrs)
    total_amt = sum((f.bank_confirmed_amount or f.declared_amount) for f in fdrs)
    total_crores = round(total_amt / 10000000.0, 2)
    
    active_count = sum(1 for f in fdrs if f.status == "ACTIVE")
    pending_bank = sum(1 for f in fdrs if f.status == "PENDING_VERIFICATION")
    expiring_soon = sum(1 for f in fdrs if f.status == "EXPIRING_SOON")
    matured = sum(1 for f in fdrs if f.status == "MATURED")
    renewals = sum(1 for f in fdrs if f.status == "RENEWAL_IN_PROGRESS")
    releases = sum(1 for f in fdrs if f.status in ["RELEASE_REQUESTED", "RELEASE_MAKER_RECOMMENDED", "RELEASE_CHECKER_APPROVED"])
    discrepancies = sum(1 for f in fdrs if f.status == "FLAGGED_MISMATCH")
    
    verified_count = sum(1 for f in fdrs if f.bank_confirmed_amount is not None)
    bank_verified_rate = round((verified_count / total_fdrs * 100) if total_fdrs > 0 else 0, 1)

    return {
        "total_fdrs": total_fdrs,
        "total_amount_crores": total_crores,
        "active_count": active_count,
        "pending_bank_count": pending_bank,
        "expiring_soon_count": expiring_soon,
        "matured_count": matured,
        "renewal_in_progress_count": renewals,
        "release_requested_count": releases,
        "discrepancy_count": discrepancies,
        "bank_verified_rate": bank_verified_rate
    }

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    fdrs = db.query(FDR).all()
    
    # Bank Distribution
    bank_dist = {}
    for f in fdrs:
        bank = f.issuing_bank
        bank_dist[bank] = bank_dist.get(bank, 0) + 1

    # Status Distribution
    status_dist = {}
    for f in fdrs:
        status_dist[f.status] = status_dist.get(f.status, 0) + 1

    # State Distribution
    state_dist = {}
    for f in fdrs:
        st = f.institution.state if f.institution else "Other"
        state_dist[st] = state_dist.get(st, 0) + 1

    return {
        "bank_distribution": [{"bank": k, "count": v} for k, v in bank_dist.items()],
        "status_distribution": [{"status": k, "count": v} for k, v in status_dist.items()],
        "state_distribution": [{"state": k, "count": v} for k, v in state_dist.items()]
    }

@router.get("/export-csv")
def export_fdrs_csv(db: Session = Depends(get_db)):
    fdrs = db.query(FDR).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "FDR Number", "AICTE Institution ID", "Institution Name", "State", "Type",
        "Issuing Bank", "Branch", "IFSC", "Declared Amount (INR)", "Bank Confirmed Amount (INR)",
        "Issue Date", "Maturity Date", "Tenure (Months)", "Lien Marked", "Status",
        "Verification Status", "Remarks"
    ])
    
    for f in fdrs:
        inst = f.institution
        writer.writerow([
            f.fdr_number,
            inst.aicte_id if inst else "N/A",
            inst.name if inst else "N/A",
            inst.state if inst else "N/A",
            inst.institute_type if inst else "N/A",
            f.issuing_bank,
            f.branch_name,
            f.ifsc_code,
            f.declared_amount,
            f.bank_confirmed_amount or "Unconfirmed",
            f.issue_date,
            f.bank_confirmed_maturity_date or f.declared_maturity_date,
            f.tenure_months,
            "YES" if (f.bank_confirmed_lien or f.declared_lien) else "NO",
            f.status,
            "Bank DSC Confirmed" if f.bank_confirmed_amount else "Declared / Pending",
            f.status_remarks or ""
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=AICTE_DepositGuard_FDR_Registry.csv"}
    )

