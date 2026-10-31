import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # INSTITUTION, AICTE_MAKER, AICTE_CHECKER, BANK_OFFICER, AUDITOR
    full_name = Column(String, nullable=False)
    designation = Column(String, nullable=True)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=True)
    bank_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    institution = relationship("Institution", back_populates="users")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, default=generate_uuid)
    aicte_id = Column(String, unique=True, index=True, nullable=False)  # e.g. "1-459182310"
    name = Column(String, nullable=False)
    institute_type = Column(String, nullable=False)  # Engineering & Technology, Management, Pharmacy, Polytechnic, Architecture
    state = Column(String, nullable=False)
    city = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    users = relationship("User", back_populates="institution")
    fdrs = relationship("FDR", back_populates="institution", cascade="all, delete-orphan")
    releases = relationship("LienRelease", back_populates="institution")


class FDR(Base):
    __tablename__ = "fdrs"

    id = Column(String, primary_key=True, default=generate_uuid)
    fdr_number = Column(String, unique=True, index=True, nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    purpose = Column(String, nullable=False)  # Approval Process Handbook Norm
    
    issuing_bank = Column(String, nullable=False)
    branch_name = Column(String, nullable=False)
    ifsc_code = Column(String, nullable=False)
    
    declared_amount = Column(Float, nullable=False)
    bank_confirmed_amount = Column(Float, nullable=True)
    currency = Column(String, default="INR")
    
    issue_date = Column(String, nullable=False)  # YYYY-MM-DD
    declared_maturity_date = Column(String, nullable=False)  # YYYY-MM-DD
    bank_confirmed_maturity_date = Column(String, nullable=True)
    tenure_months = Column(Integer, nullable=False)
    interest_rate = Column(Float, default=7.1)
    
    declared_joint_holder = Column(String, default="Jointly with Member Secretary, AICTE, New Delhi")
    bank_confirmed_joint_holder = Column(String, nullable=True)
    
    declared_lien = Column(Boolean, default=True)
    bank_confirmed_lien = Column(Boolean, nullable=True)
    auto_renewal_clause = Column(Boolean, default=False)
    
    status = Column(String, default="PENDING_VERIFICATION", index=True)
    # PENDING_VERIFICATION, BANK_CONFIRMED, ACTIVE, EXPIRING_SOON, MATURED,
    # RENEWAL_IN_PROGRESS, RENEWED, RELEASE_REQUESTED, RELEASE_MAKER_RECOMMENDED,
    # RELEASE_CHECKER_APPROVED, RELEASED, FLAGGED_MISMATCH
    
    status_remarks = Column(Text, nullable=True)
    document_path = Column(String, nullable=True)
    document_filename = Column(String, nullable=True)
    
    # No-Gap Renewal Lineage
    previous_fdr_id = Column(String, ForeignKey("fdrs.id"), nullable=True)
    replacement_fdr_id = Column(String, nullable=True)
    
    # 1-time Bank Request Token & Expiry (15-day QR / URL)
    verification_token = Column(String, unique=True, index=True, nullable=False)
    verification_expires_at = Column(DateTime, nullable=False)
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    institution = relationship("Institution", back_populates="fdrs")
    verifications = relationship("BankVerification", back_populates="fdr", cascade="all, delete-orphan")
    provenances = relationship("FieldProvenance", back_populates="fdr", cascade="all, delete-orphan")
    releases = relationship("LienRelease", back_populates="fdr")
    alerts = relationship("NotificationAlert", back_populates="fdr")


class BankVerification(Base):
    __tablename__ = "bank_verifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    fdr_id = Column(String, ForeignKey("fdrs.id"), nullable=False)
    token = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)
    branch_ifsc = Column(String, nullable=False)
    nodal_officer_name = Column(String, nullable=False)
    nodal_officer_emp_id = Column(String, nullable=False)
    nodal_officer_email = Column(String, nullable=False)
    
    confirmed_amount = Column(Float, nullable=False)
    confirmed_maturity_date = Column(String, nullable=False)
    confirmed_lien_to_aicte = Column(Boolean, nullable=False)
    confirmed_auto_renewal = Column(Boolean, default=False)
    confirmed_fdr_status = Column(String, default="ACTIVE_EARMARKED")
    
    # Digital Signature Certificate (DSC) / PKCS#7 Simulation Fields
    dsc_signer_dn = Column(String, nullable=False)
    dsc_cert_issuer = Column(String, nullable=False)
    dsc_cert_serial = Column(String, nullable=False)
    dsc_timestamp = Column(DateTime, default=utc_now)
    dsc_signature_hex = Column(String, nullable=False)
    dsc_verified = Column(Boolean, default=True)
    
    discrepancies = Column(Text, nullable=True)  # JSON formatted strings of mismatch notes
    verified_at = Column(DateTime, default=utc_now)

    fdr = relationship("FDR", back_populates="verifications")


class FieldProvenance(Base):
    __tablename__ = "field_provenance"

    id = Column(String, primary_key=True, default=generate_uuid)
    fdr_id = Column(String, ForeignKey("fdrs.id"), nullable=False)
    field_key = Column(String, nullable=False)  # amount, maturity_date, joint_holder, lien_status
    declared_val = Column(String, nullable=False)
    bank_val = Column(String, nullable=True)
    officer_val = Column(String, nullable=True)
    trust_tag = Column(String, default="DECLARED")  # DECLARED, BANK_CONFIRMED, OFFICER_VERIFIED, MISMATCH
    is_match = Column(Boolean, default=True)
    notes = Column(String, nullable=True)

    fdr = relationship("FDR", back_populates="provenances")


class LienRelease(Base):
    __tablename__ = "lien_releases"

    id = Column(String, primary_key=True, default=generate_uuid)
    fdr_id = Column(String, ForeignKey("fdrs.id"), nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    reason = Column(Text, nullable=False)
    compliance_undertaking_url = Column(String, nullable=True)
    
    # Two-officer Maker-Checker Workflow
    status = Column(String, default="PENDING_MAKER")  # PENDING_MAKER, MAKER_RECOMMENDED, CHECKER_APPROVED, REJECTED, DISCHARGED
    
    # Maker stage
    maker_id = Column(String, nullable=True)
    maker_name = Column(String, nullable=True)
    maker_remarks = Column(Text, nullable=True)
    maker_date = Column(DateTime, nullable=True)
    
    # Checker stage (Competent Authority / Member Secretary / Director)
    checker_id = Column(String, nullable=True)
    checker_name = Column(String, nullable=True)
    checker_remarks = Column(Text, nullable=True)
    checker_date = Column(DateTime, nullable=True)
    
    # Official Release Discharge Order
    discharge_order_ref = Column(String, nullable=True)  # e.g. "AICTE/REG/FDR-REL/2026/089"
    discharge_letter_path = Column(String, nullable=True)
    bank_discharge_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    fdr = relationship("FDR", back_populates="releases")
    institution = relationship("Institution", back_populates="releases")


class AuditBlock(Base):
    __tablename__ = "audit_blocks"

    block_index = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=utc_now)
    action = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    actor_name = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    payload_hash = Column(String, nullable=False)
    previous_hash = Column(String, nullable=False)
    block_hash = Column(String, nullable=False)


class NotificationAlert(Base):
    __tablename__ = "notification_alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    fdr_id = Column(String, ForeignKey("fdrs.id"), nullable=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=True)
    alert_type = Column(String, nullable=False)  # MATURITY_60_DAYS, MATURITY_30_DAYS, MATURITY_15_DAYS, OVERDUE_RENEWAL, BANK_MISMATCH, RELEASE_APPROVED
    recipient = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, default="INFO")  # INFO, WARNING, CRITICAL, SUCCESS
    is_read = Column(Boolean, default=False)
    channel = Column(String, default="PORTAL_EMAIL_SMS")
    created_at = Column(DateTime, default=utc_now)

    fdr = relationship("FDR", back_populates="alerts")
