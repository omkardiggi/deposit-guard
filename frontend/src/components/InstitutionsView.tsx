import React, { useState, useMemo } from 'react';
import {
  Building, Search, FileText, FileX2, ShieldCheck, ShieldAlert,
  AlertTriangle, ChevronRight, MapPin
} from 'lucide-react';
import { Institution, FDR } from '../types';

interface InstitutionsViewProps {
  institutions: Institution[];
  fdrs: FDR[];
  onSelectInstitution: (id: string) => void;
}

const inr = (n: number) => `₹ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const MISMATCH_STATUSES = new Set(['FLAGGED_MISMATCH']);
const CLOSED_STATUSES = new Set(['RELEASED', 'RENEWED', 'REJECTED']);

/**
 * Registry of technical institutions. Headline counters are derived from the
 * FDR list already in memory so the grid renders instantly; clicking through
 * loads the authoritative per-institution summary from the backend.
 */
export const InstitutionsView: React.FC<InstitutionsViewProps> = ({
  institutions,
  fdrs,
  onSelectInstitution,
}) => {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return institutions.map(inst => {
      const own = fdrs.filter(f => f.institution_id === inst.id);
      const withDoc = own.filter(f => !!f.document_path).length;
      const verified = own.filter(f => (f.verifications?.length || 0) > 0).length;
      const flagged = own.filter(f =>
        MISMATCH_STATUSES.has(f.status) ||
        (f.provenances || []).some(p => p.trust_tag === 'MISMATCH')
      ).length;
      const live = own
        .filter(f => !CLOSED_STATUSES.has(f.status))
        .reduce((sum, f) => sum + (f.bank_confirmed_amount ?? f.declared_amount ?? 0), 0);

      return {
        inst,
        total: own.length,
        withDoc,
        missingDoc: own.length - withDoc,
        verified,
        flagged,
        live,
      };
    });
  }, [institutions, fdrs]);

  const term = query.trim().toLowerCase();
  const filtered = term
    ? rows.filter(r =>
        r.inst.name.toLowerCase().includes(term) ||
        r.inst.aicte_id.toLowerCase().includes(term) ||
        r.inst.city.toLowerCase().includes(term) ||
        r.inst.state.toLowerCase().includes(term))
    : rows;

  const totals = rows.reduce(
    (acc, r) => ({
      instruments: acc.instruments + r.total,
      missingDoc: acc.missingDoc + r.missingDoc,
      flagged: acc.flagged + r.flagged,
      live: acc.live + r.live,
    }),
    { instruments: 0, missingDoc: 0, flagged: 0, live: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Institution Registry &amp; Deposit Compliance
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an institution to review its document upload status, bank verification
              position and every declared mismatch across its security deposits.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
              {institutions.length} institutions &bull; {totals.instruments} instruments
            </span>
            {totals.missingDoc > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                {totals.missingDoc} missing documents
              </span>
            )}
            {totals.flagged > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 font-semibold">
                {totals.flagged} flagged
              </span>
            )}
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by institution name, AICTE ID, city or state…"
            className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          <Building className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No institution matches “{query}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(r => {
            const hasIssue = r.flagged > 0;
            const needsDoc = r.missingDoc > 0;
            return (
              <button
                key={r.inst.id}
                onClick={() => onSelectInstitution(r.inst.id)}
                className={`text-left bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all group ${
                  hasIssue ? 'border-rose-200 hover:border-rose-400'
                    : needsDoc ? 'border-amber-200 hover:border-amber-400'
                      : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 truncate">
                      {r.inst.name}
                    </h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono">{r.inst.aicte_id}</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />{r.inst.city}, {r.inst.state}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{r.inst.institute_type}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 flex-shrink-0" />
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Instruments</div>
                    <div className="font-black text-slate-900">{r.total}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Live Cover</div>
                    <div className="font-black text-blue-900">{inr(r.live)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Verified</div>
                    <div className="font-black text-slate-900">{r.verified}/{r.total}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.total === 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                      No deposits on record
                    </span>
                  ) : (
                    <>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                        r.missingDoc === 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {r.missingDoc === 0
                          ? <><FileText className="w-3 h-3" /> All {r.withDoc} documents uploaded</>
                          : <><FileX2 className="w-3 h-3" /> {r.missingDoc} document(s) missing</>}
                      </span>

                      {r.flagged > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> {r.flagged} mismatch flagged
                        </span>
                      ) : r.verified === r.total && r.total > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Fully bank-verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {r.total - r.verified} awaiting attestation
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
