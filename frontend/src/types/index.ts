export type UserRole = 'AICTE_OFFICER' | 'BANK_OFFICER';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
  designation?: string;
  email: string;
  phone?: string;
  bank_name?: string;
  department?: string;
}

export interface Institution {
  id: string;
  aicte_id: string;
  name: string;
  institute_type: string;
  state: string;
  city: string;
  address?: string;
  contact_person?: string;
  email: string;
  phone?: string;
}

export type TrustTag = 'DECLARED' | 'BANK_CONFIRMED' | 'OFFICER_VERIFIED' | 'MISMATCH';

export interface FieldProvenance {
  id: string;
  field_key: string;
  declared_val: string;
  bank_val?: string;
  officer_val?: string;
  trust_tag: TrustTag;
  is_match: boolean;
  notes?: string;
}

export interface BankVerification {
  id: string;
  bank_name: string;
  branch_ifsc: string;
  nodal_officer_name: string;
  confirmed_amount: number;
  confirmed_maturity_date: string;
  confirmed_lien_to_aicte: boolean;
  confirmed_auto_renewal: boolean;
  confirmed_fdr_status: string;
  dsc_signer_dn: string;
  dsc_cert_issuer: string;
  dsc_cert_serial: string;
  dsc_timestamp: string;
  dsc_signature_hex: string;
  dsc_verified: boolean;
  discrepancies?: string;
  verified_at: string;
}

export type FDRStatus =
  | 'PENDING_VERIFICATION'
  | 'BANK_CONFIRMED'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'MATURED'
  | 'RENEWAL_IN_PROGRESS'
  | 'RENEWED'
  | 'RELEASE_REQUESTED'
  | 'RELEASE_MAKER_RECOMMENDED'
  | 'RELEASE_CHECKER_APPROVED'
  | 'RELEASED'
  | 'FLAGGED_MISMATCH';

export interface FDR {
  id: string;
  fdr_number: string;
  institution_id: string;
  institution_name?: string;
  aicte_id?: string;
  purpose: string;
  issuing_bank: string;
  branch_name: string;
  ifsc_code: string;
  declared_amount: number;
  bank_confirmed_amount?: number;
  currency: string;
  issue_date: string;
  declared_maturity_date: string;
  bank_confirmed_maturity_date?: string;
  tenure_months: number;
  interest_rate: number;
  declared_joint_holder: string;
  bank_confirmed_joint_holder?: string;
  declared_lien: boolean;
  bank_confirmed_lien?: boolean;
  auto_renewal_clause: boolean;
  status: FDRStatus;
  status_remarks?: string;
  document_path?: string;
  document_filename?: string;
  previous_fdr_id?: string;
  replacement_fdr_id?: string;
  verification_token: string;
  verification_expires_at: string;
  created_at: string;
  updated_at: string;
  provenances: FieldProvenance[];
  verifications: BankVerification[];
}

export interface LienRelease {
  id: string;
  fdr_id: string;
  fdr_number?: string;
  institution_id: string;
  institution_name?: string;
  amount?: number;
  issuing_bank?: string;
  reason: string;
  status: 'PENDING_MAKER' | 'MAKER_RECOMMENDED' | 'CHECKER_APPROVED' | 'REJECTED' | 'DISCHARGED';
  maker_name?: string;
  maker_remarks?: string;
  maker_date?: string;
  checker_name?: string;
  checker_remarks?: string;
  checker_date?: string;
  discharge_order_ref?: string;
  created_at: string;
}

export interface AuditBlock {
  block_index: number;
  timestamp: string;
  action: string;
  actor_role: string;
  actor_name: string;
  entity_type: string;
  entity_id: string;
  details: string;
  payload_hash: string;
  previous_hash: string;
  block_hash: string;
}

export interface NotificationAlert {
  id: string;
  fdr_id?: string;
  institution_id?: string;
  alert_type: string;
  recipient: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  is_read: boolean;
  channel: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_role: UserRole;
  sender_name: string;
  recipient_role: UserRole;
  recipient_name: string;
  fdr_id?: string;
  fdr_number?: string;
  subject: string;
  content: string;
  message_type: 'OFFICIAL_NOTICE' | 'DISCREPANCY_FLAG' | 'VERIFICATION_REQUEST' | 'LIEN_DISCHARGE_ORDER' | 'GENERAL_INQUIRY' | 'BANK_CONFIRMATION';
  attachment_data?: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_fdrs: number;
  total_amount_crores: number;
  active_count: number;
  pending_bank_count: number;
  expiring_soon_count: number;
  matured_count: number;
  renewal_in_progress_count: number;
  release_requested_count: number;
  discrepancy_count: number;
  bank_verified_rate: number;
}
