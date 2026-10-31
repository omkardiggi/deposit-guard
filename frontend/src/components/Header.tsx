import React from 'react';
import { ShieldCheck, Bell, RefreshCw, MessageSquare, Landmark, LogOut } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  onOpenAlerts: () => void;
  unreadAlertCount: number;
  unreadMessageCount: number;
  onRefreshData: () => void;
  onNavigateToMessages: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenAlerts,
  unreadAlertCount,
  unreadMessageCount,
  onRefreshData,
  onNavigateToMessages,
}) => {
  const isAicte = currentUser.role === 'AICTE_OFFICER';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Govt Bar */}
      <div className="bg-slate-950 text-slate-300 text-xs px-6 py-1.5 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-white tracking-wide">भारत सरकार | Government of India</span>
          <span className="text-slate-600">|</span>
          <span>Ministry of Education &bull; AICTE Regulation Bureau</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Institutional Security Deposit &amp; FDR Portal</span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            IT Act 2000 &bull; Section 4/5 Verified
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">CBS Status: <strong className="text-white">Active</strong></span>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="px-6 py-2.5 flex flex-wrap justify-between items-center gap-4 bg-white">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
            isAicte ? 'bg-gradient-to-br from-blue-700 to-indigo-900' : 'bg-gradient-to-br from-emerald-600 to-teal-800'
          }`}>
            {isAicte ? <ShieldCheck className="w-6 h-6 text-amber-400" /> : <Landmark className="w-6 h-6 text-emerald-200" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                DepositGuard
              </h1>
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                isAicte ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {isAicte ? 'AICTE Regulation Bureau' : `${currentUser.bank_name || 'Issuing Bank'} Nodal Cell`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Signed in as: <strong className="text-slate-800">{currentUser.full_name}</strong> ({currentUser.designation})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Messages Button with Live Unread Badge */}
          <button
            onClick={onNavigateToMessages}
            className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-200"
            title="Two-Way Official Communications"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadMessageCount}
              </span>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors border border-slate-200"
            title="View Regulatory & Maturity Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            title="Refresh All Records"
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sign Out to Landing Page"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
