from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Message, NotificationAlert, User
from ..schemas import MessageCreate, MessageResponse
from ..security import get_current_user
from ..audit_chain import add_audit_block

router = APIRouter(prefix="/api/messages", tags=["Two-Way Official Communications"])

@router.get("", response_model=List[MessageResponse])
def get_messages(
    role: Optional[str] = Query(None, description="Current user role: AICTE_OFFICER or BANK_OFFICER"),
    unread_only: bool = False,
    fdr_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Message)
    
    if role:
        # Return messages where the user's role is either the recipient or the sender
        query = query.filter(
            (Message.recipient_role == role) | (Message.sender_role == role)
        )
    if unread_only and role:
        query = query.filter(Message.recipient_role == role, Message.is_read == False)
    if fdr_id:
        query = query.filter(Message.fdr_id == fdr_id)

    messages = query.order_by(Message.created_at.desc()).limit(100).all()
    return messages

@router.post("", response_model=MessageResponse)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    # Determine sender information
    if current_user:
        sender_id = current_user.id
        sender_role = current_user.role
        sender_name = current_user.full_name
    else:
        # Fallback sender identity (role-based) when no authenticated token is present
        if payload.recipient_role == "BANK_OFFICER":
            sender_id = "user-aicte-01"
            sender_role = "AICTE_OFFICER"
            sender_name = "AICTE Regulation Bureau Officer"
        else:
            sender_id = "user-bank-01"
            sender_role = "BANK_OFFICER"
            sender_name = "Bank Nodal Officer"

    recipient_name = payload.recipient_name or ("Issuing Bank Nodal Officer" if payload.recipient_role == "BANK_OFFICER" else "AICTE Regulation Bureau Officer")

    msg = Message(
        sender_id=sender_id,
        sender_role=sender_role,
        sender_name=sender_name,
        recipient_role=payload.recipient_role,
        recipient_name=recipient_name,
        fdr_id=payload.fdr_id,
        fdr_number=payload.fdr_number,
        subject=payload.subject,
        content=payload.content,
        message_type=payload.message_type,
        attachment_data=payload.attachment_data,
        is_read=False
    )
    db.add(msg)
    db.flush()

    # Determine severity for the auto-generated notification alert
    severity = "CRITICAL" if payload.message_type in ["DISCREPANCY_FLAG", "LIEN_DISCHARGE_ORDER"] else "INFO"
    if payload.message_type == "BANK_CONFIRMATION":
        severity = "SUCCESS"

    # Automatically generate live Notification Alert for the recipient
    alert_title = f"New {payload.message_type.replace('_', ' ')} from {sender_name}"
    alert_text = f"Subject: {payload.subject}. {payload.content[:150]}..."
    
    alert = NotificationAlert(
        fdr_id=payload.fdr_id,
        recipient=payload.recipient_role,
        alert_type="TWO_WAY_OFFICIAL_COMMUNICATION",
        title=alert_title,
        message=alert_text,
        severity=severity,
        channel="PORTAL_SECURE_DISPATCH"
    )
    db.add(alert)

    # Hash-chain this official communication in the immutable audit log
    add_audit_block(
        db=db,
        action="OFFICIAL_COMMUNICATION_DISPATCHED",
        actor_role=sender_role,
        actor_name=sender_name,
        entity_type="MESSAGE",
        entity_id=msg.id,
        details={
            "recipient_role": payload.recipient_role,
            "recipient_name": recipient_name,
            "subject": payload.subject,
            "message_type": payload.message_type,
            "fdr_number": payload.fdr_number
        }
    )

    db.commit()
    db.refresh(msg)
    return msg

@router.post("/{message_id}/mark-read")
def mark_message_read(message_id: str, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    db.commit()
    return {"status": "SUCCESS", "message_id": message_id}

@router.get("/unread-count")
def get_unread_count(role: str = Query(..., description="AICTE_OFFICER or BANK_OFFICER"), db: Session = Depends(get_db)):
    count = db.query(Message).filter(Message.recipient_role == role, Message.is_read == False).count()
    return {"role": role, "unread_count": count}
