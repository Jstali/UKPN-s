import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ClickSpark from './components/ClickSpark';
import './index.css';

// Global API warning banner — shown on every page when API calls fail
const ApiWarningBanner = () => {
  const { fetchError, nonDtcFetchError, auditData, nonDtcAuditData, fetchAllData } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [visibleError, setVisibleError] = useState(null);

  const hasData = auditData.length > 0 || nonDtcAuditData.length > 0;
  const activeError = fetchError || nonDtcFetchError;

  // Show banner whenever a new error arrives; reset dismissed state
  useEffect(() => {
    if (activeError) {
      setVisibleError(activeError);
      setDismissed(false);
    } else {
      setVisibleError(null);
    }
  }, [activeError]);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!visibleError || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 15000);
    return () => clearTimeout(timer);
  }, [visibleError, dismissed]);

  if (!visibleError || dismissed) return null;

  const bothFailed = fetchError && nonDtcFetchError;
  const label = bothFailed
    ? 'DTC & Non-DTC APIs failed'
    : fetchError
    ? 'DTC API failed'
    : 'Non-DTC API failed';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '9px 20px',
      background: hasData ? '#fffbeb' : '#fef2f2',
      borderBottom: `1px solid ${hasData ? '#fcd34d' : '#fca5a5'}`,
      fontSize: '13px',
      fontWeight: 600,
      color: hasData ? '#92400e' : '#991b1b',
      zIndex: 999,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: '15px' }}>{hasData ? '⚠️' : '🔴'}</span>
      <span style={{ flex: 1 }}>
        {label} —{' '}
        {hasData
          ? 'showing last known data. New records may not appear until the API recovers.'
          : 'no data available. Check your network or VPN connection.'}
      </span>
      <button
        onClick={() => { setDismissed(true); fetchAllData(true); }}
        style={{
          padding: '4px 12px',
          background: hasData ? '#d97706' : '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Retry
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: hasData ? '#92400e' : '#991b1b',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 4px',
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const DtcAudit = lazy(() => import('./pages/DtcAudit'));
const DtcAuditFilter = lazy(() => import('./pages/DtcAuditFilter'));
const NonDtcAudit = lazy(() => import('./pages/NonDtcAudit'));
const NonDtcAuditDetail = lazy(() => import('./pages/NonDtcAuditDetail'));
const NonDtcAuditFilter = lazy(() => import('./pages/NonDtcAuditFilter'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const AuditDetails = lazy(() => import('./pages/AuditDetails'));
const FileView = lazy(() => import('./pages/FileView'));
const Analytics = lazy(() => import('./pages/Analytics'));
const PerformanceGraphPage = lazy(() => import('./pages/PerformanceGraphPage'));
const PerformanceDetail = lazy(() => import('./pages/PerformanceDetail'));
const FailedFiles = lazy(() => import('./pages/FailedFiles'));
const DtcFailedFiles = lazy(() => import('./pages/DtcFailedFiles'));
const DtcFailedFilesDetail = lazy(() => import('./pages/DtcFailedFilesDetail'));
const NonDtcFailedFiles = lazy(() => import('./pages/NonDtcFailedFiles'));
const FilteredFileStatus = lazy(() => import('./pages/FilteredFileStatus'));
const Login = lazy(() => import('./pages/Login'));

const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '300px', color: '#64748b', fontSize: '14px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '32px', height: '32px', border: '3px solid #e2e8f0',
        borderTopColor: '#667eea', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
      }} />
      Loading...
    </div>
  </div>
);

function AppRoutes() {
  const { user, userLoading, login } = useApp();

  // Show spinner while /.auth/me is being fetched on Azure SWA.
  // Prevents the Login page from flashing briefly before the SSO user is resolved.
  if (userLoading) {
    return <PageLoader />;
  }

  // No authenticated user — show Login page.
  // On Azure SWA this should never be reached (SWA redirects to AAD before React loads).
  // On local dev this is the normal username/password login fallback.
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="*" element={<Login onLogin={login} />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <ClickSpark
      sparkColor='#667eea'
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <div className="app-container">
        <Header />
        <ApiWarningBanner />
        <main className="app-main" role="main">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/dtc-audit" element={<DtcAudit />} />
              <Route path="/dtc-audit-filter" element={<DtcAuditFilter />} />
              <Route path="/non-dtc-audit" element={<NonDtcAudit />} />
              <Route path="/non-dtc-audit-detail" element={<NonDtcAuditDetail />} />
              <Route path="/non-dtc-audit-filter" element={<NonDtcAuditFilter />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/audit-details" element={<AuditDetails />} />
              <Route path="/file-view/:fileId" element={<FileView />} />
              <Route path="/performance-graph" element={<PerformanceGraphPage />} />
              <Route path="/performance-detail" element={<PerformanceDetail />} />
              <Route path="/failed-files" element={<FailedFiles />} />
              <Route path="/dtc-failed-files" element={<DtcFailedFiles />} />
              <Route path="/dtc-failed-files-detail" element={<DtcFailedFilesDetail />} />
              <Route path="/non-dtc-failed-files" element={<NonDtcFailedFiles />} />
              <Route path="/filtered-file-status" element={<FilteredFileStatus />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </ClickSpark>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
