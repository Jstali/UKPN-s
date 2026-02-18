import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import DtcAudit from './pages/DtcAudit';
import SapAudit from './pages/SapAudit';
import Subscriptions from './pages/Subscriptions';
import AuditDetails from './pages/AuditDetails';
import FileView from './pages/FileView';
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
          <Header user={user} onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/dtc-audit" element={<DtcAudit user={user} />} />
            <Route path="/sap-audit" element={<SapAudit />} />
            <Route path="/subscriptions" element={<Subscriptions user={user} />} />
            <Route path="/audit-details" element={<AuditDetails />} />
            <Route path="/file-view/:fileId" element={<FileView />} />
          </Routes>
          <Footer />
        </div>
      </ClickSpark>
    </Router>
  );
}

export default App;
