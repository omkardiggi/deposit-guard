import json
from datetime import datetime, timedelta, timezone, date
from .database import SessionLocal, engine, Base
from .models import User, Institution, FDR, BankVerification, FieldProvenance, LienRelease, NotificationAlert, AuditBlock
from .security import hash_password, generate_dsc_attestation
from .audit_chain import add_audit_block

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).first():
        db.close()
        return

    print("Seeding DepositGuard database with realistic AICTE data...")

    # 1. Create Demo Users (Password for all: 'password123')
    pwd = hash_password("password123")
    
    # AICTE Maker
    user_maker = User(
        username="maker_aicte",
        password_hash=pwd,
        role="AICTE_MAKER",
        full_name="Rajesh Sharma",
        designation="Assistant Director (Regulation Bureau)",
        email="rajesh.sharma@aicte-india.org",
        phone="+91 98112 34567"
    )
    # AICTE Checker (Competent Authority)
    user_checker = User(
        username="checker_aicte",
        password_hash=pwd,
        role="AICTE_CHECKER",
        full_name="Dr. Mamta R. Agarwal",
        designation="Adviser-I / Member Secretary (Regulation)",
        email="mamta.agarwal@aicte-india.org",
        phone="+91 98223 45678"
    )
    # Bank Nodal Officer
    user_bank = User(
        username="bank_nodal_sbi",
        password_hash=pwd,
        role="BANK_OFFICER",
        full_name="S. Ramesh",
        designation="Chief Manager & Nodal Officer (Govt Accounts)",
        bank_name="State Bank of India",
        email="s.ramesh@sbi.co.in",
        phone="+91 98334 56789"
    )
    # CAG / Internal Auditor
    user_auditor = User(
        username="cag_auditor",
        password_hash=pwd,
        role="AUDITOR",
        full_name="Vikramaditya Sen",
        designation="Senior Audit Officer (Comptroller & Auditor General of India)",
        email="v.sen@cag.gov.in",
        phone="+91 98445 67890"
    )
    
    db.add_all([user_maker, user_checker, user_bank, user_auditor])
    db.flush()

    # 2. Create Institutions
    inst1 = Institution(
        aicte_id="1-102938471",
        name="Veermata Jijabai Technological Institute (VJTI)",
        institute_type="Engineering & Technology",
        state="Maharashtra",
        city="Mumbai",
        address="H. R. Mahajani Road, Matunga, Mumbai 400019",
        contact_person="Dr. Sachin Deshmukh (Registrar)",
        email="registrar@vjti.ac.in",
        phone="+91 22 24198101"
    )
    inst2 = Institution(
        aicte_id="1-294810293",
        name="Delhi Institute of Engineering & Technology",
        institute_type="Engineering & Technology",
        state="Delhi",
        city="New Delhi",
        address="Sector 12, Dwarka, New Delhi 110078",
        contact_person="Prof. K. K. Aggarwal",
        email="principal@dietdelhi.edu.in",
        phone="+91 11 25099001"
    )
    inst3 = Institution(
        aicte_id="1-394819284",
        name="R.V. College of Engineering",
        institute_type="Engineering & Technology",
        state="Karnataka",
        city="Bengaluru",
        address="Mysore Road, RV Vidyaniketan, Bengaluru 560059",
        contact_person="Dr. K. N. Subramanya (Principal)",
        email="principal@rvce.edu.in",
        phone="+91 80 68188100"
    )
    inst4 = Institution(
        aicte_id="1-482019384",
        name="PSG College of Technology",
        institute_type="Polytechnic / Degree Engg",
        state="Tamil Nadu",
        city="Coimbatore",
        address="Post Box No. 1611, Peelamedu, Coimbatore 641004",
        contact_person="Dr. K. Prakasan",
        email="principal@psgtech.edu",
        phone="+91 422 2572177"
    )
    inst5 = Institution(
        aicte_id="1-582910481",
        name="Institute of Management Studies",
        institute_type="Management",
        state="Uttar Pradesh",
        city="Noida",
        address="A-8B, IMS Campus, Sector 62, Noida 201301",
        contact_person="Dr. Manju Gupta",
        email="director@imsnoida.com",
        phone="+91 120 4798800"
    )
    db.add_all([inst1, inst2, inst3, inst4, inst5])
    db.flush()

    # Create College User linked to inst1
    user_college = User(
        username="college_vjti",
        password_hash=pwd,
        role="INSTITUTION",
        full_name="Dr. Sachin Deshmukh",
        designation="Registrar, VJTI Mumbai",
        institution_id=inst1.id,
        email="registrar@vjti.ac.in",
        phone="+91 22 24198101"
    )
    db.add(user_college)
    db.flush()

    # Helper dates
    today = date.today()
    in_12_days = (today + timedelta(days=12)).isoformat()
    in_26_days = (today + timedelta(days=26)).isoformat()
    in_50_days = (today + timedelta(days=50)).isoformat()
    past_10_days = (today - timedelta(days=10)).isoformat()
    future_3_years = (today + timedelta(days=365 * 3)).isoformat()
    future_5_years = (today + timedelta(days=365 * 5)).isoformat()
    future_8_years = (today + timedelta(days=365 * 8)).isoformat()

    # 3. Create Sample FDRs

    # FDR 1: ACTIVE (Fully verified & compliant)
    fdr1 = FDR(
        fdr_number="SBI-DEL-2023-049281",
        institution_id=inst1.id,
        purpose="Establishment of New Institution (Degree Engg)",
        issuing_bank="State Bank of India",
        branch_name="Matunga Branch, Mumbai",
        ifsc_code="SBIN0000523",
        declared_amount=3500000.0,
        bank_confirmed_amount=3500000.0,
        currency="INR",
        issue_date="2023-04-10",
        declared_maturity_date=future_5_years,
        bank_confirmed_maturity_date=future_5_years,
        tenure_months=60,
        interest_rate=7.2,
        declared_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        bank_confirmed_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        declared_lien=True,
        bank_confirmed_lien=True,
        auto_renewal_clause=True,
        status="ACTIVE",
        status_remarks="Compliant. Bank DSC verified and approved by Regulation Bureau.",
        document_filename="fdr_receipt_vjti_sbi.pdf",
        verification_token="tok_vjti_sbi_active_908123",
        verification_expires_at=datetime.now(timezone.utc) + timedelta(days=15)
    )

    # FDR 2: EXPIRING_SOON (Matures in 12 days! Triggers Urgent Alert for No-Gap Renewal)
    fdr2 = FDR(
        fdr_number="PNB-ND-2021-984120",
        institution_id=inst2.id,
        purpose="Introduction of New Course (Artificial Intelligence & Data Science)",
        issuing_bank="Punjab National Bank",
        branch_name="Dwarka Sector 11, New Delhi",
        ifsc_code="PUNB0145200",
        declared_amount=5000000.0,
        bank_confirmed_amount=5000000.0,
        currency="INR",
        issue_date="2021-11-15",
        declared_maturity_date=in_12_days,
        bank_confirmed_maturity_date=in_12_days,
        tenure_months=60,
        interest_rate=7.0,
        declared_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        bank_confirmed_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        declared_lien=True,
        bank_confirmed_lien=True,
        auto_renewal_clause=False,
        status="EXPIRING_SOON",
        status_remarks="Urgent: Matures in 12 days. Replacement FDR must be submitted to avoid approval lapse.",
        document_filename="fdr_receipt_diet_pnb.pdf",
        verification_token="tok_pnb_diet_exp_128941",
        verification_expires_at=datetime.now(timezone.utc) + timedelta(days=15)
    )

    # FDR 3: PENDING_VERIFICATION (Newly submitted, token waiting for bank officer review)
    fdr3 = FDR(
        fdr_number="CAN-BLR-2026-391084",
        institution_id=inst3.id,
        purpose="Increase in Intake (Computer Science 120 -> 180 seats)",
        issuing_bank="Canara Bank",
        branch_name="R.V. Road Branch, Bengaluru",
        ifsc_code="CNRB0000842",
        declared_amount=2500000.0,
        bank_confirmed_amount=None,
        currency="INR",
        issue_date="2026-10-20",
        declared_maturity_date=future_8_years,
        bank_confirmed_maturity_date=None,
        tenure_months=96,
        interest_rate=7.25,
        declared_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        declared_lien=True,
        auto_renewal_clause=True,
        status="PENDING_VERIFICATION",
        status_remarks="Awaiting digital attestation from Canara Bank Nodal Officer.",
        document_filename="fdr_receipt_rvce_canara.pdf",
        verification_token="tok_canara_rvce_pending_3389",
        verification_expires_at=datetime.now(timezone.utc) + timedelta(days=14)
    )

    # FDR 4: FLAGGED_MISMATCH (Amount mismatch + Lien NOT marked in bank CBS!)
    fdr4 = FDR(
        fdr_number="BOB-CBE-2025-772910",
        institution_id=inst4.id,
        purpose="Regulatory Compliance & Norms Maintenance",
        issuing_bank="Bank of Baroda",
        branch_name="Peelamedu Branch, Coimbatore",
        ifsc_code="BARB0PEELAM",
        declared_amount=2500000.0,
        bank_confirmed_amount=2000000.0,  # ₹5,00,000 deficit!
        currency="INR",
        issue_date="2025-06-01",
        declared_maturity_date=future_3_years,
        bank_confirmed_maturity_date=future_3_years,
        tenure_months=36,
        interest_rate=6.9,
        declared_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        bank_confirmed_joint_holder="PSG Tech General Trust Only (Missing AICTE)",
        declared_lien=True,
        bank_confirmed_lien=False,  # Lien not recorded!
        auto_renewal_clause=False,
        status="FLAGGED_MISMATCH",
        status_remarks="Discrepancies flagged: Declared ₹25,00,000 vs Confirmed ₹20,00,000; Bank ledger confirms NO lien marked to AICTE.",
        document_filename="fdr_receipt_psg_bob.pdf",
        verification_token="tok_bob_psg_mismatch_4490",
        verification_expires_at=datetime.now(timezone.utc) + timedelta(days=5)
    )

    # FDR 5: RELEASE_REQUESTED (Tenure completed 10 years; college applied for lien release)
    fdr5 = FDR(
        fdr_number="HDFC-NOI-2016-118942",
        institution_id=inst5.id,
        purpose="Establishment of New Management Institute (PGDM)",
        issuing_bank="HDFC Bank",
        branch_name="Sector 62, Noida",
        ifsc_code="HDFC0000492",
        declared_amount=1500000.0,
        bank_confirmed_amount=1500000.0,
        currency="INR",
        issue_date="2016-09-01",
        declared_maturity_date="2026-09-01",
        bank_confirmed_maturity_date="2026-09-01",
        tenure_months=120,
        interest_rate=7.5,
        declared_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        bank_confirmed_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        declared_lien=True,
        bank_confirmed_lien=True,
        auto_renewal_clause=False,
        status="RELEASE_REQUESTED",
        status_remarks="Institution submitted Lien Release application following completion of 10-year term. Under Maker scrutiny.",
        document_filename="fdr_receipt_ims_hdfc.pdf",
        verification_token="tok_hdfc_ims_release_8829",
        verification_expires_at=datetime.now(timezone.utc) + timedelta(days=15)
    )

    # FDR 6: MATURED (Lapsed without renewal)
    fdr6 = FDR(
        fdr_number="SBI-MUM-2019-551029",
        institution_id=inst1.id,
        purpose="Additional Course Approval (Mechanical Mechatronics)",
        issuing_bank="State Bank of India",
        branch_name="Matunga Branch, Mumbai",
        ifsc_code="SBIN0000523",
        declared_amount=1000000.0,
        bank_confirmed_amount=1000000.0,
        currency="INR",
        issue_date="2019-10-10",
        declared_maturity_date=past_10_days,
        bank_confirmed_maturity_date=past_10_days,
        tenure_months=60,
        interest_rate=6.8,
        declared_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        bank_confirmed_joint_holder="Jointly with Member Secretary, AICTE, New Delhi",
        declared_lien=True,
        bank_confirmed_lien=True,
        auto_renewal_clause=False,
        status="MATURED",
        status_remarks="Matured 10 days ago without renewal. Regulatory show-cause trigger generated.",
        document_filename="fdr_matured_scan.pdf",
        verification_token="tok_sbi_vjti_matured_0019",
        verification_expires_at=datetime.now(timezone.utc) - timedelta(days=5)
    )

    db.add_all([fdr1, fdr2, fdr3, fdr4, fdr5, fdr6])
    db.flush()

    # 4. Bank DSC Verification Records for Verified FDRs
    dsc1 = generate_dsc_attestation(
        bank_name="State Bank of India",
        officer_name="S. Ramesh",
        officer_empid="SBI-OFF-7821",
        fdr_payload={"fdr": fdr1.fdr_number, "amt": 3500000.0}
    )
    bv1 = BankVerification(
        fdr_id=fdr1.id,
        token=fdr1.verification_token,
        bank_name="State Bank of India",
        branch_ifsc="SBIN0000523",
        nodal_officer_name="S. Ramesh",
        nodal_officer_emp_id="SBI-OFF-7821",
        nodal_officer_email="s.ramesh@sbi.co.in",
        confirmed_amount=3500000.0,
        confirmed_maturity_date=future_5_years,
        confirmed_lien_to_aicte=True,
        confirmed_auto_renewal=True,
        confirmed_fdr_status="ACTIVE_EARMARKED",
        dsc_signer_dn=dsc1["signer_dn"],
        dsc_cert_issuer=dsc1["cert_issuer"],
        dsc_cert_serial=dsc1["cert_serial"],
        dsc_signature_hex=dsc1["signature_hex"],
        dsc_verified=True,
        discrepancies=None
    )

    dsc4 = generate_dsc_attestation(
        bank_name="Bank of Baroda",
        officer_name="K. V. Ramanathan",
        officer_empid="BOB-OFF-3391",
        fdr_payload={"fdr": fdr4.fdr_number, "amt": 2000000.0}
    )
    bv4 = BankVerification(
        fdr_id=fdr4.id,
        token=fdr4.verification_token,
        bank_name="Bank of Baroda",
        branch_ifsc="BARB0PEELAM",
        nodal_officer_name="K. V. Ramanathan",
        nodal_officer_emp_id="BOB-OFF-3391",
        nodal_officer_email="kv.ramanathan@bankofbaroda.co.in",
        confirmed_amount=2000000.0,
        confirmed_maturity_date=future_3_years,
        confirmed_lien_to_aicte=False,
        confirmed_auto_renewal=False,
        confirmed_fdr_status="NORMAL_SAVINGS_FD",
        dsc_signer_dn=dsc4["signer_dn"],
        dsc_cert_issuer=dsc4["cert_issuer"],
        dsc_cert_serial=dsc4["cert_serial"],
        dsc_signature_hex=dsc4["signature_hex"],
        dsc_verified=True,
        discrepancies=json.dumps([
            "AMOUNT_MISMATCH: Declared ₹25,00,000 vs Bank Confirmed ₹20,00,000",
            "LIEN_NOT_MARKED: Bank ledger confirms NO lien marked in favor of Member Secretary, AICTE!"
        ])
    )
    db.add_all([bv1, bv4])
    db.flush()

    # 5. Field Provenances (Trust Tags)
    # For FDR 1 (All Bank-Confirmed & Officer-Verified)
    provs1 = [
        FieldProvenance(fdr_id=fdr1.id, field_key="amount", declared_val="₹ 35,00,000.00", bank_val="₹ 35,00,000.00", officer_val="₹ 35,00,000.00", trust_tag="OFFICER_VERIFIED", is_match=True),
        FieldProvenance(fdr_id=fdr1.id, field_key="maturity_date", declared_val=future_5_years, bank_val=future_5_years, officer_val=future_5_years, trust_tag="OFFICER_VERIFIED", is_match=True),
        FieldProvenance(fdr_id=fdr1.id, field_key="joint_holder", declared_val="Jointly with Member Secretary, AICTE", bank_val="Jointly with Member Secretary, AICTE", officer_val="Jointly with Member Secretary, AICTE", trust_tag="OFFICER_VERIFIED", is_match=True),
        FieldProvenance(fdr_id=fdr1.id, field_key="lien_status", declared_val="Lien Marked to AICTE", bank_val="Lien Marked to AICTE", officer_val="Lien Marked to AICTE", trust_tag="OFFICER_VERIFIED", is_match=True)
    ]
    # For FDR 4 (Flagged Mismatches)
    provs4 = [
        FieldProvenance(fdr_id=fdr4.id, field_key="amount", declared_val="₹ 25,00,000.00", bank_val="₹ 20,00,000.00", trust_tag="MISMATCH", is_match=False, notes="Bank confirms ₹5,00,000 shortfall"),
        FieldProvenance(fdr_id=fdr4.id, field_key="maturity_date", declared_val=future_3_years, bank_val=future_3_years, trust_tag="BANK_CONFIRMED", is_match=True),
        FieldProvenance(fdr_id=fdr4.id, field_key="joint_holder", declared_val="Jointly with Member Secretary, AICTE", bank_val="PSG Tech General Trust Only", trust_tag="MISMATCH", is_match=False, notes="AICTE name omitted in bank CBS"),
        FieldProvenance(fdr_id=fdr4.id, field_key="lien_status", declared_val="Lien Marked to AICTE", bank_val="No Lien Marked", trust_tag="MISMATCH", is_match=False, notes="CBS records show unencumbered deposit")
    ]
    # For FDR 3 (Declared only)
    provs3 = [
        FieldProvenance(fdr_id=fdr3.id, field_key="amount", declared_val="₹ 25,00,000.00", trust_tag="DECLARED", is_match=True),
        FieldProvenance(fdr_id=fdr3.id, field_key="maturity_date", declared_val=future_8_years, trust_tag="DECLARED", is_match=True),
        FieldProvenance(fdr_id=fdr3.id, field_key="joint_holder", declared_val="Jointly with Member Secretary, AICTE", trust_tag="DECLARED", is_match=True),
        FieldProvenance(fdr_id=fdr3.id, field_key="lien_status", declared_val="Lien Marked to AICTE", trust_tag="DECLARED", is_match=True)
    ]
    db.add_all(provs1 + provs4 + provs3)
    db.flush()

    # 6. Lien Release Application for FDR 5
    rel5 = LienRelease(
        fdr_id=fdr5.id,
        institution_id=inst5.id,
        reason="Completion of prescribed 10-year lock-in period as per AICTE Approval Process Handbook (Section 4.12). All regulatory compliance filings up to date.",
        compliance_undertaking_url="ims_undertaking_affidavit.pdf",
        status="PENDING_MAKER"
    )
    db.add(rel5)
    db.flush()

    # 7. Seed Initial Cryptographic Hash Chain Audit Blocks
    print("Generating Genesis and initial hash-chained audit blocks...")
    add_audit_block(
        db=db,
        action="GENESIS_SYSTEM_INITIALIZED",
        actor_role="SYSTEM",
        actor_name="AICTE Root Authority",
        entity_type="SYSTEM",
        entity_id="ROOT-AICTE-001",
        details={"version": "DepositGuard v2.4", "standard": "SIH2026-SIH26265", "cryptography": "SHA256-PKCS7-CCA"}
    )
    add_audit_block(
        db=db,
        action="INSTITUTION_REGISTERED",
        actor_role="AICTE_REGULATION_BUREAU",
        actor_name="System Administrator",
        entity_type="INSTITUTION",
        entity_id=inst1.id,
        details={"aicte_id": inst1.aicte_id, "name": inst1.name, "state": inst1.state}
    )
    add_audit_block(
        db=db,
        action="FDR_SUBMITTED",
        actor_role="INSTITUTION",
        actor_name=inst1.name,
        entity_type="FDR",
        entity_id=fdr1.id,
        details={"fdr_number": fdr1.fdr_number, "bank": fdr1.issuing_bank, "amount": fdr1.declared_amount}
    )
    add_audit_block(
        db=db,
        action="BANK_DSC_CONFIRMATION_SIGNED",
        actor_role="BANK_NODAL_OFFICER",
        actor_name="S. Ramesh (State Bank of India)",
        entity_type="FDR",
        entity_id=fdr1.id,
        details={"fdr_number": fdr1.fdr_number, "amount_confirmed": 3500000.0, "lien_status": "Lien Active to AICTE", "dsc_serial": dsc1["cert_serial"]}
    )
    add_audit_block(
        db=db,
        action="OFFICER_SCRUTINY_ACTIVE",
        actor_role="AICTE_MAKER",
        actor_name="Rajesh Sharma (Assistant Director)",
        entity_type="FDR",
        entity_id=fdr1.id,
        details={"fdr_number": fdr1.fdr_number, "status": "ACTIVE", "remarks": "Compliant with Approval Process Handbook"}
    )
    add_audit_block(
        db=db,
        action="BANK_DSC_DISCREPANCY_FLAGGED",
        actor_role="BANK_NODAL_OFFICER",
        actor_name="K. V. Ramanathan (Bank of Baroda)",
        entity_type="FDR",
        entity_id=fdr4.id,
        details={"fdr_number": fdr4.fdr_number, "declared_amount": 2500000.0, "bank_amount": 2000000.0, "lien": "NOT_MARKED"}
    )
    add_audit_block(
        db=db,
        action="LIEN_RELEASE_APPLICATION_FILED",
        actor_role="INSTITUTION",
        actor_name=inst5.name,
        entity_type="LIEN_RELEASE",
        entity_id=rel5.id,
        details={"fdr_number": fdr5.fdr_number, "amount": fdr5.declared_amount, "tenure_years": 10}
    )

    # 8. Seed Sample Notification Alerts
    alert1 = NotificationAlert(
        fdr_id=fdr2.id,
        institution_id=inst2.id,
        alert_type="MATURITY_15_DAYS",
        recipient=inst2.name,
        title="URGENT: FDR #PNB-ND-2021-984120 Matures in 12 Days",
        message="Deposit of ₹50,00,000.00 at Punjab National Bank matures on " + in_12_days + ". Submit No-Gap Replacement FDR immediately.",
        severity="CRITICAL"
    )
    alert2 = NotificationAlert(
        fdr_id=fdr4.id,
        institution_id=inst4.id,
        alert_type="BANK_MISMATCH",
        recipient="AICTE_REGULATION_BUREAU",
        title="Discrepancy Detected on BOB-CBE-2025-772910",
        message="Bank of Baroda confirmed ₹20,00,000 vs declared ₹25,00,000, and lien is NOT marked to AICTE.",
        severity="CRITICAL"
    )
    alert3 = NotificationAlert(
        fdr_id=fdr5.id,
        institution_id=inst5.id,
        alert_type="RELEASE_APPLICATION_SUBMITTED",
        recipient="AICTE_REGULATION_BUREAU",
        title="Lien Release Application: Institute of Management Studies",
        message="Application received for release of FDR #HDFC-NOI-2016-118942 upon completion of 10-year lock-in period.",
        severity="INFO"
    )
    db.add_all([alert1, alert2, alert3])

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
