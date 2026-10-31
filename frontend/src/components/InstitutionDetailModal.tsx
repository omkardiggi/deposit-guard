import React, { useState, useEffect } from 'react';
import {
  X, Building, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  FileText, FileX2, Loader2, Bell, History, ExternalLink, Download,
  Info, TrendingUp, ScanLine
} from 'lucide-react';
import { InstitutionSummary, InstitutionFinding } from '../types';
import { api } from '../services/api';

interface InstitutionDetailModalProps {
  institutionId: string | null;
  onClose: () => void;
  onOpenFDR?: (fdrId: string) => void;
  refreshKey?: number;
}

const inr = (n?: number | null) =>
  n == null ? '—' : `₹ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const POSTURE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  COMPLIANT: {
    label: 'Compliant',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  ATTENTION_REQUIRED: {
    label: 'Attention Required',
    cls: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  NON_COMPLIANT: {
    label: 'Non-Compliant',
    cls: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: <ShieldAlert className="w-4 h-4" />,
  },
  NO_RECORDS: {
    label: 'No Deposits on Record',
    cls: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: <Info className="w-4 h-4" />,
  },
};

const SEVERITY: Record<string, string> = {
  CRITICAL: 'bg-rose-50 border-rose-300 text-rose-900',
  WARNING: 'bg-amber-50 border-amber-300 text-amber-900',
  INFO: 'bg-slate-50 border-slate-200 text-slate-700',
};

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({
  label, value, tone = 'text-slate-900',
}) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
    <div className={`text-sm font-black mt-0.5 ${tone}`}>{value}</div>
  </div>
);

export const InstitutionDetailModal: React.FC<InstitutionDetailModalProps> = ({
  institutionId,
  onClose,
  onOpenFDR,
  refreshKey = 0,
}) => {
  const [data, setData] = useState<InstitutionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch when a different institution is opened, or when anything in the
  // app changes (refreshKey) so this view never shows stale state.
  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getInstitutionSummary(institutionId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message || 'Could not load institution'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [institutionId, refreshKey]);

  if (!institutionId) return null;

  const s = data?.summary;
  const inst = data?.institution;
  const posture = s ? POSTURE[s.compliance_posture] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl my-8">

        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 p-6 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Building className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-base font-black text-slate-900">{inst?.name || 'Institution'}</h3>
              {posture && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${posture.cls}`}>
                  {posture.icon} {posture.label}
                </span>
              )}
            </div>
            {inst && (
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-mono">{inst.aicte_id}</span> &bull; {inst.institute_type} &bull; {inst.city}, {inst.state}
              </p>
            )}
            {s && <p className="text-xs font-semibold text-slate-700 mt-1">{s.headline}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {loading && (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading institution record…</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {data && s && (
            <>
              {/* ---------- AICTE officer summary ---------- */}
              <section className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Summary for AICTE Officer
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Instruments" value={s.total_instruments} />
                  <Stat
                    label="Documents Uploaded"
                    value={`${s.documents_uploaded}/${s.total_instruments} (${s.document_compliance_percent}%)`}
                    tone={s.documents_missing > 0 ? 'text-amber-700' : 'text-emerald-700'}
                  />
                  <Stat
                    label="Bank Verified"
                    value={`${s.bank_verified_count}/${s.total_instruments}`}
                    tone={s.bank_verified_count < s.total_instruments ? 'text-amber-700' : 'text-emerald-700'}
                  />
                  <Stat
                    label="Critical Findings"
                    value={s.critical_findings}
                    tone={s.critical_findings > 0 ? 'text-rose-700' : 'text-emerald-700'}
                  />
                  <Stat label="Declared Total" value={inr(s.declared_total)} />
                  <Stat label="Bank Confirmed" value={inr(s.bank_confirmed_total)} />
                  <Stat
                    label="Amount Variance"
                    value={inr(s.amount_variance)}
                    tone={s.amount_variance !== 0 ? 'text-rose-700' : 'text-emerald-700'}
                  />
                  <Stat label="Live Deposit Cover" value={inr(s.live_deposit_cover)} tone="text-blue-900" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {s.expiring_within_60_days > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                      {s.expiring_within_60_days} maturing within 60 days
                    </span>
                  )}
                  {s.matured_count > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 font-semibold">
                      {s.matured_count} already matured
                    </span>
                  )}
                  {Object.entries(s.status_breakdown).map(([k, v]) => (
                    <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                      {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                    </span>
                  ))}
                </div>
              </section>

              {/* ---------- Declared mismatches / deficiencies ---------- */}
              <section className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Declared Mismatches &amp; Deficiencies ({data.findings.length})
                </h4>
                {data.findings.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    No mismatches or deficiencies found. All deposits are documented and bank-verified.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.findings.map((f: InstitutionFinding, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${SEVERITY[f.severity] || SEVERITY.INFO}`}>
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <span className="font-bold flex items-center gap-1.5">
                            {f.severity === 'CRITICAL'
                              ? <ShieldAlert className="w-3.5 h-3.5" />
                              : f.severity === 'WARNING'
                                ? <AlertTriangle className="w-3.5 h-3.5" />
                                : <Info className="w-3.5 h-3.5" />}
                            {f.title}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/70 border border-current/20">
                              {f.code}
                            </span>
                            {f.fdr_id && onOpenFDR && (
                              <button
                                onClick={() => onOpenFDR(f.fdr_id!)}
                                className="text-[11px] font-bold underline hover:no-underline flex items-center gap-1"
                              >
                                Open <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 leading-relaxed">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ---------- Instruments + document upload status ---------- */}
              <section className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Deposits &amp; Document Upload Status ({data.instruments.length})
                </h4>
                {data.instruments.length === 0 ? (
                  <p className="text-slate-400 py-3">No deposits recorded for this institution.</p>
                ) : (
                  <div className="space-y-2">
                    {data.instruments.map(it => {
                      const m = it.document.institution_match;
                      return (
                        <div key={it.id} className="border border-slate-200 rounded-xl p-3 hover:border-slate-300 bg-white">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => onOpenFDR?.(it.id)}
                                  className="font-mono font-bold text-slate-900 hover:text-blue-700 hover:underline"
                                >
                                  {it.fdr_number}
                                </button>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {it.status.replace(/_/g, ' ')}
                                </span>
                                {it.is_bank_verified && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    DSC Verified
                                  </span>
                                )}
                                {it.mismatch_count > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    {it.mismatch_count} field mismatch
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {it.issuing_bank} &bull; {it.purpose}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-bold text-slate-900">
                                {inr(it.bank_confirmed_amount ?? it.declared_amount)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {it.days_to_maturity == null
                                  ? '—'
                                  : it.days_to_maturity <= 0
                                    ? <span className="text-rose-700 font-semibold">Matured {Math.abs(it.days_to_maturity)}d ago</span>
                                    : `Matures in ${it.days_to_maturity}d`}
                              </div>
                            </div>
                          </div>

                          {/* Document status strip */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                            {it.document.uploaded ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                  <FileText className="w-3.5 h-3.5" /> Document uploaded
                                </span>
                                <span className="text-slate-500 truncate max-w-[180px]">{it.document.filename}</span>
                                {it.document.fields_detected != null && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <ScanLine className="w-3 h-3" />
                                    {it.document.fields_detected}/{it.document.fields_total} fields
                                    {it.document.ocr_confidence != null &&
                                      ` · ${(it.document.ocr_confidence * 100).toFixed(0)}%`}
                                  </span>
                                )}
                                {m && (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                    m.verdict === 'MATCH' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : m.verdict === 'PARTIAL' ? 'bg-amber-50 text-amber-900 border-amber-200'
                                        : m.verdict === 'NO_MATCH' ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`} title={m.reason}>
                                    Institution {m.verdict.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                                <FileX2 className="w-3.5 h-3.5" /> No document uploaded
                              </span>
                            )}

                            {it.document.download_url && it.document.stored_path && (
                              <a
                                href={api.documentUrl(it.document.stored_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 flex-shrink-0"
                              >
                                <Download className="w-3.5 h-3.5" /> View
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ---------- Contact record ---------- */}
              {inst && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1">Contact Record</h4>
                    <div className="flex justify-between"><span className="text-slate-500">Office</span><span className="font-medium">{inst.contact_person || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{inst.email}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{inst.phone || '—'}</span></div>
                    <div className="pt-1"><span className="text-slate-500 block">Address</span><span className="font-medium">{inst.address || '—'}</span></div>
                  </div>

                  {data.recent_activity.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                        <History className="w-3 h-3" /> Recent Activity
                      </h4>
                      <div className="space-y-1 max-h-44 overflow-y-auto">
                        {data.recent_activity.map(a => (
                          <div key={a.block_index} className="flex justify-between gap-2 border-b border-slate-200 last:border-0 py-1">
                            <span className="text-slate-800 font-medium">{a.action.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {new Date(a.timestamp).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ---------- Alerts ---------- */}
              {data.alerts.length > 0 && (
                <section className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-600" /> Alerts ({data.alerts.length})
                  </h4>
                  {data.alerts.map(a => (
                    <div key={a.id} className={`p-2.5 rounded-xl border ${SEVERITY[a.severity] || SEVERITY.INFO}`}>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <strong>{a.title}</strong>
                        <span className="text-[10px] opacity-70">{new Date(a.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="mt-0.5">{a.message}</p>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
