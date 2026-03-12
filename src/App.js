import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ClickSpark from './components/ClickSpark';
import './index.css';

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const DtcAudit = lazy(() => import('./pages/DtcAudit'));
const DtcAuditFilter = lazy(() => import('./pages/DtcAuditFilter'));
const NonDtcAudit = lazy(() => import('./pages/NonDtcAudit'));
const NonDtcAuditDetail = lazy(() => import('./pages/NonDtcAuditDetail'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const AuditDetails = lazy(() => import('./pages/AuditDetails'));
const FileView = lazy(() => import('./pages/FileView'));
const Analytics = lazy(() => import('./pages/Analytics'));
const PerformanceGraphPage = lazy(() => import('./pages/PerformanceGraphPage'));
const PerformanceDetail = lazy(() => import('./pages/PerformanceDetail'));
const FailedFiles = lazy(() => import('./pages/FailedFiles'));
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

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  if (!user) {
    return (
      <Router>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="*" element={<Login onLogin={handleLogin} />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <ClickSpark
          sparkColor='#f04f14'
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        >
          <div className="app-container">
            <Header user={user} onLogout={handleLogout} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />
            <main className="app-main">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home user={user} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/dtc-audit" element={<DtcAudit user={user} />} />
                  <Route path="/dtc-audit-filter" element={<DtcAuditFilter />} />
                  <Route path="/non-dtc-audit" element={<NonDtcAudit />} />
                  <Route path="/non-dtc-audit-detail" element={<NonDtcAuditDetail />} />
                  <Route path="/subscriptions" element={<Subscriptions user={user} />} />
                  <Route path="/audit-details" element={<AuditDetails />} />
                  <Route path="/file-view/:fileId" element={<FileView />} />
                  <Route path="/performance-graph" element={<PerformanceGraphPage />} />
                  <Route path="/performance-detail" element={<PerformanceDetail />} />
                  <Route path="/failed-files" element={<FailedFiles />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </ClickSpark>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
