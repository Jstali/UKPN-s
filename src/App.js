import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import DtcAudit from './pages/DtcAudit';
import SapAudit from './pages/SapAudit';
import Subscriptions from './pages/Subscriptions';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dtc-audit" element={<DtcAudit />} />
          <Route path="/sap-audit" element={<SapAudit />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
