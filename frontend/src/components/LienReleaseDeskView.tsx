import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Printer, 
  Download,
  Building,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { LienRelease, User, FDR } from '../types';
import { api } from '../services/api';

interface LienReleaseDeskViewProps {
  currentUser: User;
  onRefreshData: () => void;
  fdrs: FDR[];
}

export const LienReleaseDeskView: React.FC<LienReleaseDeskViewProps> = ({
  currentUser,
  onRefreshData,
  fdrs
}) => {
  const [releases, setReleases] = useState<LienRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<LienRelease | null>(null);
  const [makerRemarks, setMakerRemarks] = useState('');
  const [checkerRemarks, setCheckerRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeLetterHtml, setActiveLetterHtml] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New Application Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedFdrForRelease, setSelectedFdrForRelease] = useState('');
  const [releaseReason, setReleaseReason] = useState('Completion of prescribed 8-year tenure as per AICTE Approval Process Handbook norm; all compliances fulfilled.');

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const data = await api.getReleaseRequests();
      setReleases(data);
      if (data.length > 0 && !selectedRelease) {
        setSelectedRelease(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleMakerDecision = async (decision: 'RECOMMEND' | 'REJECT') => {
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      await api.makerRecommendRelease({
        release_id: selectedRelease.id,
        decision,
        remarks: makerRemarks || (decision === 'RECOMMEND' ? 'Tenure norms and compliance conditions verified satisfactory.' : 'Deficiency observed in compliance filing.')
      }, 'demo_token');
      setNotification(`Maker decision '${decision}' successfully recorded and forwarded.`);
      await fetchReleases();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckerDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedRelease) return;
    setActionLoading(true);
    try {
      const res = await api.checkerApproveRelease({
        release_id: selectedRelease.id,
        decision,
        remarks: checkerRemarks || (decision === 'APPROVE' ? 'Sanctioned. Issue official AICTE Lien Discharge Order.' : 'Rejected by Competent Authority.')
      }, 'demo_token');
      setNotification(`Competent Authority Sanction Granted! Order Ref: ${res.discharge_order_ref}`);
      await fetchReleases();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDischarge = async (releaseId: string) => {
    setActionLoading(true);
    try {
      await api.executeDischarge(releaseId);
      setNotification("Bank CBS lien cleared successfully. Security deposit refunded to college.");
      await fetchReleases();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Discharge failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenLetter = (releaseId: string) => {
    window.open(`http://localhost:8000/api/release/${releaseId}/letter`, '_blank');
  };

  const handleApplyReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdrForRelease) return;
    setActionLoading(true);
    try {
      await api.applyLienRelease({
        fdr_id: selectedFdrForRelease,
        reason: releaseReason
      });
      setShowApplyModal(false);
      setNotification("Lien Release Application submitted successfully for Maker scrutiny.");
      await fetchReleases();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit release application');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              Lien Release & Refund Desk (Two-Officer Maker-Checker Workflow)
            </h2>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
              Regulatory Approval Handshake
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enforces strict two-tier authorization: <strong>Stage 1 (Maker Scrutiny)</strong> verifies compliance checklists &rarr; <strong>Stage 2 (Checker Sanction)</strong> issues official digitally signed Lien Discharge Orders.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          Apply for Lien Release
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">&times;</button>
        </div>
      )}

      {/* Two Column Layout: Applications Queue & Maker-Checker Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue of Release Applications (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Release Applications Queue ({releases.length})
            </h3>
            <p className="text-[11px] text-slate-500">Select an application to scrutinize or authorize</p>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {releases.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No lien release applications pending.
              </div>
            ) : (
              releases.map(r => {
                const isSelected = selectedRelease?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRelease(r)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 shadow-sm ring-1 ring-purple-500'
                        : 'border-slate-200 hover:border-purple-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-xs text-slate-900">{r.fdr_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'CHECKER_APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'MAKER_RECOMMENDED' ? 'bg-purple-100 text-purple-800' :
                        r.status === 'DISCHARGED' ? 'bg-slate-200 text-slate-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">{r.institution_name}</div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                      <span>{r.issuing_bank}</span>
                      <strong className="text-slate-900">₹ {(r.amount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    {r.discharge_order_ref && (
                      <div className="text-[10px] font-mono text-purple-700 mt-1">
                        Order Ref: {r.discharge_order_ref}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Maker-Checker Scrutiny & Sanction Cockpit (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {selectedRelease ? (
            <>
              {/* Stepper Progress */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className={`font-bold ${selectedRelease.status !== 'REJECTED' ? 'text-blue-700' : 'text-slate-400'}`}>
                    1. Application Filed
                  </div>
                  <div className={`font-bold ${['MAKER_RECOMMENDED', 'CHECKER_APPROVED', 'DISCHARGED'].includes(selectedRelease.status) ? 'text-blue-700' : 'text-slate-400'}`}>
                    2. Maker Scrutinized
                  </div>
                  <div className={`font-bold ${['CHECKER_APPROVED', 'DISCHARGED'].includes(selectedRelease.status) ? 'text-blue-700' : 'text-slate-400'}`}>
                    3. Checker Sanctioned
                  </div>
                  <div className={`font-bold ${selectedRelease.status === 'DISCHARGED' ? 'text-emerald-700' : 'text-slate-400'}`}>
                    4. CBS Discharged
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-blue-600 h-full" style={{
                    width: selectedRelease.status === 'PENDING_MAKER' ? '25%' :
                           selectedRelease.status === 'MAKER_RECOMMENDED' ? '50%' :
                           selectedRelease.status === 'CHECKER_APPROVED' ? '75%' : '100%'
                  }}></div>
                </div>
              </div>

              {/* Case Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Institution:</span>
                  <strong className="text-slate-900">{selectedRelease.institution_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FDR Receipt Number:</span>
                  <strong className="font-mono text-slate-900">{selectedRelease.fdr_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit Principal Amount:</span>
                  <strong className="text-blue-900">₹ {(selectedRelease.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Justification / Reason:</span>
                  <span className="text-slate-700 max-w-sm text-right">{selectedRelease.reason}</span>
                </div>
              </div>

              {/* STAGE 1: MAKER SCRUTINY ACTION */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Stage 1: AICTE Regulation Bureau Maker Scrutiny
                  </h4>
                  {selectedRelease.maker_name && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                      Scrutinized by {selectedRelease.maker_name}
                    </span>
                  )}
                </div>

                {selectedRelease.status === 'PENDING_MAKER' ? (
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={makerRemarks}
                      onChange={(e) => setMakerRemarks(e.target.value)}
                      placeholder="Maker Scrutiny remarks: Verify completion of lock-in period, no pending litigation or penalty..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMakerDecision('RECOMMEND')}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Recommend for Release
                      </button>
                      <button
                        onClick={() => handleMakerDecision('REJECT')}
                        disabled={actionLoading}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
                      >
                        Reject Application
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">
                    Remarks: {selectedRelease.maker_remarks || 'Recommended for Competent Authority approval.'}
                  </p>
                )}
              </div>

              {/* STAGE 2: CHECKER (COMPETENT AUTHORITY) SANCTION ACTION */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Stage 2: Competent Authority (Member Secretary / Director)
                  </h4>
                  {selectedRelease.checker_name && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                      Authorized by {selectedRelease.checker_name}
                    </span>
                  )}
                </div>

                {selectedRelease.status === 'MAKER_RECOMMENDED' ? (
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={checkerRemarks}
                      onChange={(e) => setCheckerRemarks(e.target.value)}
                      placeholder="Competent Authority Sanction Remarks: Approved under Approval Process Handbook powers..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCheckerDecision('APPROVE')}
                        disabled={actionLoading}
                        className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Execute Sanction & Generate Official Order
                      </button>
                      <button
                        onClick={() => handleCheckerDecision('REJECT')}
                        disabled={actionLoading}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : selectedRelease.discharge_order_ref ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-200 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Official Discharge Order Ref:</span>
                      <strong className="font-mono text-purple-900">{selectedRelease.discharge_order_ref}</strong>
                    </div>
                    <button
                      onClick={() => handleOpenLetter(selectedRelease.id)}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Official Letter
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Awaiting Stage 1 Maker recommendation before Competent Authority review.
                  </p>
                )}
              </div>

              {/* STAGE 3: BANK EXECUTION */}
              {selectedRelease.status === 'CHECKER_APPROVED' && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900">Ready for Bank Core Banking Solution (CBS) Execution</h5>
                    <p className="text-[11px] text-emerald-700">Official order generated. Bank Nodal Officer can now discharge the lien.</p>
                  </div>
                  <button
                    onClick={() => handleExecuteDischarge(selectedRelease.id)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Clear Lien in Bank CBS
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <FileCheck2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Select a lien release application from the queue to process.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Apply for Security Deposit Lien Release</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>

            <form onSubmit={handleApplyReleaseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Active FDR to Release *</label>
                <select
                  value={selectedFdrForRelease}
                  onChange={(e) => setSelectedFdrForRelease(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="">Choose an eligible FDR...</option>
                  {fdrs.filter(f => f.status === 'ACTIVE' || f.status === 'MATURED').map(f => (
                    <option key={f.id} value={f.id}>
                      {f.institution_name} &bull; #{f.fdr_number} (₹{(f.bank_confirmed_amount || f.declared_amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justification & Regulatory Norm Fulfilled *</label>
                <textarea
                  rows={3}
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                <strong>AICTE Verification Clause:</strong> By submitting, the institution affirms that all statutory compliance certificates, faculty salary clearances, and student grievance resolutions are on record.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Release Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

