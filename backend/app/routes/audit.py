import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AuditBlock
from ..schemas import AuditBlockResponse
from ..audit_chain import verify_audit_chain, compute_sha256

router = APIRouter(prefix="/api/audit", tags=["Tamper-Proof Audit Trail"])

# In-memory store for restoring tampered blocks during SIH live demonstration
ORIGINAL_BLOCK_CACHE = {}

@router.get("/chain", response_model=List[AuditBlockResponse])
def get_audit_chain(limit: int = 100, db: Session = Depends(get_db)):
    blocks = db.query(AuditBlock).order_by(AuditBlock.block_index.desc()).limit(limit).all()
    return blocks

@router.get("/verify")
def verify_chain_integrity(db: Session = Depends(get_db)):
    """
    Cryptographically verifies the entire SHA-256 hash chain from Genesis to tip.
    Re-hashes every single record and verifies previous_hash mathematical links.
    """
    result = verify_audit_chain(db)
    return result

@router.post("/tamper-demo/{block_index}")
def simulate_tamper_demo(block_index: int, db: Session = Depends(get_db)):
    """
    FOR EVALUATION / DEMO PURPOSE:
    Simulates a rogue database attacker altering an audit record directly in SQL.
    Shows the SIH judges how DepositGuard's cryptographic hash chain instantly detects
    the exact block index and payload violation!
    """
    block = db.query(AuditBlock).filter(AuditBlock.block_index == block_index).first()
    if not block:
        raise HTTPException(status_code=404, detail=f"Audit block #{block_index} not found")

    # Save original in cache for restoration
    if block_index not in ORIGINAL_BLOCK_CACHE:
        ORIGINAL_BLOCK_CACHE[block_index] = {
            "details": block.details,
            "payload_hash": block.payload_hash,
            "block_hash": block.block_hash
        }

    # Alter the details secretly in the database
    fake_details = json.loads(block.details)
    fake_details["MALICIOUS_TAMPER"] = "Unauthorized direct SQL alteration: Reduced deposit amount by ₹50,00,000 without authorization"
    fake_details["amount"] = 999.00
    
    block.details = json.dumps(fake_details)
    # Notice: payload_hash and block_hash are NOT updated, simulating an unauthorized DB attack
    db.commit()

    return {
        "status": "TAMPER_SIMULATED",
        "block_index": block_index,
        "message": f"Block #{block_index} payload altered in database. Run chain verification now to observe tamper detection!",
        "tampered_details": fake_details
    }

@router.post("/restore-demo/{block_index}")
def restore_tamper_demo(block_index: int, db: Session = Depends(get_db)):
    """Restores the tampered block back to its original cryptographic state."""
    if block_index not in ORIGINAL_BLOCK_CACHE:
        raise HTTPException(status_code=400, detail="Block was not tampered or original state not found in cache")

    orig = ORIGINAL_BLOCK_CACHE[block_index]
    block = db.query(AuditBlock).filter(AuditBlock.block_index == block_index).first()
    if block:
        block.details = orig["details"]
        block.payload_hash = orig["payload_hash"]
        block.block_hash = orig["block_hash"]
        db.commit()
        del ORIGINAL_BLOCK_CACHE[block_index]

    return {
        "status": "RESTORED",
        "block_index": block_index,
        "message": f"Block #{block_index} successfully restored to genuine signed state. Hash chain restored."
    }
