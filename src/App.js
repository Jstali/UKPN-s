import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import DtcAudit from './pages/DtcAudit';
import SapAudit from './pages/SapAudit';
import Subscriptions from './pages/Subscriptions';
import DtcActivity from './pages/DtcActivity';
import FileView from './pages/FileView';
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
          <Route path="/dtc-activity" element={<DtcActivity />} />
          <Route path="/file-view/:fileId" element={<FileView />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
