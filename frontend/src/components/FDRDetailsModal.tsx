import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  KeyRound, 
  Building, 
  Clock, 
  UserCheck, 
  X
} from 'lucide-react';
import { FDR, User } from '../types';
import { api } from '../services/api';

interface FDRDetailsModalProps {
  fdr: FDR | null;
  onClose: () => void;
  currentUser: User;
  onOpenQR: (token: string, fdrNumber: string) => void;
  onRefreshData: () => void;
}

export const FDRDetailsModal: React.FC<FDRDetailsModalProps> = ({
  fdr,
  onClose,
  currentUser,
  onOpenQR,
  onRefreshData,
}) => {
  if (!fdr) return null;

  const [scrutinyRemarks, setScrutinyRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const verification = fdr.verifications && fdr.verifications.length > 0 ? fdr.verifications[0] : null;

  const handleScrutinyAction = async (decision: 'ACTIVE' | 'FLAGGED_MISMATCH' | 'REJECTED') => {
    setSubmitting(true);
    try {
      await api.submitScrutinyDecision({
        fdr_id: fdr.id,
        decision,
        remarks: scrutinyRemarks || (decision === 'ACTIVE' ? 'Compliant with AICTE Approval Process Handbook norms.' : 'Scrutiny deficiency flagged.')
      }, 'demo_token');
      onRefreshData();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Scrutiny decision failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-slate-900">{fdr.fdr_number}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {fdr.status}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mt-1">{fdr.institution_name} ({fdr.aicte_id})</h3>
            <p className="text-xs text-slate-500">{fdr.purpose}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provenance: Trust Tag on Every Field (Slide 2 Core Architecture) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Cryptographic Field Provenance &amp; Verification Match
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">Declared vs Bank-Confirmed</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">Field</th>
                  <th className="py-2.5 px-3">Declared by College</th>
                  <th className="py-2.5 px-3">Bank DSC Confirmed</th>
                  <th className="py-2.5 px-3">Trust Provenance Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fdr.provenances.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 capitalize">
                      {p.field_key.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{p.declared_val}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {p.bank_val || <span className="text-slate-400 italic">Awaiting Confirmation</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {p.trust_tag === 'MISMATCH' ? (
                        <span className="badge-mismatch inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Mismatch
                        </span>
                      ) : p.trust_tag === 'OFFICER_VERIFIED' ? (
                        <span className="badge-officer-verified inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Officer Verified
                        </span>
                      ) : p.trust_tag === 'BANK_CONFIRMED' ? (
                        <span className="badge-bank-confirmed inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Bank Confirmed
                        </span>
                      ) : (
                        <span className="badge-declared">Declared Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank Verification & DSC Certificate Card */}
        {verification ? (
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex justify-between items-center text-emerald-950 font-bold">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                Bank Nodal Officer DSC Attestation Record
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                Serial: {verification.dsc_cert_serial}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-emerald-900 font-mono">
              <div>Signer DN: <span className="text-slate-800 font-sans">{verification.dsc_signer_dn}</span></div>
              <div>Issuer: <span className="text-slate-800 font-sans">{verification.dsc_cert_issuer}</span></div>
              <div>Confirmed Amount: <strong className="text-slate-900">₹ {verification.confirmed_amount.toLocaleString('en-IN')}</strong></div>
              <div>AICTE Lien Pledged: <strong className={verification.confirmed_lien_to_aicte ? 'text-emerald-700' : 'text-rose-700'}>{verification.confirmed_lien_to_aicte ? 'YES (Active)' : 'NO (Unencumbered)'}</strong></div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
            <div>
              <strong className="block text-slate-800">One-Time 15-Day Bank Verification Dispatched</strong>
              <span className="text-slate-500 text-[11px]">Token active for issuing bank nodal officer.</span>
            </div>
            <button
              onClick={() => onOpenQR(fdr.verification_token, fdr.fdr_number)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              View Bank QR Link
            </button>
          </div>
        )}

        {/* Officer Scrutiny Action Desk (If Maker/Checker role) */}
        {(currentUser.role === 'AICTE_MAKER' || currentUser.role === 'AICTE_CHECKER') && (
          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl text-xs space-y-3">
            <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-700" />
              Regulation Bureau Officer Scrutiny Cockpit
            </h4>

            <textarea
              rows={2}
              value={scrutinyRemarks}
              onChange={(e) => setScrutinyRemarks(e.target.value)}
              placeholder="Enter scrutiny observations (e.g. Deposit norms verified in accordance with Approval Process Handbook)..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleScrutinyAction('ACTIVE')}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve & Mark Active
              </button>
              <button
                onClick={() => handleScrutinyAction('FLAGGED_MISMATCH')}
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Flag Discrepancy
              </button>
              <button
                onClick={() => handleScrutinyAction('REJECTED')}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg"
              >
                Reject Submission
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
