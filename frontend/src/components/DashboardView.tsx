import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  FileCheck2, 
  TrendingUp, 
  Play, 
  PlusCircle, 
  Download, 
  CheckCircle2,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { DashboardStats, NotificationAlert, User } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  alerts: NotificationAlert[];
  currentUser: User;
  onOpenNewFDR: () => void;
  onRunScheduler: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectFDR: (fdrId: string) => void;
  isSchedulerRunning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  alerts,
  currentUser,
  onOpenNewFDR,
  onRunScheduler,
  onNavigateTab,
  onSelectFDR,
  isSchedulerRunning,
}) => {
  const urgentAlerts = alerts.filter(a => a.severity === 'CRITICAL' && !a.is_read).slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12"></div>
        <div className="relative z-10 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Live AICTE Regulation Bureau Oversight
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Institutional Security Deposit & FDR Monitoring
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Enforcing the <strong>AICTE Approval Process Handbook (2024–27)</strong> norms. Every instrument is tracked throughout its lifecycle with digital bank attestation, No-Gap Renewal protection, and SHA-256 tamper-proof audit trails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRunScheduler}
              disabled={isSchedulerRunning}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isSchedulerRunning ? 'animate-spin' : ''}`} />
              {isSchedulerRunning ? 'Evaluating...' : 'Run Daily Maturity Watch'}
            </button>
            <button
              onClick={onOpenNewFDR}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Submit New FDR
            </button>
            <a
              href="http://localhost:8000/api/dashboard/export-csv"
              download
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2.5 rounded-xl text-xs transition-all border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* Urgent Warning Alerts Strip */}
      {urgentAlerts.length > 0 && (
        <div className="space-y-2">
          {urgentAlerts.map(alert => (
            <div 
              key={alert.id}
              className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl flex items-start justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <BadgeAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">{alert.title}</h4>
                  <p className="text-xs text-rose-700 mt-0.5">{alert.message}</p>
                </div>
              </div>
              {alert.fdr_id && (
                <button
                  onClick={() => onSelectFDR(alert.fdr_id!)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex-shrink-0"
                >
                  Inspect Case
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pledged Capital</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">₹</div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹ {stats?.total_amount_crores ?? 0} <span className="text-sm font-semibold text-slate-500">Cr</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Earmarked in Joint AICTE Lien
          </p>
        </div>

        {/* Bank Verified Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Attestation Rate</span>
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.bank_verified_rate ?? 0}%
          </div>
          <p className="text-[11px] text-blue-700 mt-1 font-medium">
            {stats?.active_count ?? 0} active / {stats?.total_fdrs ?? 0} registered instruments
          </p>
        </div>

        {/* Expiring Soon */}
        <div 
          onClick={() => onNavigateTab('no-gap-renewal')}
          className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring (15-60 Days)</span>
            <Clock className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {stats?.expiring_soon_count ?? 0}
          </div>
          <p className="text-[11px] text-amber-800 mt-1 font-medium underline">
            No-Gap Renewal action required &rarr;
          </p>
        </div>

        {/* Flagged Discrepancies */}
        <div 
          onClick={() => onNavigateTab('repository')}
          className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Flagged Discrepancies</span>
            <AlertTriangle className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-900">
            {stats?.discrepancy_count ?? 0}
          </div>
          <p className="text-[11px] text-rose-800 mt-1 font-medium">
            Bank ledger deviations detected &rarr;
          </p>
        </div>
      </div>

      {/* 2nd Row: Workflow Statuses & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Architectural Pillars from Slide 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            DepositGuard Regulatory Trust Pillars
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <strong className="text-slate-800 block">1. Declared vs Bank-Confirmed:</strong>
              <span className="text-slate-600 text-[11px]">Every field carries a cryptographic provenance tag. Only bank-confirmed data counts as legally verified.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <strong className="text-slate-800 block">2. No-Gap Renewal Rule:</strong>
              <span className="text-slate-600 text-[11px]">Expiring FDRs cannot close or lapse until the issuing bank signs and confirms the replacement instrument.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <strong className="text-slate-800 block">3. Two-Officer Maker-Checker:</strong>
              <span className="text-slate-600 text-[11px]">Lien releases require scrutiny recommendation by Maker and final digital sanction by Competent Authority.</span>
            </div>
          </div>
        </div>

        {/* Operational Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Lifecycle Processing Pipeline
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Pending Bank Attestation:</span>
              <span className="font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{stats?.pending_bank_count ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '40%' }}></div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Lien Release Applications:</span>
              <span className="font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{stats?.release_requested_count ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: '25%' }}></div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Matured / Show-Cause Triggered:</span>
              <span className="font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">{stats?.matured_count ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-600 h-full rounded-full" style={{ width: '15%' }}></div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('lien-release')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
          >
            Review Maker-Checker Queue &rarr;
          </button>
        </div>

        {/* Bank Partner Integration Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Issuing Banks Integration Desk
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="font-medium text-slate-700">State Bank of India</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">DSC Active</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="font-medium text-slate-700">Punjab National Bank</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">DSC Active</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="font-medium text-slate-700">Bank of Baroda</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Mismatch Flags (1)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="font-medium text-slate-700">Canara Bank</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Pending 1-time Token</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('bank-portal')}
            className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-xl border border-blue-200 transition-colors"
          >
            Open Bank Nodal Officer Portal &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

