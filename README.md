# DepositGuard: Centralized Security Deposit & FDR Management Portal with Bank Verification

**Smart India Hackathon 2026**  
**Problem Statement ID:** SIH26265  
**Problem Statement Title:** Streamline of security deposit/ FDR portal  
**Theme:** Smart Automation | **PS Category:** Software  
**Team Name:** CODECREWW$ | **Team ID:** 199121  
**Target Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India  

---

## 🏛️ Executive Summary & Background

Under applicable AICTE regulations and the **Approval Process Handbook (2024–27)**, technical institutions across India (Degree Engineering, Management, Pharmacy, Architecture, Polytechnic) are required to maintain Fixed Deposit Receipts (FDRs) or security deposits as financial guarantees pledged jointly to the **"Member Secretary, AICTE, New Delhi"**.

Historically, these instruments were tracked through fragmented physical files, couriered paper receipts, manual correspondence, and ad-hoc spreadsheets. This caused:
1. **Unverified Instruments:** Institutions could submit forged receipts or receipts without joint lien marking.
2. **Lapsed Securities:** FDR maturities were missed, allowing crores in regulatory security deposits to expire without replacement.
3. **Slow Lien Releases:** Colleges completing prescribed 8–10 year tenures faced administrative delays in receiving official lien release orders.

**DepositGuard** delivers an enterprise-grade digital solution unifying institutions, issuing banks, the AICTE Regulation Bureau, and CAG auditors on a single verifiable platform.

---

## 🌟 Core Innovations & Architectural Highlights

### 1. Declared vs. Bank-Confirmed (Trust Tag on Every Field)
- Every single financial attribute (Principal Amount, Maturity Date, Account Title, Lien Status) is explicitly tagged with its cryptographic source:
  - `DECLARED` (Institution submission)
  - `BANK_CONFIRMED` (Direct Bank Core Banking System attestation)
  - `OFFICER_VERIFIED` (AICTE Regulation Bureau Scrutiny)
  - `MISMATCH` (Discrepancy detected)
- **Only Bank-Confirmed data is legally recognized as active security.**

### 2. One-Time Bank Verification Request & DSC Signing
- When an institution submits an FDR, DepositGuard generates a cryptographically secured **1-time verification token and QR code** (15-day validity).
- Issuing Bank Nodal Officers access the secure verification desk, verify against the bank ledger, confirm whether a lien is marked in favor of AICTE, and digitally sign the record using **Class-3 Digital Signature Certificate (DSC)** adhering to the Indian **IT Act 2000 (Section 4 & 5)** and **CCA India Root CA** guidelines (RFC 5652 PKCS#7).

### 3. No-Gap Renewal Rule & Lineage Tree
- Strict regulatory rule enforcement: **An expiring FDR cannot close or be released until its replacement FDR is submitted and confirmed by the issuing bank.**
- DepositGuard tracks full genealogical lineage:
  `[FDR-V1: Maturing / Replaced] ──> [FDR-V2: Replacement Active & Bank Confirmed]`
- Zero days of broken regulatory deposit coverage.

### 4. Two-Officer Maker-Checker Lien Release Workflow
- Lien release applications undergo a two-tier governance protocol:
  - **Stage 1 (Maker Scrutiny):** Scrutiny Officer verifies tenure completion (8/10 years), inspection compliance, and non-deficiency affidavits.
  - **Stage 2 (Checker Sanction):** Competent Authority (Adviser / Member Secretary, AICTE) issues official digitally signed Lien Discharge Orders (`AICTE/REG/FDR-REL/...`) authorizing bank CBS lien removal.

### 5. Tamper-Proof Cryptographic Hash Chain (SHA-256)
- Built on the academic principles of *Haber & Stornetta (1991)* and *Schneier & Kelsey (1999)*.
- Every transaction (Submission, Bank DSC Sign, Discrepancy Flag, Scrutiny, Release) is sealed into a Merkle-linked sequential block where:
  $$\text{Block Hash} = \text{SHA-256}(\text{Index} \parallel \text{Timestamp} \parallel \text{Action} \parallel \text{Actor} \parallel \text{Payload Hash} \parallel \text{Previous Hash})$$
- Built-in **Chain Integrity Verifier** recalculates hashes across the ledger and alerts CAG auditors if a single byte in the SQL database was modified.

### 6. Smart Maturity Watchdog & Daily Scheduler
- Daily automated evaluations for upcoming horizons:
  - **60-Day Reminder:** Advance renewal preparation.
  - **30-Day Notice:** Renewal documentation dispatch.
  - **15-Day Urgent Alert:** Immediate replacement required.
  - **Matured / Overdue:** Regulatory non-conformity trigger.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend** | Python 3.13, FastAPI (Asynchronous REST API), Uvicorn |
| **Database** | SQLite with WAL mode & Foreign Keys enabled (SQLAlchemy 2.0 ORM) |
| **Security & Crypto** | SHA-256 Merkle Chain, HMAC-SHA256, PyJWT, Class-3 DSC Simulation |
| **Document Processing**| AI OCR Extraction Simulator, PyQRCode, Official HTML/PDF Letter Generator |

---

## 👥 Demo Personas & Pre-Seeded Accounts

DepositGuard includes a **1-click Persona Switcher** in the top navigation bar to test all stakeholder perspectives:

| Role | Username | Password | Persona & Responsibility |
|---|---|---|---|
| **AICTE Maker** | `maker_aicte` | `password123` | Rajesh Sharma, Asst. Director (Scrutiny of FDRs & Release applications) |
| **AICTE Checker** | `checker_aicte` | `password123` | Dr. Mamta Agarwal, Member Secretary (Final Sanction & Order Issuance) |
| **Institution** | `college_vjti` | `password123` | Dr. Sachin Deshmukh, Registrar, VJTI Mumbai (Submit FDRs & Renewals) |
| **Bank Officer** | `bank_nodal_sbi`| `password123` | S. Ramesh, Chief Manager, State Bank of India (Ledger Verification & DSC) |
| **Auditor / CAG**| `cag_auditor` | `password123` | Vikramaditya Sen, Senior Audit Officer, CAG India (Audit Chain Verification) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js v18+ and npm

### 1. Launch Everything via 1-Click Script
Double-click `start.bat` or run:
```powershell
.\start.ps1
```

### 2. Manual Start
**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*API Documentation will be live at: http://127.0.0.1:8000/docs*

**Frontend:**
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Access the portal at: http://127.0.0.1:5173/*

---

## 🧪 Evaluation Test Scenarios (10 AICTE Problem Requirements)

1. **Centralized Repository:** Navigate to *Centralized FDR Repository*. Search by college, FDR number, or bank. Filter by status.
2. **Digital Document Ingestion & OCR:** Click *Submit New FDR* &rarr; Click *Auto-Fill from FDR Scan (OCR)* to see AI extraction populate the fields.
3. **Discrepancy Detection:** Open FDR `#BOB-CBE-2025-772910` to observe flagged red mismatches (Declared ₹25L vs Bank Confirmed ₹20L, Lien not marked).
4. **Bank DSC Attestation:** Navigate to *Bank Verification Desk*, review declared data, adjust values, and click *DSC Sign & Confirm FDR*.
5. **No-Gap Renewal:** Go to *No-Gap Renewal*, pick an expiring FDR (e.g. `#PNB-ND-2021-984120` maturing in 12 days), and submit replacement FDR.
6. **Maker-Checker Lien Release:** Go to *Lien Release Desk*. As Maker, click *Recommend for Release*. As Checker, click *Execute Sanction & Generate Official Order*.
7. **Official AICTE Letter:** Click *View Official Letter* on approved release to view the printable Government of India Lien Discharge Letter.
8. **Maturity Watch Scheduler:** Click *Run Daily Maturity Watch* on the Dashboard to execute the 60/30/15 day watchdog.
9. **Tamper-Proof Audit Chain:** Navigate to *Tamper-Proof Audit Chain*. Click *Re-verify Entire Chain* (Green 100% verified). Click *Tamper Block #2* to simulate unauthorized database alteration, then click *Re-verify* to see immediate red tamper detection! Click *Restore* to bring it back to green.
10. **Reports & Analytics:** Click *Export CSV* on the Dashboard to export the official registry.

---

## 📜 Compliance & Legal References
- **AICTE Approval Process Handbook (2024–27):** Section 4.12 & Chapter I norms for Security Deposits.
- **Information Technology Act 2000 (India):** Section 4 (Legal recognition of electronic records) & Section 5 (Digital Signatures).
- **Digital Personal Data Protection (DPDP) Act 2023:** Secure hashing and role-based data partitioning.
- **CCA India:** Root CA hierarchy for Class-3 DSC attestation.
