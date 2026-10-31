import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertCircle, 
  Eye, 
  QrCode, 
  RefreshCw, 
  FileCheck, 
  Clock, 
  AlertTriangle,
  Building,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { FDR, User } from '../types';

interface FDRRepositoryViewProps {
  fdrs: FDR[];
  currentUser: User;
  onSelectFDR: (fdr: FDR) => void;
  onOpenBankQR: (token: string, fdrNumber: string) => void;
  onInitiateRenewal: (fdr: FDR) => void;
  onApplyRelease: (fdr: FDR) => void;
  onScrutinize: (fdr: FDR) => void;
}

export const FDRRepositoryView: React.FC<FDRRepositoryViewProps> = ({
  fdrs,
  currentUser,
  onSelectFDR,
  onOpenBankQR,
  onInitiateRenewal,
  onApplyRelease,
  onScrutinize,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');

  const filteredFDRs = fdrs.filter(f => {
    const matchesSearch = 
      f.fdr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.institution_name && f.institution_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.aicte_id && f.aicte_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.issuing_bank.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesBank = bankFilter === 'ALL' || f.issuing_bank === bankFilter;

    return matchesSearch && matchesStatus && matchesBank;
  });

  const uniqueBanks = Array.from(new Set(fdrs.map(f => f.issuing_bank)));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> ACTIVE & COMPLIANT</span>;
      case 'EXPIRING_SOON':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3" /> EXPIRING SOON</span>;
      case 'PENDING_VERIFICATION':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1"><Clock className="w-3 h-3" /> AWAITING BANK DSC</span>;
      case 'FLAGGED_MISMATCH':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> MISMATCH FLAGGED</span>;
      case 'MATURED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-900 border border-red-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> MATURED / UNRENEWED</span>;
      case 'RENEWAL_IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> RENEWAL IN PROGRESS</span>;
      case 'RENEWED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">REPLACED & RENEWED</span>;
      case 'RELEASE_REQUESTED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">RELEASE REQUESTED</span>;
      case 'RELEASE_MAKER_RECOMMENDED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">MAKER RECOMMENDED</span>;
      case 'RELEASE_CHECKER_APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">RELEASE SANCTIONED</span>;
      case 'RELEASED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800">LIEN DISCHARGED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Control Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Centralized Security Deposit & FDR Repository
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
              {filteredFDRs.length} Instruments
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single digital registry for AICTE Regulation Bureau, Regional Offices, Technical Institutions, and Issuing Banks.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search FDR, College, AICTE ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active & Compliant</option>
            <option value="EXPIRING_SOON">Expiring Soon (15-60 Days)</option>
            <option value="PENDING_VERIFICATION">Pending Bank DSC</option>
            <option value="FLAGGED_MISMATCH">Mismatch Flagged</option>
            <option value="MATURED">Matured / Overdue</option>
            <option value="RENEWAL_IN_PROGRESS">Renewal In Progress</option>
            <option value="RELEASE_REQUESTED">Release Requested</option>
          </select>

          {/* Bank Filter */}
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Issuing Banks</option>
            {uniqueBanks.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
              <th className="py-3 px-4">FDR Receipt & Purpose</th>
              <th className="py-3 px-4">Technical Institution</th>
              <th className="py-3 px-4">Issuing Bank & Branch</th>
              <th className="py-3 px-4">Principal Amount</th>
              <th className="py-3 px-4">Maturity Date</th>
              <th className="py-3 px-4">Trust Provenance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFDRs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No FDR records match your active filters.
                </td>
              </tr>
            ) : (
              filteredFDRs.map(f => {
                const amount = f.bank_confirmed_amount || f.declared_amount;
                const hasBankConfirm = f.bank_confirmed_amount !== null && f.bank_confirmed_amount !== undefined;
                const isMismatch = f.status === 'FLAGGED_MISMATCH';

                return (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* FDR Number & Purpose */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {f.fdr_number}
                        {f.previous_fdr_id && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-mono" title="No-Gap Renewal child">
                            Renewed
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs" title={f.purpose}>
                        {f.purpose}
                      </div>
                    </td>

                    {/* Institution */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{f.institution_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">ID: {f.aicte_id}</div>
                    </td>

                    {/* Bank */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{f.issuing_bank}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{f.branch_name}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Tenure: {f.tenure_months} Mo ({f.interest_rate}%)
                      </div>
                    </td>

                    {/* Maturity Date */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {f.bank_confirmed_maturity_date || f.declared_maturity_date}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Issued: {f.issue_date}
                      </div>
                    </td>

                    {/* Provenance Tag (Declared vs Bank-Confirmed) */}
                    <td className="py-3 px-4">
                      {isMismatch ? (
                        <span className="badge-mismatch inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Mismatch
                        </span>
                      ) : hasBankConfirm ? (
                        <span className="badge-bank-confirmed inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Bank DSC Signed
                        </span>
                      ) : (
                        <span className="badge-declared inline-flex items-center gap-1">
                          Declared Only
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(f.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Inspect Details */}
                        <button
                          onClick={() => onSelectFDR(f)}
                          title="Inspect Full Instrument & Field Provenance"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Bank QR link */}
                        <button
                          onClick={() => onOpenBankQR(f.verification_token, f.fdr_number)}
                          title="View One-Time Bank QR Code & Verification Link"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Officer Scrutiny (if Maker/Checker) */}
                        {(currentUser.role === 'AICTE_MAKER' || currentUser.role === 'AICTE_CHECKER') && (
                          <button
                            onClick={() => onScrutinize(f)}
                            title="Scrutiny Decision"
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        )}

                        {/* No-Gap Renewal Action */}
                        {(f.status === 'EXPIRING_SOON' || f.status === 'ACTIVE' || f.status === 'MATURED') && (
                          <button
                            onClick={() => onInitiateRenewal(f)}
                            title="Submit No-Gap Renewal FDR"
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
