import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { AppProvider, useApp, CLIENTS } from './context/AppContext';

// Icons
import {
  ChevronDown, Bell, Search, ChevronRight
} from 'lucide-react';

// Sidebar
import Sidebar from './components/Sidebar';

// Modals
import CampaignModal from './components/modals/CampaignModal';
import DashboardModal from './components/modals/DashboardModal';
import ReportModal from './components/modals/ReportModal';
import InviteModal from './components/modals/InviteModal';
import ConnectorModal from './components/modals/ConnectorModal';
import DataSourceModal from './components/modals/DataSourceModal';
import { apiService } from '../services/api.service';

// Screens
import AgencyOverviewScreen from './screens/AgencyOverviewScreen';
import ClientsScreen from './screens/ClientsScreen';
import AIScreen from './screens/AIScreen';
import CampaignsScreen from './screens/CampaignsScreen';
import CampaignDetailScreen from './screens/CampaignDetailScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import AudiencesScreen from './screens/AudiencesScreen';
import IntegrationsScreen from './screens/IntegrationsScreen';
import DashboardsScreen from './screens/DashboardsScreen';
import DashboardViewerScreen from './screens/DashboardViewerScreen';
import DataSourcesScreen from './screens/DataSourcesScreen';
import ReportsScreen from './screens/ReportsScreen';
import TeamScreen from './screens/TeamScreen';
import SettingsScreen from './screens/SettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';

// Shared atoms
import PlatformDot from './components/shared/PlatformDot';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function AppShell() {
  const {
    activeView, setActiveView,
    selectedClientId,
    activeClient,
    campaigns, setCampaigns,
    dashboards, setDashboards,
    selectedCampaign,
    selectedDashboard,
    
    showCampaignModal, setShowCampaignModal,
    showDashboardModal, setShowDashboardModal,
    showReportModal, setShowReportModal,
    showInviteModal, setShowInviteModal,
    showConnectorModal, setShowConnectorModal,
    showDataSourceModal, setShowDataSourceModal,
    
    editingCampaign, setEditingCampaign,
    selectedConnector, setSelectedConnector,
    selectedDataSource, setSelectedDataSource,
    
    searchQuery, setSearchQuery,
    notifications, setNotifications,
    viewMode,
    showMobileMenu, setShowMobileMenu,
    showClientSwitcher,
    
    integrations, setIntegrations,
    dataSources, setDataSources,
  } = useApp();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setActiveView('dashboards');
      toast.success('Meta Ads connected! Fetching your data...');
      params.delete('connected');
      const nextSearch = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
    }
  }, [setActiveView]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Toaster position="top-right" richColors closeButton />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-60 bg-sidebar border border-sidebar-border rounded-3xl flex-col z-50 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowMobileMenu(false)}>
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <Sidebar onClose={() => setShowMobileMenu(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="lg:ml-68">
        {/* Header */}
        <header className="h-16 bg-card/75 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(true)} className="lg:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer border-0 bg-transparent">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold">
              <span className="text-slate-400">Venpep</span>
              <span className="text-slate-350 font-normal">›</span>
              {activeClient && (
                <>
                  <span className={`${activeClient.textColor}`}>{activeClient.name}</span>
                  <span className="text-slate-350 font-normal">›</span>
                </>
              )}
              <span className="text-slate-700 capitalize">{activeView === 'agency' ? 'Agency Overview' : activeView === 'ai' ? 'AI Analysis' : activeView.charAt(0).toUpperCase() + activeView.slice(1)}</span>
            </div>

            {/* Client badge on mobile */}
            {activeClient && (
              <span className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${activeClient.lightBg} ${activeClient.textColor} ${activeClient.lightBorder} border`}>
                <PlatformDot platform={activeClient.platforms[0] || 'Meta'} />
                {activeClient.name}
              </span>
            )}
          </div>

          {/* Centralized Search Bar with Keyboard Shortcuts */}
          <div className="relative hidden sm:block mx-auto max-w-sm w-full">
            <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="search"
              placeholder="Search campaigns, dashboards..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder-slate-400 font-bold"
            />
            <kbd className="absolute right-2.5 top-2 h-5 px-1.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 flex items-center gap-0.5 pointer-events-none select-none shadow-sm">
              <span>⌘</span><span>K</span>
            </kbd>
          </div>

          <div className="flex items-center gap-1.5 ml-4">
            <button
              onClick={() => { setActiveView('notifications'); setNotifications(0); }}
              className="relative w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {notifications > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1.5 ring-white"></span>}
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold">PM</div>
              <div className="hidden md:block">
                <p className="text-[11px] font-bold text-slate-850 leading-tight">Product Manager</p>
                <p className="text-[9px] text-slate-400 font-semibold">Owner · Venpep</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className={`${(activeView === 'ai' || activeView === 'ai-analysis') ? 'h-[calc(100vh-3.5rem)] flex flex-col p-4 sm:p-6' : 'p-4 sm:p-6 lg:p-8'}`}>
          <AnimatePresence mode="wait">
            {activeView === 'agency' && <AgencyOverviewScreen key="agency" />}
            {activeView === 'clients' && <ClientsScreen key="clients" />}
            {(activeView === 'ai' || activeView === 'ai-analysis') && <AIScreen key="ai" />}
            {activeView === 'campaigns' && viewMode === 'list' && <CampaignsScreen key="campaigns" />}
            {activeView === 'campaigns' && viewMode === 'detail' && <CampaignDetailScreen key="campaign-detail" />}
            {activeView === 'analytics' && <AnalyticsScreen key="analytics" />}
            {activeView === 'audiences' && <AudiencesScreen key="audiences" />}
            {activeView === 'integrations' && <IntegrationsScreen key="integrations" />}
            {activeView === 'dashboards' && <DashboardViewerScreen key="dashboard-viewer" />}
            {activeView === 'data' && <DataSourcesScreen key="data" />}
            {activeView === 'reports' && <ReportsScreen key="reports" />}
            {activeView === 'team' && <TeamScreen key="team" />}
            {activeView === 'settings' && <SettingsScreen key="settings" />}
            {activeView === 'notifications' && <NotificationsScreen key="notifications" />}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <CampaignModal show={showCampaignModal} onClose={() => { setShowCampaignModal(false); setEditingCampaign(null); }}
        campaign={editingCampaign} clients={CLIENTS} activeClientId={selectedClientId}
        onSave={(c: any) => {
          if (editingCampaign) { setCampaigns(campaigns.map((x: any) => x.id === c.id ? c : x)); toast.success('Campaign updated!'); }
          else { setCampaigns([...campaigns, { ...c, id: Date.now() }]); toast.success('Campaign created!'); }
          setShowCampaignModal(false); setEditingCampaign(null);
        }}
      />
      <DashboardModal show={showDashboardModal} onClose={() => setShowDashboardModal(false)} clients={CLIENTS} activeClientId={selectedClientId}
        onSave={(d: any) => { setDashboards([...dashboards, { ...d, id: Date.now() }]); setShowDashboardModal(false); toast.success('Dashboard created!'); }}
      />
      <ReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSave={(report: any) => {
          setShowReportModal(false);
          toast.success(`Report "${report.name}" is ready to generate and download.`);
        }}
      />
      <InviteModal show={showInviteModal} onClose={() => setShowInviteModal(false)} />
      <ConnectorModal
        show={showConnectorModal}
        onClose={() => { setShowConnectorModal(false); setSelectedConnector(null); }}
        connector={selectedConnector}
        clients={CLIENTS}
        onSave={async (updated: any) => {
          if (!apiService.isMockMode && updated.name !== 'Meta Ads') {
            try {
              await apiService.savePlatformConnection(updated);
            } catch (error) {
              toast.error('Connection saved locally, but backend storage failed.');
            }
          }

          const { credentials, ...safeUpdated } = updated;
          setIntegrations(integrations.map((ig: any) => ig.id === safeUpdated.id ? safeUpdated : ig));
          setShowConnectorModal(false);
          setSelectedConnector(null);
          toast.success(`${safeUpdated.name} configuration saved!`);
        }}
        onDelete={(id: number) => {
          const ig = integrations.find((x: any) => x.id === id);
          setIntegrations(integrations.map((x: any) => x.id === id ? { ...x, connected: false, clients: [], campaigns: 0, spend: 0 } : x));
          setShowConnectorModal(false);
          setSelectedConnector(null);
          toast.success(`${ig?.name || 'Integration'} disconnected!`);
        }}
      />
      <DataSourceModal
        show={showDataSourceModal}
        onClose={() => { setShowDataSourceModal(false); setSelectedDataSource(null); }}
        source={selectedDataSource}
        onSave={(updated: any) => {
          if (dataSources.some((ds: any) => ds.id === updated.id)) {
            setDataSources(dataSources.map((ds: any) => ds.id === updated.id ? updated : ds));
            toast.success(`Data source "${updated.name}" updated!`);
          } else {
            setDataSources([...dataSources, updated]);
            toast.success(`Data source "${updated.name}" added successfully!`);
          }
          setShowDataSourceModal(false);
          setSelectedDataSource(null);
        }}
        onDelete={(id: number) => {
          const ds = dataSources.find((x: any) => x.id === id);
          setDataSources(dataSources.filter((x: any) => x.id !== id));
          setShowDataSourceModal(false);
          setSelectedDataSource(null);
          toast.success(`Data source "${ds?.name || 'Source'}" removed!`);
        }}
      />
    </div>
  );
}
