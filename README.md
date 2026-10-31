# DepositGuard: Centralized Security Deposit & FDR Management Portal with Bank Verification

**Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India  
**Target Roles:** AICTE Regulation Bureau Authority &amp; Issuing Bank Nodal Officers  

---

## 🏛️ Overview & Regulatory Scope

Under applicable AICTE regulations and the **Approval Process Handbook (2024–27)**, technical institutions across India (Degree Engineering, Management, Pharmacy, Architecture, Polytechnic) maintain Fixed Deposit Receipts (FDRs) or security deposits as financial guarantees pledged jointly to the **"Member Secretary, AICTE, New Delhi"**.

**DepositGuard** delivers a streamlined digital architecture specifically partitioning operations between **two distinct authorized personas**:
1. **AICTE Officer (Regulation Bureau Authority)**: Manages central repository scrutiny, No-Gap Renewal compliance, two-tier Maker-Checker lien releases, official discharge orders, and regulatory notice dispatch.
2. **Bank Officer (Issuing Bank Nodal Cell)**: Manages Core Banking System (CBS) ledger attestation, Class-3 Digital Signature Certificate (DSC) signing, CBS lien marking, and execution of approved lien discharges.

The system features real-time **two-way official communication and automated notifications** between AICTE Officers and Bank Officers for notices, discrepancy rectifications, and lien release advisories.

---

## 🌟 Distinct Roles & Sidebar Capabilities

### 1. AICTE Officer Scope (`aicte_officer`)
- **Overview & Analytics:** Macro view of all institutional deposits (in ₹ Crores), bank attestation compliance rate, expiring instruments, and discrepancy flags.
- **Centralized FDR Registry:** Scrutiny desk with field-level provenance comparison (Declared vs. Bank-Confirmed).
- **No-Gap Renewal Watch:** Enforces unbroken deposit protection before allowing maturing instruments to close.
- **Lien Release Sanction Desk:** Two-tier scrutiny and Competent Authority authorization generating official Lien Discharge Orders.
- **Official Bank Notices & Communications:** Direct dispatch of discrepancy notices, verification requests, and advisories to Bank Officers.
- **Tamper-Proof Audit Ledger:** SHA-256 Merkle chain verification for complete CAG compliance.

### 2. Bank Officer Scope (`bank_officer`)
- **Bank Attestation Desk:** Review 15-day digital requests dispatched by technical institutions, check CBS records, and sign with Class-3 DSC.
- **Bank Branch FDR Registry:** Specific view of deposits pledged under active lien within the bank's CBS branches.
- **CBS Lien Discharge Desk:** Execute CBS lien clearances upon receiving official AICTE discharge orders.
- **AICTE Direct Notices & Communications:** Review incoming official directives, discrepancy alerts, and reply directly with bank confirmations.
- **DSC Attestation Logs:** Cryptographic verification logs of all digitally signed records under CCA India Root CA.

---

## 🔑 Login Credentials

| Role | Username | Password | Full Name & Designation |
|---|---|---|---|
| **AICTE Officer** | `aicte_officer` | `password123` | Dr. Rajesh Sharma, Director (AICTE Regulation Bureau) |
| **Bank Officer** | `bank_officer` | `password123` | S. Ramesh, Chief Manager & Nodal Officer (State Bank of India) |

*The landing page features 1-click login buttons for both roles.*

---

## 🚀 Quick Start Guide

### 1-Click Launch
Double-click `start.bat` or run:
```powershell
.\start.ps1
```

### Manual Launch
**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*API Documentation: http://127.0.0.1:8000/docs*

**Frontend:**
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Portal: http://127.0.0.1:5173/*

---

## 📜 Compliance & Legal References
- **AICTE Approval Process Handbook (2024–27):** Norms for Security Deposits & Lock-in Periods.
- **Information Technology Act 2000 (India):** Section 4 (Electronic Records) & Section 5 (Digital Signatures).
- **Digital Personal Data Protection (DPDP) Act 2023:** Role-based data partitioning and cryptographic audit trails.
