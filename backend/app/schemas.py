from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

# Authentication
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str  # AICTE_OFFICER or BANK_OFFICER
    full_name: str
    designation: Optional[str] = None
    email: str
    phone: Optional[str] = None
    bank_name: Optional[str] = None
    department: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Institution
class InstitutionCreate(BaseModel):
    aicte_id: str
    name: str
    institute_type: str
    state: str
    city: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None

class InstitutionResponse(BaseModel):
    id: str
    aicte_id: str
    name: str
    institute_type: str
    state: str
    city: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None
    created_at: Any

# Field Provenance
class ProvenanceResponse(BaseModel):
    id: str
    field_key: str
    declared_val: str
    bank_val: Optional[str] = None
    officer_val: Optional[str] = None
    trust_tag: str
    is_match: bool
    notes: Optional[str] = None

# Bank Verification
class BankVerificationSubmit(BaseModel):
    token: str
    nodal_officer_name: str
    nodal_officer_emp_id: str
    nodal_officer_email: str
    bank_name: str
    branch_ifsc: str
    confirmed_amount: float
    confirmed_maturity_date: str
    confirmed_joint_holder: str
    confirmed_lien_to_aicte: bool
    confirmed_auto_renewal: bool
    confirmed_fdr_status: str
    remarks: Optional[str] = None

class BankVerificationResponse(BaseModel):
    id: str
    bank_name: str
    branch_ifsc: str
    nodal_officer_name: str
    confirmed_amount: float
    confirmed_maturity_date: str
    confirmed_lien_to_aicte: bool
    confirmed_auto_renewal: bool
    confirmed_fdr_status: str
    dsc_signer_dn: str
    dsc_cert_issuer: str
    dsc_cert_serial: str
    dsc_timestamp: Any
    dsc_signature_hex: str
    dsc_verified: bool
    discrepancies: Optional[str] = None
    verified_at: Any

# FDR
class FDRCreate(BaseModel):
    institution_id: str
    fdr_number: str
    purpose: str
    issuing_bank: str
    branch_name: str
    ifsc_code: str
    declared_amount: float
    issue_date: str
    declared_maturity_date: str
    tenure_months: int
    interest_rate: float = 7.1
    declared_joint_holder: str = "Jointly with Member Secretary, AICTE, New Delhi"
    declared_lien: bool = True
    auto_renewal_clause: bool = False
    document_filename: Optional[str] = None
    document_path: Optional[str] = None
    ocr_extract: Optional[str] = None

class FDRRenewCreate(BaseModel):
    previous_fdr_id: str
    new_fdr_number: str
    issuing_bank: str
    branch_name: str
    ifsc_code: str
    declared_amount: float
    issue_date: str
    declared_maturity_date: str
    tenure_months: int
    interest_rate: float = 7.1
    declared_joint_holder: str = "Jointly with Member Secretary, AICTE, New Delhi"
    auto_renewal_clause: bool = False
    document_filename: Optional[str] = None
    document_path: Optional[str] = None
    ocr_extract: Optional[str] = None

class FDRResponse(BaseModel):
    id: str
    fdr_number: str
    institution_id: str
    institution_name: Optional[str] = None
    aicte_id: Optional[str] = None
    purpose: str
    issuing_bank: str
    branch_name: str
    ifsc_code: str
    declared_amount: float
    bank_confirmed_amount: Optional[float] = None
    currency: str
    issue_date: str
    declared_maturity_date: str
    bank_confirmed_maturity_date: Optional[str] = None
    tenure_months: int
    interest_rate: float
    declared_joint_holder: str
    bank_confirmed_joint_holder: Optional[str] = None
    declared_lien: bool
    bank_confirmed_lien: Optional[bool] = None
    auto_renewal_clause: bool
    status: str
    status_remarks: Optional[str] = None
    document_path: Optional[str] = None
    document_filename: Optional[str] = None
    ocr_extract: Optional[str] = None
    previous_fdr_id: Optional[str] = None
    replacement_fdr_id: Optional[str] = None
    verification_token: str
    verification_expires_at: Any
    created_at: Any
    updated_at: Any
    provenances: List[ProvenanceResponse] = []
    verifications: List[BankVerificationResponse] = []

# Scrutiny & Maker-Checker
class MakerScrutinySubmit(BaseModel):
    fdr_id: str
    decision: str  # ACTIVE, FLAGGED_MISMATCH, REJECTED
    remarks: str

class LienReleaseSubmit(BaseModel):
    fdr_id: str
    reason: str
    compliance_undertaking_url: Optional[str] = None

class MakerReleaseDecision(BaseModel):
    release_id: str
    decision: str  # RECOMMEND, REJECT
    remarks: str

class CheckerReleaseDecision(BaseModel):
    release_id: str
    decision: str  # APPROVE, REJECT
    remarks: str

class LienReleaseResponse(BaseModel):
    id: str
    fdr_id: str
    fdr_number: Optional[str] = None
    institution_id: str
    institution_name: Optional[str] = None
    amount: Optional[float] = None
    issuing_bank: Optional[str] = None
    reason: str
    status: str
    maker_name: Optional[str] = None
    maker_remarks: Optional[str] = None
    maker_date: Optional[Any] = None
    checker_name: Optional[str] = None
    checker_remarks: Optional[str] = None
    checker_date: Optional[Any] = None
    discharge_order_ref: Optional[str] = None
    created_at: Any

# Audit
class AuditBlockResponse(BaseModel):
    block_index: int
    timestamp: Any
    action: str
    actor_role: str
    actor_name: str
    entity_type: str
    entity_id: str
    details: str
    payload_hash: str
    previous_hash: str
    block_hash: str

# Alerts
class NotificationResponse(BaseModel):
    id: str
    fdr_id: Optional[str] = None
    institution_id: Optional[str] = None
    alert_type: str
    recipient: str
    title: str
    message: str
    severity: str
    is_read: bool
    channel: str
    created_at: Any

# Messages between AICTE Officer & Bank Officer
class MessageCreate(BaseModel):
    recipient_role: str  # AICTE_OFFICER or BANK_OFFICER
    recipient_name: Optional[str] = None
    fdr_id: Optional[str] = None
    fdr_number: Optional[str] = None
    subject: str
    content: str
    message_type: str = "OFFICIAL_NOTICE"
    attachment_data: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_role: str
    sender_name: str
    recipient_role: str
    recipient_name: str
    fdr_id: Optional[str] = None
    fdr_number: Optional[str] = None
    subject: str
    content: str
    message_type: str
    attachment_data: Optional[str] = None
    is_read: bool
    created_at: Any

# Dashboard statistics
class DashboardStatsResponse(BaseModel):
    total_fdrs: int
    total_amount_crores: float
    active_count: int
    pending_bank_count: int
    expiring_soon_count: int
    matured_count: int
    renewal_in_progress_count: int
    release_requested_count: int
    discrepancy_count: int
    bank_verified_rate: float
