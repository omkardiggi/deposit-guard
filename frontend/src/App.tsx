import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { FDRRepositoryView } from './components/FDRRepositoryView';
import { BankVerificationView } from './components/BankVerificationView';
import { NoGapRenewalView } from './components/NoGapRenewalView';
import { LienReleaseDeskView } from './components/LienReleaseDeskView';
import { AuditTrailView } from './components/AuditTrailView';
import { NewFDRModal } from './components/NewFDRModal';
import { FDRDetailsModal } from './components/FDRDetailsModal';
import { BankQRModal } from './components/BankQRModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { FDR, Institution, User, NotificationAlert, DashboardStats } from './types';
import { api } from './services/api';

export function App() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-maker-01',
    username: 'maker_aicte',
    role: 'AICTE_MAKER',
    full_name: 'Rajesh Sharma',
    designation: 'Assistant Director (Regulation Bureau)',
    email: 'rajesh.sharma@aicte-india.org'
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Modals & Drawers
  const [selectedFDR, setSelectedFDR] = useState<FDR | null>(null);
  const [isNewFDRModalOpen, setIsNewFDRModalOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ token: string | null; fdrNumber: string }>({ token: null, fdrNumber: '' });
  const [selectedBankToken, setSelectedBankToken] = useState<string | undefined>(undefined);
  const [preSelectedRenewalFDR, setPreSelectedRenewalFDR] = useState<FDR | null>(null);

  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      const [fdrsData, statsData, alertsData, instsData] = await Promise.all([
        api.getFDRs(),
        api.getDashboardStats(),
        api.getAlerts(),
        api.getInstitutions()
      ]);
      setFdrs(fdrsData);
      setStats(statsData);
      setAlerts(alertsData);
      setInstitutions(instsData);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchUser = async (username: string) => {
    try {
      const res = await api.login(username, 'password123');
      setCurrentUser(res.user);
      showToast(`Switched persona to: ${res.user.full_name} (${res.user.role})`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRunScheduler = async () => {
    setIsSchedulerRunning(true);
    try {
      const res = await api.runMaturityScheduler();
      showToast(`Maturity Watch Complete: Evaluated ${res.total_fdrs_evaluated} FDRs, Generated ${res.new_alerts_generated} alerts.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Scheduler failed');
    } finally {
      setIsSchedulerRunning(false);
    }
  };

  const handleMarkAlertRead = async (id: string) => {
    try {
      await api.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenBankQR = (token: string, fdrNumber: string) => {
    setQrModalData({ token, fdrNumber });
  };

  const handleNavigateToBankDesk = (token: string) => {
    setSelectedBankToken(token);
    setActiveTab('bank-portal');
  };

  const handleInitiateRenewal = (fdr: FDR) => {
    setPreSelectedRenewalFDR(fdr);
    setActiveTab('no-gap-renewal');
  };

  const handleApplyRelease = (fdr: FDR) => {
    setActiveTab('lien-release');
  };

  const handleSelectFDRById = (fdrId: string) => {
    const found = fdrs.find(f => f.id === fdrId);
    if (found) {
      setSelectedFDR(found);
    }
  };

  const unreadAlertCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Official Header */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
        unreadAlertCount={unreadAlertCount}
        onRefreshData={loadData}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            alerts={alerts}
            currentUser={currentUser}
            onOpenNewFDR={() => setIsNewFDRModalOpen(true)}
            onRunScheduler={handleRunScheduler}
            onNavigateTab={setActiveTab}
            onSelectFDR={handleSelectFDRById}
            isSchedulerRunning={isSchedulerRunning}
          />
        )}

        {activeTab === 'repository' && (
          <FDRRepositoryView
            fdrs={fdrs}
            currentUser={currentUser}
            onSelectFDR={(f) => setSelectedFDR(f)}
            onOpenBankQR={handleOpenBankQR}
            onInitiateRenewal={handleInitiateRenewal}
            onApplyRelease={handleApplyRelease}
            onScrutinize={(f) => setSelectedFDR(f)}
          />
        )}

        {activeTab === 'bank-portal' && (
          <BankVerificationView
            fdrs={fdrs}
            currentUser={currentUser}
            onRefreshData={loadData}
            selectedToken={selectedBankToken}
          />
        )}

        {activeTab === 'no-gap-renewal' && (
          <NoGapRenewalView
            fdrs={fdrs}
            currentUser={currentUser}
            onRefreshData={loadData}
            preSelectedFDR={preSelectedRenewalFDR}
          />
        )}

        {activeTab === 'lien-release' && (
          <LienReleaseDeskView
            currentUser={currentUser}
            onRefreshData={loadData}
            fdrs={fdrs}
          />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailView currentUser={currentUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-xs py-4 px-6 text-slate-500 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2">
          <span>&copy; 2026 <strong>AICTE Regulation Bureau</strong> &bull; Ministry of Education, Govt. of India</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
          <span>SIH2026 &bull; Problem Statement SIH26265</span>
          <span>&bull;</span>
          <span>Team: <strong>CODECREWW$</strong> (Team ID: 199121)</span>
          <span>&bull;</span>
          <span className="text-emerald-600 font-semibold">IT Act 2000 &bull; DPDP Act 2023 Compliant</span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <NewFDRModal
        isOpen={isNewFDRModalOpen}
        onClose={() => setIsNewFDRModalOpen(false)}
        institutions={institutions}
        onRefreshData={loadData}
      />

      <FDRDetailsModal
        fdr={selectedFDR}
        onClose={() => setSelectedFDR(null)}
        currentUser={currentUser}
        onOpenQR={handleOpenBankQR}
        onRefreshData={loadData}
      />

      <BankQRModal
        token={qrModalData.token}
        fdrNumber={qrModalData.fdrNumber}
        onClose={() => setQrModalData({ token: null, fdrNumber: '' })}
        onNavigateToBankDesk={handleNavigateToBankDesk}
      />

      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
        onMarkRead={handleMarkAlertRead}
        onRunScheduler={handleRunScheduler}
        isSchedulerRunning={isSchedulerRunning}
        onSelectFDR={handleSelectFDRById}
      />
    </div>
  );
}

export default App;
