import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import DtcAudit from './pages/DtcAudit';
import DtcAuditFilter from './pages/DtcAuditFilter';
import NonDtcAudit from './pages/NonDtcAudit';
import NonDtcAuditDetail from './pages/NonDtcAuditDetail';
import Subscriptions from './pages/Subscriptions';
import AuditDetails from './pages/AuditDetails';
import FileView from './pages/FileView';
import Analytics from './pages/Analytics';
import PerformanceGraphPage from './pages/PerformanceGraphPage';
import PerformanceDetail from './pages/PerformanceDetail';
import Login from './pages/Login';
import ClickSpark from './components/ClickSpark';
import './index.css';

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
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
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
            </Routes>
          </main>
          <Footer />
        </div>
      </ClickSpark>
    </Router>
  );
}

export default App;
