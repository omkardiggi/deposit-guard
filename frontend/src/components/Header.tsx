import React from 'react';
import { ShieldCheck, Bell, RefreshCw, Landmark, UserCheck, AlertTriangle } from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (username: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAlerts: () => void;
  unreadAlertCount: number;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  activeTab,
  setActiveTab,
  onOpenAlerts,
  unreadAlertCount,
  onRefreshData
}) => {
  const personas = [
    { label: 'AICTE Maker (Scrutiny)', username: 'maker_aicte', role: 'AICTE_MAKER', badgeColor: 'bg-blue-100 text-blue-800' },
    { label: 'AICTE Checker (Member Secy)', username: 'checker_aicte', role: 'AICTE_CHECKER', badgeColor: 'bg-purple-100 text-purple-800' },
    { label: 'Technical Institution (VJTI)', username: 'college_vjti', role: 'INSTITUTION', badgeColor: 'bg-amber-100 text-amber-800' },
    { label: 'Bank Nodal Officer (SBI)', username: 'bank_nodal_sbi', role: 'BANK_OFFICER', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { label: 'Auditor & CAG', username: 'cag_auditor', role: 'AUDITOR', badgeColor: 'bg-rose-100 text-rose-800' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Govt Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-6 py-1.5 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-white tracking-wide">भारत सरकार | Government of India</span>
          <span className="text-slate-600">|</span>
          <span>Ministry of Education &bull; AICTE Regulation Bureau</span>
          <span className="text-slate-600">|</span>
          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold">SIH2026: SIH26265</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-slate-400">Team: <strong className="text-white">CODECREWW$</strong> (ID: 199121)</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Bank DSC Ledger: Connected
          </span>
        </div>
      </div>

      {/* Main Brand & Persona Switcher */}
      <div className="px-6 py-3 flex flex-wrap justify-between items-center gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                DepositGuard
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  AICTE v2.4
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Centralized Security Deposit & FDR Management Portal with Digital Bank Attestation
            </p>
          </div>
        </div>

        {/* Quick Demo Persona Switcher */}
        <div className="flex items-center space-x-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner">
          <span className="text-xs font-semibold text-slate-500 pl-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Demo Persona:
          </span>
          <div className="flex space-x-1">
            {personas.map((p) => {
              const isSelected = currentUser.username === p.username;
              return (
                <button
                  key={p.username}
                  onClick={() => onSwitchUser(p.username)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Switch to ${p.label}`}
                >
                  {p.label.split(' ')[0]} {p.label.includes('Maker') ? '(Maker)' : p.label.includes('Checker') ? '(Checker)' : p.label.includes('Bank') ? '(Bank)' : p.label.includes('CAG') ? '(CAG)' : '(Inst)'}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefreshData}
            title="Refresh All Records"
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors ml-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="View Smart Maturity & Regulatory Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 flex space-x-1 border-t border-slate-100 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Overview & Dashboard' },
          { id: 'repository', label: 'Centralized FDR Repository' },
          { id: 'bank-portal', label: 'Bank Verification Desk' },
          { id: 'no-gap-renewal', label: 'No-Gap Renewal' },
          { id: 'lien-release', label: 'Lien Release (Maker-Checker)' },
          { id: 'audit-trail', label: 'Tamper-Proof Audit Chain' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-700 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
