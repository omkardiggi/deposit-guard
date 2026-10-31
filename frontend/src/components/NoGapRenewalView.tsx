import React, { useState } from 'react';
import { 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  AlertTriangle,
  Building,
  FileText
} from 'lucide-react';
import { FDR, User } from '../types';
import { api } from '../services/api';

interface NoGapRenewalViewProps {
  fdrs: FDR[];
  currentUser: User;
  onRefreshData: () => void;
  preSelectedFDR?: FDR | null;
}

export const NoGapRenewalView: React.FC<NoGapRenewalViewProps> = ({
  fdrs,
  currentUser,
  onRefreshData,
  preSelectedFDR
}) => {
  const [selectedOldFdrId, setSelectedOldFdrId] = useState(preSelectedFDR?.id || '');
  const [newFdrNumber, setNewFdrNumber] = useState('');
  const [issuingBank, setIssuingBank] = useState('');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [declaredAmount, setDeclaredAmount] = useState<number>(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [declaredMaturityDate, setDeclaredMaturityDate] = useState('');
  const [tenureMonths, setTenureMonths] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Filter FDRs needing renewal (Expiring soon or Matured)
  const expiringFDRs = fdrs.filter(f => 
    f.status === 'EXPIRING_SOON' || f.status === 'MATURED' || f.status === 'ACTIVE'
  );

  const selectedFDR = fdrs.find(f => f.id === selectedOldFdrId);

  const handleSelectOldFDR = (fdr: FDR) => {
    setSelectedOldFdrId(fdr.id);
    setNewFdrNumber(`${fdr.issuing_bank.slice(0, 3).toUpperCase()}-REN-${Date.now().toString().slice(-6)}`);
    setIssuingBank(fdr.issuing_bank);
    setBranchName(fdr.branch_name);
    setIfscCode(fdr.ifsc_code);
    setDeclaredAmount(fdr.bank_confirmed_amount || fdr.declared_amount);
    
    // Default 5 years from today
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    setDeclaredMaturityDate(d.toISOString().split('T')[0]);
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOldFdrId) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        previous_fdr_id: selectedOldFdrId,
        new_fdr_number: newFdrNumber,
        issuing_bank: issuingBank,
        branch_name: branchName,
        ifsc_code: ifscCode,
        declared_amount: Number(declaredAmount),
        issue_date: issueDate,
        declared_maturity_date: declaredMaturityDate,
        tenure_months: Number(tenureMonths),
        interest_rate: 7.15,
        declared_joint_holder: 'Jointly with Member Secretary, AICTE, New Delhi',
        auto_renewal_clause: true,
        document_filename: 'renewal_fdr_receipt.pdf'
      };

      await api.renewFDR(payload);
      setMessage({
        text: `Success! Replacement FDR #${newFdrNumber} submitted under No-Gap Renewal rule. Bank attestation link dispatched.`,
        isError: false
      });
      onRefreshData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Renewal submission failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AICTE No-Gap Principle Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap justify-between items-center gap-4">
          <div className="max-w-2xl">
            <span className="bg-amber-400 text-amber-950 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider mb-2 inline-block">
              Regulatory Safeguard
            </span>
            <h2 className="text-xl font-black text-white">
              AICTE No-Gap Renewal Rule & Lineage Tracker
            </h2>
            <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
              Under AICTE regulations, an expiring Fixed Deposit Receipt <strong>cannot close or be released</strong> until its replacement instrument is confirmed and digitally signed by the issuing bank. This prevents lapses in student protection capital.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
            <div className="text-xs">
              <strong className="block text-white">Continuous Security Pledged</strong>
              <span className="text-amber-200">Zero-day gap enforcement</span>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.isError ? 'bg-rose-50 border border-rose-300 text-rose-800' : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
        }`}>
          {message.isError ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Maturing Instruments Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Maturing Instruments Queue ({expiringFDRs.length})
            </h3>
            <p className="text-[11px] text-slate-500">Select an FDR to prepare replacement instrument</p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {expiringFDRs.map(f => {
              const isSelected = f.id === selectedOldFdrId;
              const isUrgent = f.status === 'EXPIRING_SOON' || f.status === 'MATURED';
              return (
                <div
                  key={f.id}
                  onClick={() => handleSelectOldFDR(f)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-blue-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-xs text-slate-900">{f.fdr_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isUrgent ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {f.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">{f.institution_name}</div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                    <span>{f.issuing_bank}</span>
                    <strong className="text-slate-900">₹ {(f.bank_confirmed_amount || f.declared_amount).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Matures: <strong className="text-amber-800">{f.bank_confirmed_maturity_date || f.declared_maturity_date}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: No-Gap Renewal Form & Lineage (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Replacement FDR Submission Form
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedFDR ? `Linking replacement to existing FDR #${selectedFDR.fdr_number}` : 'Select an FDR from the left queue to begin'}
            </p>
          </div>

          {selectedFDR ? (
            <form onSubmit={handleRenewSubmit} className="space-y-4 text-xs">
              {/* Lineage Visualizer Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="text-slate-700">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Maturing Instrument (Parent)</span>
                  <span className="font-mono font-bold">{selectedFDR.fdr_number}</span>
                  <span className="block text-[11px] text-slate-600">₹ {(selectedFDR.bank_confirmed_amount || selectedFDR.declared_amount).toLocaleString('en-IN')}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 animate-pulse" />
                <div className="text-blue-900 font-semibold text-right">
                  <span className="block text-[10px] text-blue-600 uppercase font-bold">Replacement Instrument (Child)</span>
                  <span className="font-mono font-bold text-xs">{newFdrNumber || 'Pending Entry'}</span>
                  <span className="block text-[11px] text-blue-800">No-Gap Protected</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">New FDR Receipt Number *</label>
                  <input
                    type="text"
                    value={newFdrNumber}
                    onChange={(e) => setNewFdrNumber(e.target.value)}
                    required
                    className="w-full p-2.5 font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Replacement Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={declaredAmount}
                    onChange={(e) => setDeclaredAmount(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Issuing Bank *</label>
                  <input
                    type="text"
                    value={issuingBank}
                    onChange={(e) => setIssuingBank(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch IFSC *</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">New Issue Date *</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">New Maturity Date *</label>
                  <input
                    type="date"
                    value={declaredMaturityDate}
                    onChange={(e) => setDeclaredMaturityDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  {submitting ? 'Submitting No-Gap Replacement...' : 'Submit Replacement FDR'}
                </button>
              </div>
            </form>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Please select an expiring FDR from the left panel to execute No-Gap Renewal.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
