import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { FDRRepositoryView } from './components/FDRRepositoryView';
import { BankVerificationView } from './components/BankVerificationView';
import { NoGapRenewalView } from './components/NoGapRenewalView';
import { LienReleaseDeskView } from './components/LienReleaseDeskView';
import { AuditTrailView } from './components/AuditTrailView';
import { MessagesView } from './components/MessagesView';
import { InstitutionsView } from './components/InstitutionsView';
import { InstitutionDetailModal } from './components/InstitutionDetailModal';
import { NewFDRModal } from './components/NewFDRModal';
import { FDRDetailsModal } from './components/FDRDetailsModal';
import { BankQRModal } from './components/BankQRModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { FDR, Institution, User, NotificationAlert, DashboardStats, Message } from './types';
import { api, auth } from './services/api';

export function App() {
  // Restore a persisted session (real JWT + user) so a page refresh keeps the officer signed in.
  const persistedUser = auth.getToken() ? (auth.getUser() as User | null) : null;
  const [currentUser, setCurrentUser] = useState<User | null>(persistedUser);
  const [activeTab, setActiveTab] = useState<string>(
    persistedUser && persistedUser.role === 'BANK_OFFICER' ? 'bank-portal' : 'dashboard'
  );
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Modals & Drawers
  const [selectedFDR, setSelectedFDR] = useState<FDR | null>(null);
  const [isNewFDRModalOpen, setIsNewFDRModalOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ token: string | null; fdrNumber: string }>({ token: null, fdrNumber: '' });
  const [selectedBankToken, setSelectedBankToken] = useState<string | undefined>(undefined);
  const [preSelectedRenewalFDR, setPreSelectedRenewalFDR] = useState<FDR | null>(null);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);

  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bumped after every successful data load. Views that fetch their own data
  // (institution summary, FDR dossier, releases, messages, audit chain) take
  // this as a dependency, so one change anywhere refreshes everything.
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      const [fdrsData, statsData, alertsData, instsData] = await Promise.all([
        api.getFDRs(),
        api.getDashboardStats(),
        api.getAlerts(currentUser ? { recipient: currentUser.role } : undefined),
        api.getInstitutions()
      ]);
      setFdrs(fdrsData);
      setStats(statsData);
      setAlerts(alertsData);
      setInstitutions(instsData);

      if (currentUser) {
        const msgs = await api.getMessages({ role: currentUser.role });
        setMessages(msgs);
      }
      // Signal every self-fetching view to reload too.
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'AICTE_OFFICER' ? 'dashboard' : 'bank-portal');
    showToast(`Welcome, ${user.full_name} (${user.role === 'AICTE_OFFICER' ? 'AICTE Officer' : 'Bank Officer'})`);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    showToast('Signed out successfully.');
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

  const handleApplyRelease = () => {
    setActiveTab('lien-release');
  };

  const handleSelectFDRById = (fdrId: string) => {
    const found = fdrs.find(f => f.id === fdrId);
    if (found) {
      setSelectedFDR(found);
    }
  };

  // If not logged in, show the Landing Page with Credentials & Login Portal
  if (!currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  const unreadAlertCount = alerts.filter(a => !a.is_read).length;
  const unreadMessageCount = messages.filter(m => m.recipient_role === currentUser.role && !m.is_read).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-row font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Role-Specific Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        unreadMessageCount={unreadMessageCount}
        unreadAlertCount={unreadAlertCount}
        onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Header */}
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
          unreadAlertCount={unreadAlertCount}
          unreadMessageCount={unreadMessageCount}
          onRefreshData={loadData}
          onNavigateToMessages={() => setActiveTab('messages')}
        />

        {/* Dynamic Body Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
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

          {activeTab === 'institutions' && (
            <InstitutionsView
              institutions={institutions}
              fdrs={fdrs}
              onSelectInstitution={(id) => setSelectedInstitutionId(id)}
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
              refreshKey={refreshKey}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesView
              currentUser={currentUser}
              fdrs={fdrs}
              onRefreshData={loadData}
              refreshKey={refreshKey}
            />
          )}

          {activeTab === 'audit-trail' && (
            <AuditTrailView currentUser={currentUser} refreshKey={refreshKey} />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 text-xs py-3 px-6 text-slate-500 flex flex-wrap justify-between items-center gap-2 mt-auto">
          <div>
            &copy; 2026 <strong>AICTE Regulation Bureau</strong> &bull; Ministry of Education, Government of India
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>DepositGuard Digital Portal</span>
            <span>&bull;</span>
            <span className="text-emerald-600 font-semibold">IT Act 2000 &bull; DPDP Act 2023 Compliant</span>
          </div>
        </footer>
      </div>

      {/* Modals & Drawers */}
      <InstitutionDetailModal
        institutionId={selectedInstitutionId}
        onClose={() => setSelectedInstitutionId(null)}
        onOpenFDR={(id) => { setSelectedInstitutionId(null); handleSelectFDRById(id); }}
        refreshKey={refreshKey}
      />

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
        refreshKey={refreshKey}
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
