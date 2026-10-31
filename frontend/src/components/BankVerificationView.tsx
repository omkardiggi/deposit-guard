import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  QrCode, 
  Lock, 
  FileText,
  BadgeCheck,
  RefreshCw
} from 'lucide-react';
import { FDR, User } from '../types';
import { api } from '../services/api';

interface BankVerificationViewProps {
  fdrs: FDR[];
  currentUser: User;
  onRefreshData: () => void;
  selectedToken?: string;
}

export const BankVerificationView: React.FC<BankVerificationViewProps> = ({
  fdrs,
  currentUser,
  onRefreshData,
  selectedToken
}) => {
  const [tokenInput, setTokenInput] = useState(selectedToken || '');
  const [requestData, setRequestData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Verification Form State
  const [nodalOfficerName, setNodalOfficerName] = useState(currentUser.full_name || 'S. Ramesh');
  const [nodalOfficerEmpId, setNodalOfficerEmpId] = useState('SBI-OFF-7821');
  const [nodalOfficerEmail, setNodalOfficerEmail] = useState(currentUser.email || 's.ramesh@sbi.co.in');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchIfsc, setBranchIfsc] = useState('SBIN0000523');
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);
  const [confirmedMaturityDate, setConfirmedMaturityDate] = useState('');
  const [confirmedJointHolder, setConfirmedJointHolder] = useState('Jointly with Member Secretary, AICTE, New Delhi');
  const [confirmedLienToAicte, setConfirmedLienToAicte] = useState(true);
  const [confirmedAutoRenewal, setConfirmedAutoRenewal] = useState(false);
  const [confirmedFdrStatus, setConfirmedFdrStatus] = useState('ACTIVE_EARMARKED');
  const [remarks, setRemarks] = useState('');

  // Auto-load token from props if present, or first pending FDR
  useEffect(() => {
    if (selectedToken) {
      setTokenInput(selectedToken);
      loadRequest(selectedToken);
    } else {
      const pendingFdr = fdrs.find(f => f.status === 'PENDING_VERIFICATION') || fdrs[0];
      if (pendingFdr) {
        setTokenInput(pendingFdr.verification_token);
        loadRequest(pendingFdr.verification_token);
      }
    }
  }, [selectedToken, fdrs]);

  const loadRequest = async (token: string) => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessResult(null);
    try {
      const data = await api.getBankRequest(token.trim());
      setRequestData(data);
      setBankName(data.issuing_bank);
      setBranchIfsc(data.ifsc_code);
      setConfirmedAmount(data.declared_amount);
      setConfirmedMaturityDate(data.declared_maturity_date);
      setConfirmedJointHolder(data.declared_joint_holder);
      setConfirmedLienToAicte(data.declared_lien);
      setConfirmedAutoRenewal(data.auto_renewal_clause);
    } catch (err: any) {
      setError(err.message || 'Failed to load request');
      setRequestData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        token: tokenInput,
        nodal_officer_name: nodalOfficerName,
        nodal_officer_emp_id: nodalOfficerEmpId,
        nodal_officer_email: nodalOfficerEmail,
        bank_name: bankName,
        branch_ifsc: branchIfsc,
        confirmed_amount: Number(confirmedAmount),
        confirmed_maturity_date: confirmedMaturityDate,
        confirmed_joint_holder: confirmedJointHolder,
        confirmed_lien_to_aicte: confirmedLienToAicte,
        confirmed_auto_renewal: confirmedAutoRenewal,
        confirmed_fdr_status: confirmedFdrStatus,
        remarks: remarks
      };

      const result = await api.submitBankVerification(payload);
      setSuccessResult(result);
      onRefreshData();
      loadRequest(tokenInput);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Discrepancy Calculation
  const isAmountMismatch = requestData && Math.abs(Number(confirmedAmount) - requestData.declared_amount) > 1.0;
  const isLienMismatch = requestData && requestData.declared_lien && !confirmedLienToAicte;
  const isMaturityMismatch = requestData && confirmedMaturityDate !== requestData.declared_maturity_date;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              Issuing Bank Verification & DSC Attestation Desk
            </h2>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              IT Act 2000 &bull; Section 4/5 Valid
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Issuing Bank Nodal Officers confirm instrument validity, note lien in CBS in favor of <strong>Member Secretary, AICTE</strong>, and digitally sign with Class-3 DSC.
          </p>
        </div>

        {/* Token Selector / Direct Input */}
        <div className="flex items-center gap-2">
          <select
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value);
              loadRequest(e.target.value);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
          >
            <option value="">Select an FDR Verification Request...</option>
            {fdrs.map(f => (
              <option key={f.id} value={f.verification_token}>
                {f.issuing_bank} &bull; #{f.fdr_number} ({f.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => loadRequest(tokenInput)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Load
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Banner */}
      {successResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-sm text-emerald-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <BadgeCheck className="w-5 h-5 text-emerald-600" />
            Bank Attestation Submitted & Digitally Signed!
          </div>
          <p className="text-xs text-emerald-800">
            {successResult.message} DSC Certificate Hash chained to DepositGuard Immutable Ledger.
          </p>
          <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-[11px] font-mono space-y-1">
            <div>Signer DN: <span className="font-bold">{successResult.dsc_details?.signer_dn}</span></div>
            <div>Cert Issuer: <span>{successResult.dsc_details?.cert_issuer}</span></div>
            <div>Serial: <span>{successResult.dsc_details?.cert_serial}</span> &bull; Status: <span className="text-emerald-700 font-bold">{successResult.dsc_details?.ocsp_status}</span></div>
          </div>
        </div>
      )}

      {requestData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Declared by Institution (4 Cols) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="badge-declared inline-block mb-1">Source: Institution Declared</span>
              <h3 className="text-sm font-bold text-slate-900">Declared Instrument Data</h3>
              <p className="text-[11px] text-slate-500">Submitted by {requestData.institution?.name}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase">AICTE Permanent ID</span>
                <span className="font-bold text-slate-900">{requestData.institution?.aicte_id}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase">FDR Number</span>
                <span className="font-bold font-mono text-slate-900">{requestData.fdr_number}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase">Declared Principal Amount</span>
                <span className="font-bold text-base text-blue-900">
                  ₹ {requestData.declared_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase">Dates (Issue &rarr; Declared Maturity)</span>
                <span className="font-medium text-slate-800">
                  {requestData.issue_date} &rarr; <strong>{requestData.declared_maturity_date}</strong>
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Tenure: {requestData.tenure_months} Months</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase">Declared Account Title</span>
                <span className="font-medium text-slate-800">{requestData.declared_joint_holder}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase">Lien Status to AICTE</span>
                <span className="font-semibold text-emerald-700">
                  {requestData.declared_lien ? 'Declared Lien Marked' : 'Not Declared'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Bank Ledger Confirmation Form (8 Cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="badge-bank-confirmed inline-block mb-1">Source: Issuing Bank Attestation</span>
                <h3 className="text-sm font-bold text-slate-900">Bank Core Banking Solution (CBS) Attestation</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                1-Time Ref: {tokenInput.slice(0, 10)}...
              </div>
            </div>

            {/* Discrepancy Detection Alerts */}
            {(isAmountMismatch || isLienMismatch || isMaturityMismatch) && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Live Discrepancy Engine: Deviations Detected!
                </div>
                {isAmountMismatch && (
                  <p>&bull; Amount mismatch: Declared ₹{requestData.declared_amount} vs Bank Entry ₹{confirmedAmount}</p>
                )}
                {isLienMismatch && (
                  <p>&bull; Lien not marked: Bank ledger confirms deposit is unencumbered!</p>
                )}
                {isMaturityMismatch && (
                  <p>&bull; Maturity date mismatch: Declared {requestData.declared_maturity_date} vs Bank {confirmedMaturityDate}</p>
                )}
                <p className="text-[11px] text-amber-700 italic">
                  Note: Submitting these confirmed values will automatically flag this FDR for AICTE Scrutiny intervention.
                </p>
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
              {/* Nodal Officer Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nodal Officer Name</label>
                  <input
                    type="text"
                    value={nodalOfficerName}
                    onChange={(e) => setNodalOfficerName(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee / P.F. ID</label>
                  <input
                    type="text"
                    value={nodalOfficerEmpId}
                    onChange={(e) => setNodalOfficerEmpId(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Bank Email</label>
                  <input
                    type="email"
                    value={nodalOfficerEmail}
                    onChange={(e) => setNodalOfficerEmail(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Financial Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Confirmed Principal Amount (INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={confirmedAmount}
                    onChange={(e) => setConfirmedAmount(Number(e.target.value))}
                    required
                    className={`w-full p-2.5 font-bold text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                      isAmountMismatch ? 'border-amber-400 bg-amber-50/40 text-amber-900' : 'border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Confirmed Maturity Date *
                  </label>
                  <input
                    type="date"
                    value={confirmedMaturityDate}
                    onChange={(e) => setConfirmedMaturityDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Account Title & Lien Check */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Confirmed Account Title in Bank Ledger *
                </label>
                <input
                  type="text"
                  value={confirmedJointHolder}
                  onChange={(e) => setConfirmedJointHolder(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AICTE Lien Checkbox */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  confirmedLienToAicte ? 'bg-emerald-50/50 border-emerald-300' : 'bg-rose-50 border-rose-300'
                }`}>
                  <input
                    type="checkbox"
                    id="lienCheck"
                    checked={confirmedLienToAicte}
                    onChange={(e) => setConfirmedLienToAicte(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded"
                  />
                  <label htmlFor="lienCheck" className="text-xs">
                    <strong className="block text-slate-900">Lien Marked to AICTE in CBS</strong>
                    <span className="text-[11px] text-slate-500">
                      Confirmed lien noted in favor of "Member Secretary, AICTE" with non-withdrawal flag.
                    </span>
                  </label>
                </div>

                {/* Auto Rollover Checkbox */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="autoRenewalCheck"
                    checked={confirmedAutoRenewal}
                    onChange={(e) => setConfirmedAutoRenewal(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded"
                  />
                  <label htmlFor="autoRenewalCheck" className="text-xs">
                    <strong className="block text-slate-900">Auto-Renewal Clause Active</strong>
                    <span className="text-[11px] text-slate-500">
                      FDR will automatically roll over upon maturity if renewal order not received.
                    </span>
                  </label>
                </div>
              </div>

              {/* CBS Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank Official Remarks / Core Banking Verification Notes
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Lien registered under CBS Flag #LN-2026-901; no pre-mature liquidation permitted."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* DSC Sign Button */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  Class-3 DSC Token (eMudhra / SafeScrypt CCA Root)
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting ? 'Applying DSC Signature...' : 'DSC Sign & Confirm FDR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
