import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  KeyRound,
  Building,
  Clock,
  UserCheck,
  X,
  FileText,
  History,
  Landmark,
  Link2,
  Bell,
  MessageSquare,
  Download,
  Loader2,
  ScanLine,
  TrendingUp,
  Calendar,
  Hash
} from 'lucide-react';
import { FDR, User, FDRDossier } from '../types';
import { api } from '../services/api';

interface FDRDetailsModalProps {
  fdr: FDR | null;
  onClose: () => void;
  currentUser: User;
  onOpenQR: (token: string, fdrNumber: string) => void;
  onRefreshData: () => void;
  refreshKey?: number;
}

type TabId = 'overview' | 'provenance' | 'institution' | 'history' | 'document';

const inr = (n?: number | null) =>
  n == null ? '—' : `₹ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d?: string | null) => {
  if (!d) return '—';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleString('en-IN');
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-slate-500 flex-shrink-0">{label}</span>
    <span className="text-slate-900 font-medium text-right break-words">{children}</span>
  </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string; icon?: React.ReactNode }> = ({
  label, value, tone = 'text-slate-900', icon,
}) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
      {icon}{label}
    </div>
    <div className={`text-sm font-black mt-0.5 ${tone}`}>{value}</div>
  </div>
);

export const FDRDetailsModal: React.FC<FDRDetailsModalProps> = ({
  fdr,
  onClose,
  currentUser,
  onOpenQR,
  onRefreshData,
  refreshKey = 0,
}) => {
  const [scrutinyRemarks, setScrutinyRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const [dossier, setDossier] = useState<FDRDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  const fdrId = fdr?.id;

  // Pull the full dossier whenever a different instrument is opened.
  useEffect(() => {
    if (!fdrId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setDossier(null);
    setTab('overview');
    api.getFDRHistory(fdrId)
      .then(data => { if (!cancelled) setDossier(data); })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Could not load record history'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fdrId, refreshKey]);

  if (!fdr) return null;

  const verification = fdr.verifications?.[0] || null;
  const computed = dossier?.computed;
  const institution = dossier?.institution;
  const document = dossier?.document;

  const handleScrutinyAction = async (decision: 'ACTIVE' | 'FLAGGED_MISMATCH' | 'REJECTED') => {
    setSubmitting(true);
    try {
      await api.submitScrutinyDecision({
        fdr_id: fdr.id,
        decision,
        remarks: scrutinyRemarks || (decision === 'ACTIVE'
          ? 'Compliant with AICTE Approval Process Handbook norms.'
          : 'Scrutiny deficiency flagged.')
      });
      onRefreshData();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Scrutiny decision failed');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'provenance', label: 'Provenance & DSC', icon: <ShieldCheck className="w-3.5 h-3.5" />, count: fdr.provenances?.length },
    { id: 'institution', label: 'Institution', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'Lifecycle History', icon: <History className="w-3.5 h-3.5" />, count: dossier?.audit_timeline?.length },
    { id: 'document', label: 'Document & OCR', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl my-8">

        {/* ---------- Header ---------- */}
        <div className="flex justify-between items-start border-b border-slate-100 p-6 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-black text-slate-900">{fdr.fdr_number}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {fdr.status}
              </span>
              {computed?.is_bank_verified && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Bank Verified
                </span>
              )}
              {dossier && dossier.lineage.total > 1 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Generation {dossier.lineage.position} of {dossier.lineage.total}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mt-1">
              {fdr.institution_name} ({fdr.aicte_id})
            </h3>
            <p className="text-xs text-slate-500">{fdr.purpose}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---------- Tabs ---------- */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-200 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`text-[9px] px-1.5 rounded-full ${tab === t.id ? 'bg-blue-500' : 'bg-slate-200 text-slate-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5 text-xs">
          {loading && (
            <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading complete record history…</span>
            </div>
          )}
          {loadError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {loadError}
            </div>
          )}

          {/* ===================== OVERVIEW ===================== */}
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                  label="Effective Amount"
                  value={inr(computed?.effective_amount ?? fdr.declared_amount)}
                  tone="text-blue-900"
                />
                <Stat
                  label="Days to Maturity"
                  icon={<Calendar className="w-3 h-3" />}
                  value={
                    computed?.days_to_maturity == null ? '—'
                      : computed.days_to_maturity < 0 ? `Matured ${Math.abs(computed.days_to_maturity)}d ago`
                        : `${computed.days_to_maturity} days`
                  }
                  tone={
                    computed?.days_to_maturity == null ? 'text-slate-900'
                      : computed.days_to_maturity < 0 ? 'text-rose-700'
                        : computed.days_to_maturity <= 60 ? 'text-amber-700' : 'text-emerald-700'
                  }
                />
                <Stat
                  label="Amount Variance"
                  value={computed?.amount_variance == null ? 'Not confirmed' : inr(computed.amount_variance)}
                  tone={computed?.amount_variance ? 'text-rose-700' : 'text-emerald-700'}
                />
                <Stat
                  label="Audit Blocks"
                  icon={<Hash className="w-3 h-3" />}
                  value={computed?.audit_block_count ?? '—'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Instrument</h4>
                  <Row label="FDR Number">{fdr.fdr_number}</Row>
                  <Row label="Issuing Bank">{fdr.issuing_bank}</Row>
                  <Row label="Branch">{fdr.branch_name}</Row>
                  <Row label="IFSC"><span className="font-mono">{fdr.ifsc_code}</span></Row>
                  <Row label="Interest Rate">{fdr.interest_rate}% p.a.</Row>
                  <Row label="Tenure">{fdr.tenure_months} months</Row>
                  <Row label="Auto-Renewal">{fdr.auto_renewal_clause ? 'Yes' : 'No'}</Row>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Declared vs Bank-Confirmed</h4>
                  <Row label="Declared Amount">{inr(fdr.declared_amount)}</Row>
                  <Row label="Bank Confirmed">
                    {fdr.bank_confirmed_amount == null
                      ? <span className="text-slate-400 italic">Awaiting</span>
                      : inr(fdr.bank_confirmed_amount)}
                  </Row>
                  <Row label="Issue Date">{fmtDate(fdr.issue_date)}</Row>
                  <Row label="Declared Maturity">{fmtDate(fdr.declared_maturity_date)}</Row>
                  <Row label="Bank Maturity">
                    {fdr.bank_confirmed_maturity_date
                      ? fmtDate(fdr.bank_confirmed_maturity_date)
                      : <span className="text-slate-400 italic">Awaiting</span>}
                  </Row>
                  <Row label="Lien to AICTE">
                    <span className={fdr.bank_confirmed_lien ? 'text-emerald-700' : fdr.bank_confirmed_lien === false ? 'text-rose-700' : ''}>
                      {fdr.bank_confirmed_lien == null
                        ? 'Declared only'
                        : fdr.bank_confirmed_lien ? 'Confirmed active' : 'NOT marked'}
                    </span>
                  </Row>
                  <Row label="Instrument Age">
                    {computed?.instrument_age_days != null ? `${computed.instrument_age_days} days` : '—'}
                  </Row>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider block mb-1">Current Status Remarks</span>
                <p className="text-slate-800 leading-relaxed">{fdr.status_remarks || '—'}</p>
              </div>

              {/* Renewal lineage */}
              {dossier && dossier.lineage.chain.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-purple-600" /> No-Gap Renewal Lineage
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {dossier.lineage.chain.map((link, i) => link && (
                      <React.Fragment key={link.id}>
                        {i > 0 && <span className="text-slate-400">→</span>}
                        <div className={`px-3 py-2 rounded-xl border text-[11px] ${
                          link.id === fdr.id ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-300' : 'bg-white border-slate-200'
                        }`}>
                          <div className="font-mono font-bold text-slate-900">{link.fdr_number}</div>
                          <div className="text-slate-500">{inr(link.amount)} &bull; {link.status}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Officer scrutiny desk */}
              {currentUser.role === 'AICTE_OFFICER' && (
                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-700" />
                    Regulation Bureau Officer Scrutiny Cockpit
                  </h4>
                  <textarea
                    rows={2}
                    value={scrutinyRemarks}
                    onChange={(e) => setScrutinyRemarks(e.target.value)}
                    placeholder="Enter scrutiny observations…"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleScrutinyAction('ACTIVE')} disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Mark Active
                    </button>
                    <button onClick={() => handleScrutinyAction('FLAGGED_MISMATCH')} disabled={submitting}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                      <AlertTriangle className="w-3.5 h-3.5" /> Flag Discrepancy
                    </button>
                    <button onClick={() => handleScrutinyAction('REJECTED')} disabled={submitting}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50">
                      Reject Submission
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===================== PROVENANCE & DSC ===================== */}
          {tab === 'provenance' && (
            <>
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Field Provenance &amp; Verification Match
                </h4>
                <span className="text-[10px] text-slate-500">Declared vs Bank-Confirmed</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">Field</th>
                      <th className="py-2.5 px-3">Declared by College</th>
                      <th className="py-2.5 px-3">Bank DSC Confirmed</th>
                      <th className="py-2.5 px-3">Trust Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fdr.provenances.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-700 capitalize">{p.field_key.replace(/_/g, ' ')}</td>
                        <td className="py-2.5 px-3 text-slate-800">{p.declared_val}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {p.bank_val || <span className="text-slate-400 italic">Awaiting Confirmation</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.trust_tag === 'MISMATCH' ? (
                            <span className="badge-mismatch inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Mismatch</span>
                          ) : p.trust_tag === 'OFFICER_VERIFIED' ? (
                            <span className="badge-officer-verified inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Officer Verified</span>
                          ) : p.trust_tag === 'BANK_CONFIRMED' ? (
                            <span className="badge-bank-confirmed inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Bank Confirmed</span>
                          ) : (
                            <span className="badge-declared">Declared Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {fdr.provenances.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-400">No provenance records.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {verification ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-emerald-950 font-bold flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      Bank Nodal Officer DSC Attestation Record
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                      Serial: {verification.dsc_cert_serial}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Row label="Signer DN">{verification.dsc_signer_dn}</Row>
                    <Row label="Certificate Issuer">{verification.dsc_cert_issuer}</Row>
                    <Row label="Attesting Officer">{verification.nodal_officer_name}</Row>
                    <Row label="Bank / IFSC">{verification.bank_name} &bull; <span className="font-mono">{verification.branch_ifsc}</span></Row>
                    <Row label="Confirmed Amount">{inr(verification.confirmed_amount)}</Row>
                    <Row label="Confirmed Maturity">{fmtDate(verification.confirmed_maturity_date)}</Row>
                    <Row label="CBS Status">{verification.confirmed_fdr_status}</Row>
                    <Row label="AICTE Lien Pledged">
                      <strong className={verification.confirmed_lien_to_aicte ? 'text-emerald-700' : 'text-rose-700'}>
                        {verification.confirmed_lien_to_aicte ? 'YES (Active)' : 'NO (Unencumbered)'}
                      </strong>
                    </Row>
                    <Row label="Signed At">{fmtDateTime(verification.dsc_timestamp)}</Row>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block mb-0.5">Signature (SHA-256 / PKCS#7)</span>
                    <code className="block bg-white border border-emerald-200 rounded p-2 text-[10px] text-slate-700 break-all">
                      {verification.dsc_signature_hex}
                    </code>
                  </div>
                  {verification.discrepancies && (
                    <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-900">
                      <strong className="block mb-1">Discrepancies recorded at attestation:</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {(() => {
                          try { return JSON.parse(verification.discrepancies).map((d: string, i: number) => <li key={i}>{d}</li>); }
                          catch { return <li>{verification.discrepancies}</li>; }
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <strong className="block text-slate-800">One-Time 15-Day Bank Verification Dispatched</strong>
                    <span className="text-slate-500 text-[11px]">
                      Token active until {fmtDateTime(fdr.verification_expires_at)}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenQR(fdr.verification_token, fdr.fdr_number)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5" /> View Bank QR Link
                  </button>
                </div>
              )}
            </>
          )}

          {/* ===================== INSTITUTION ===================== */}
          {tab === 'institution' && (
            institution ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Stat label="Total FDRs on Record" value={institution.total_fdrs} icon={<FileText className="w-3 h-3" />} />
                  <Stat label="Total Deposit Value" value={inr(institution.total_deposit_value)} tone="text-blue-900" />
                  <Stat label="AICTE Permanent ID" value={<span className="font-mono text-xs">{institution.aicte_id}</span>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" /> Institution Record
                    </h4>
                    <Row label="Name">{institution.name}</Row>
                    <Row label="Type">{institution.institute_type}</Row>
                    <Row label="City">{institution.city}</Row>
                    <Row label="State">{institution.state}</Row>
                    <Row label="Registered On">{fmtDate(institution.registered_on)}</Row>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" /> Contact &amp; Address
                    </h4>
                    <Row label="Contact Office">{institution.contact_person || '—'}</Row>
                    <Row label="Email">{institution.email}</Row>
                    <Row label="Phone">{institution.phone || '—'}</Row>
                    <Row label="Registered Address">{institution.address || '—'}</Row>
                  </div>
                </div>
              </>
            ) : !loading && <div className="py-8 text-center text-slate-400">No institution record linked.</div>
          )}

          {/* ===================== LIFECYCLE HISTORY ===================== */}
          {tab === 'history' && dossier && (
            <>
              {/* Hash-chained action timeline */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  Hash-Chained Action History ({dossier.audit_timeline.length})
                </h4>
                {dossier.audit_timeline.length === 0 ? (
                  <p className="text-slate-400 py-3">No audit blocks recorded for this instrument yet.</p>
                ) : (
                  <div className="space-y-2">
                    {dossier.audit_timeline.map(b => (
                      <div key={b.block_index} className="border border-slate-200 rounded-xl p-3 bg-white hover:border-slate-300">
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <div className="flex items-start gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                              #{b.block_index}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{b.action.replace(/_/g, ' ')}</div>
                              <div className="text-[11px] text-slate-500">
                                {b.actor_name} <span className="text-slate-400">({b.actor_role})</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-mono text-slate-500">{fmtDateTime(b.timestamp)}</div>
                            <button
                              onClick={() => setExpandedBlock(expandedBlock === b.block_index ? null : b.block_index)}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              {expandedBlock === b.block_index ? 'Hide payload' : 'Inspect payload'}
                            </button>
                          </div>
                        </div>
                        {expandedBlock === b.block_index && (
                          <div className="mt-2 space-y-2">
                            <pre className="p-2.5 bg-slate-900 text-emerald-300 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap">
                              {(() => {
                                try { return JSON.stringify(JSON.parse(b.details), null, 2); }
                                catch { return b.details; }
                              })()}
                            </pre>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10px]">
                              <div><span className="text-slate-400 block">Previous hash</span><span className="text-slate-600 break-all">{b.previous_hash}</span></div>
                              <div><span className="text-slate-400 block">Block hash</span><span className="text-blue-700 break-all">{b.block_hash}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Release applications */}
              {dossier.releases.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Release / Refund Applications ({dossier.releases.length})
                  </h4>
                  {dossier.releases.map(r => (
                    <div key={r.id} className="border border-slate-200 rounded-xl p-3 space-y-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-900">{r.status.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] text-slate-500">Filed {fmtDateTime(r.created_at)}</span>
                      </div>
                      <p className="text-slate-700">{r.reason}</p>
                      {r.maker_name && <Row label="Maker Scrutiny">{r.maker_name} — {r.maker_remarks} <em className="text-slate-400">({fmtDate(r.maker_date)})</em></Row>}
                      {r.checker_name && <Row label="Checker Sanction">{r.checker_name} — {r.checker_remarks} <em className="text-slate-400">({fmtDate(r.checker_date)})</em></Row>}
                      {r.discharge_order_ref && <Row label="Discharge Order"><span className="font-mono text-purple-800">{r.discharge_order_ref}</span></Row>}
                      {r.bank_discharge_date && <Row label="Bank CBS Cleared">{fmtDateTime(r.bank_discharge_date)}</Row>}
                    </div>
                  ))}
                </div>
              )}

              {/* Alerts raised on this instrument */}
              {dossier.alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-600" /> Alerts Raised ({dossier.alerts.length})
                  </h4>
                  {dossier.alerts.map(a => (
                    <div key={a.id} className={`border rounded-xl p-2.5 ${
                      a.severity === 'CRITICAL' ? 'bg-rose-50 border-rose-200'
                        : a.severity === 'WARNING' ? 'bg-amber-50 border-amber-200'
                          : a.severity === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <strong className="text-slate-900">{a.title}</strong>
                        <span className="text-[10px] text-slate-500">{fmtDateTime(a.created_at)} &bull; to {a.recipient}</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Official notices linked to this instrument */}
              {dossier.notices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Official Notices ({dossier.notices.length})
                  </h4>
                  {dossier.notices.map(n => (
                    <div key={n.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <strong className="text-slate-900">{n.subject}</strong>
                        <span className="text-[10px] text-slate-500">{fmtDateTime(n.created_at)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mb-1">
                        {n.sender_name} → {n.recipient_name} &bull; {n.message_type.replace(/_/g, ' ')}
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===================== DOCUMENT & OCR ===================== */}
          {tab === 'document' && (
            <>
              {document?.stored_path ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex-wrap">
                  <span className="flex items-center gap-2 text-slate-800 font-medium">
                    <FileText className="w-4 h-4 text-slate-500" />
                    {document.filename}
                  </span>
                  <a
                    href={api.documentUrl(document.stored_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> View / Download
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                  {document?.filename
                    ? <>Recorded filename <strong className="text-slate-700">{document.filename}</strong>, but no stored file is attached to this record.</>
                    : 'No document attached to this instrument.'}
                </div>
              )}

              {document?.ocr ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ScanLine className="w-3.5 h-3.5 text-blue-600" /> Recorded Extraction
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Method" value={document.ocr.method === 'PDF_TEXT_LAYER' ? 'PDF text layer' : 'OCR'} />
                    <Stat label="Fields Detected" value={`${document.ocr.detected_count}/${document.ocr.total_fields}`} />
                    <Stat label="Confidence" value={document.ocr.ocr_confidence != null ? `${(document.ocr.ocr_confidence * 100).toFixed(1)}%` : '—'} />
                    <Stat label="Pages" value={document.ocr.pages || '—'} />
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-600 font-bold text-[11px]">
                          <th className="py-2 px-3">Field Read From Document</th>
                          <th className="py-2 px-3">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(document.ocr.extracted_fields).map(([k, v]) => (
                          <tr key={k}>
                            <td className="py-2 px-3 capitalize text-slate-600">{k.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {v === null || v === '' ? <span className="text-slate-400 italic">not detected</span> : String(v)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {document.ocr.raw_text && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Raw Extracted Text</span>
                      <pre className="p-2.5 bg-slate-900 text-emerald-300 rounded-lg text-[10px] max-h-56 overflow-auto whitespace-pre-wrap">
                        {document.ocr.raw_text}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                !loading && <p className="text-slate-400">No extraction record stored for this instrument.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
