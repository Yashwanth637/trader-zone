import React, { useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';

// Layout
import { Sidebar } from './components/layout/Sidebar';
import { Header, Footer } from './components/layout/Header';

// Modals
import { AddTradeModal } from './components/trades/AddTradeModal';
import { CsvImportModal } from './components/trades/CsvImportModal';
import { QuickCalculatorModal } from './components/common/QuickCalculatorModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { JournalPage } from './pages/JournalPage';
import { DayViewPage } from './pages/DayViewPage';
import { TradesPage } from './pages/TradesPage';
import { TradeDetailPage } from './pages/TradeDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { ReplayPage } from './pages/ReplayPage';
import { TerminalPage } from './pages/TerminalPage';
import { AIPage } from './pages/AIPage';
import { ProgressPage } from './pages/ProgressPage';
import { ShareCardsPage } from './pages/ShareCardsPage';
import { MarketHoursPage } from './pages/MarketHoursPage';
import { BrokerHubPage } from './pages/BrokerHubPage';
import { SettingsPage } from './pages/SettingsPage';
import { TermsPage, PrivacyPage, DisclaimerPage } from './pages/LegalPages';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
};

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/' || location.pathname === '/landing';
  const isLogin = location.pathname === '/login';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Global Modal States
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  if (isLanding) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    );
  }

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  // Strict Access Guard: If not authenticated, redirect directly to /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <ScrollToTop />
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Top Header */}
      <Header
        collapsed={collapsed}
        onOpenMobileMenu={() => setMobileOpen(true)}
        onOpenAddTrade={() => setAddTradeOpen(true)}
        onOpenCalculator={() => setCalcOpen(true)}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 p-4 md:p-6 ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage onOpenAddTrade={() => setAddTradeOpen(true)} />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/day-view" element={<DayViewPage onOpenAddTrade={() => setAddTradeOpen(true)} />} />
          <Route path="/trades" element={<TradesPage onOpenAddTrade={() => setAddTradeOpen(true)} onOpenCsvImport={() => setCsvImportOpen(true)} />} />
          <Route path="/trades/:id" element={<TradeDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/strategies" element={<StrategiesPage />} />
          <Route path="/replay" element={<ReplayPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route path="/ai-2" element={<AIPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/share-cards" element={<ShareCardsPage />} />
          <Route path="/market-hours" element={<MarketHoursPage />} />
          <Route path="/broker-hub" element={<BrokerHubPage onOpenCsvImport={() => setCsvImportOpen(true)} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="*" element={<DashboardPage onOpenAddTrade={() => setAddTradeOpen(true)} />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer collapsed={collapsed} />

      {/* Global Modals */}
      {addTradeOpen && <AddTradeModal isOpen={addTradeOpen} onClose={() => setAddTradeOpen(false)} />}
      {csvImportOpen && <CsvImportModal isOpen={csvImportOpen} onClose={() => setCsvImportOpen(false)} />}
      {calcOpen && <QuickCalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TradingProvider>
          <HashRouter>
            <AppLayout />
          </HashRouter>
        </TradingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
