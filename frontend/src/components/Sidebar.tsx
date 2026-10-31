import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Database, 
  RefreshCw, 
  FileCheck2, 
  MessageSquare, 
  Lock, 
  LogOut, 
  Landmark, 
  UserCheck, 
  Bell,
  Building2,
  FileSignature
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  unreadMessageCount: number;
  unreadAlertCount: number;
  onOpenAlerts: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  unreadMessageCount,
  unreadAlertCount,
  onOpenAlerts,
}) => {
  const isAicte = currentUser.role === 'AICTE_OFFICER';

  // Role-Specific Navigation Menus
  const aicteNavItems = [
    { id: 'dashboard', label: 'Overview & Analytics', icon: LayoutDashboard },
    { id: 'institutions', label: 'Institution Registry', icon: Building2 },
    { id: 'repository', label: 'Centralized FDR Registry', icon: Database },
    { id: 'no-gap-renewal', label: 'No-Gap Renewal Watch', icon: RefreshCw },
    { id: 'lien-release', label: 'Lien Release Sanction Desk', icon: FileCheck2 },
    { id: 'messages', label: 'Official Bank Notices', icon: MessageSquare, badge: unreadMessageCount },
    { id: 'audit-trail', label: 'Audit Ledger', icon: Lock },
  ];

  const bankNavItems = [
    { id: 'bank-portal', label: 'Bank Attestation Desk', icon: FileSignature },
    { id: 'repository', label: 'Bank Branch FDR Registry', icon: Database },
    { id: 'lien-release', label: 'CBS Lien Discharge Desk', icon: FileCheck2 },
    { id: 'messages', label: 'AICTE Direct Notices', icon: MessageSquare, badge: unreadMessageCount },
    { id: 'audit-trail', label: 'Audit Ledger', icon: Lock },
  ];

  const navItems = isAicte ? aicteNavItems : bankNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl flex-shrink-0">
      {/* Top Brand */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
          isAicte ? 'bg-gradient-to-br from-blue-600 to-indigo-800' : 'bg-gradient-to-br from-emerald-600 to-teal-800'
        }`}>
          {isAicte ? <ShieldCheck className="w-6 h-6 text-amber-400" /> : <Landmark className="w-6 h-6 text-emerald-200" />}
        </div>
        <div>
          <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
            DepositGuard
            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
              isAicte ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'
            }`}>
              {isAicte ? 'AICTE' : 'BANK'}
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
            {isAicte ? 'Regulation Bureau' : (currentUser.bank_name || 'Issuing Bank')}
          </p>
        </div>
      </div>

      {/* Role Badge Indicator */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex justify-between items-center text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          {isAicte ? <UserCheck className="w-3.5 h-3.5 text-blue-400" /> : <Building2 className="w-3.5 h-3.5 text-emerald-400" />}
          {isAicte ? 'AICTE Authority' : 'Bank Nodal Cell'}
        </span>
        <button
          onClick={onOpenAlerts}
          className="relative p-1 text-slate-400 hover:text-amber-400 transition-colors"
          title="View Regulatory Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadAlertCount}
            </span>
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
          {isAicte ? 'AICTE Bureau Modules' : 'Bank Nodal Modules'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? isAicte
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
            {currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{currentUser.full_name}</div>
            <div className="text-[10px] text-slate-400 truncate">{currentUser.designation}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 px-3 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 hover:border-rose-900/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit / Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

