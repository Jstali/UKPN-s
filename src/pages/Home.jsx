import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { dtcAuditData, nonDtcAuditData } from '../data/mockData';
import api from '../utils/api';
import admsData from '../data/ADMS_DEV_V1.js';
import electralinkData from '../data/Electralink_DEV_V1.js';
import mprsData from '../data/MPRS_DEV_V1.js';
import msbiData from '../data/application subscription.js';
import { NAV_CARDS } from '../data/dashboardConfig';
import FileStatusSection from '../components/dashboard/FileStatusSection';
import ApplicationStatusSection from '../components/dashboard/ApplicationStatusSection';
import PerformanceSection from '../components/dashboard/PerformanceSection';
import EditModal from '../components/dashboard/EditModal';

import { useApp } from '../context/AppContext';

const Home = () => {
  const { user, autoRefresh, setAutoRefresh } = useApp();
  const navigate = useNavigate();
  const [auditData, setAuditData] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showFailedDropdown, setShowFailedDropdown] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [infoText, setInfoText] = React.useState(() => {
    const saved = localStorage.getItem('dashboardInfoText');
    return saved || 'ℹ️ System Information: Regular maintenance scheduled for this weekend   •   •   •   📊 New reports available in Non DTC Audit section';
  });
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = React.useState(() => {
    const saved = sessionStorage.getItem('dashboardUpdatedAt');
    if (saved) return saved;
    const now = new Date().toLocaleTimeString();
    sessionStorage.setItem('dashboardUpdatedAt', now);
    return now;
  });

  // Fetch audit data from API on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.fetchDtcAuditData();
        // Extract data array from response object
        const auditArray = response.data || response || [];
        setTotalCount(response.totalCount || (Array.isArray(auditArray) ? auditArray.length : 0));
        setAuditData(Array.isArray(auditArray) ? auditArray : []);
      } catch (error) {
        console.error('Failed to fetch audit data:', error);
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      const newTime = new Date().toLocaleTimeString();
      setDashboardUpdatedAt(newTime);
      sessionStorage.setItem('dashboardUpdatedAt', newTime);
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const canEditInfo = user?.role === 'Business' || user?.role === 'Core Support' || user?.role === 'Admin';

  const allSubscriptions = [admsData, electralinkData, mprsData, msbiData];

  const deliveredFiles = React.useMemo(() => {
    const delivered = auditData.filter(item => item.events?.some(e => String(e.Event_Type) === '4'));
    return delivered;
  }, [auditData]);

  const pendingFiles = React.useMemo(() => {
    return auditData.filter(item => item.events?.some(e => String(e.Event_Type) === '2') && !item.events?.some(e => String(e.Event_Type) === '4'));
  }, [auditData]);

  const performanceItems = React.useMemo(() => {
    const appStats = new Map();

    auditData.forEach((item) => {
      const events = Array.isArray(item.events) ? item.events : [];
      const event1 = events.find((e) => String(e.Event_Type) === '1' && e.timestamp);
      const event4 = events.find((e) => String(e.Event_Type) === '4' && e.timestamp);

      if (!event1 || !event4) return;

      const start = new Date(event1.timestamp).getTime();
      const end = new Date(event4.timestamp).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;

      const durationSec = (end - start) / 1000;
      const appName = event1.applicationName || 'Unknown';

      if (!appStats.has(appName)) {
        appStats.set(appName, { totalDuration: 0, files: 0 });
      }

      const current = appStats.get(appName);
      current.totalDuration += durationSec;
      current.files += 1;
    });

    return Array.from(appStats.entries()).map(([name, stats]) => {
      const actual = stats.files > 0 ? stats.totalDuration / stats.files : 0;
      return {
        name,
        avgTime: `${actual.toFixed(1)}s`,
        actual,
        files: stats.files,
      };
    });
  }, [auditData]);

  const fileStats = React.useMemo(() => ({
    filesReceived: totalCount,
    totalToBeDelivered: totalCount,
    totalDelivered: deliveredFiles.length,
    pendingDelivery: Math.max(totalCount - deliveredFiles.length, 0),
  }), [totalCount, deliveredFiles.length]);

  const showDetails = (type) => {
    const detailsMap = {
      files: {
        title: 'Files Received',
        items: auditData.map(item => item.Source_FileName),
        value: fileStats.filesReceived,
        chartData: { labels: ['Valid', 'Invalid', 'Pending'], values: [78, 27, 27], colors: ['#10b981', '#ef4444', '#f59e0b'] }
      },
      subscriptions: {
        title: 'Total Files Subscribed',
        items: allSubscriptions.map(app => app.Application),
        value: fileStats.totalToBeDelivered,
        chartData: { labels: ['Valid', 'Invalid'], values: [78, 27], colors: ['#10b981', '#ef4444'] }
      },
      deliveries: {
        title: 'Total Deliveries',
        items: auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName),
        value: fileStats.totalDelivered,
        chartData: { labels: ['Delivered', 'Pending'], values: [fileStats.totalDelivered, fileStats.pendingDelivery], colors: ['#10b981', '#f59e0b'] }
      },
      pending: {
        title: 'Pending Delivery',
        items: pendingFiles.map(item => item.Source_FileName),
        value: fileStats.pendingDelivery,
        chartData: { labels: ['Pending', 'Delivered'], values: [fileStats.pendingDelivery, fileStats.totalDelivered], colors: ['#f59e0b', '#10b981'] }
      }
    };
    const detail = detailsMap[type];
    if (detail) navigate('/analytics', { state: { ...detail, type } });
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) setDashboardUpdatedAt(new Date().toLocaleTimeString());
  };

  const dtcFailedRecords = dtcAuditData.filter(item => item.status === 'Failed');
  const nonDtcFailedRecords = nonDtcAuditData.filter(item => item.status === 'Failed');
  const hasFailedFiles = dtcFailedRecords.length > 0 || nonDtcFailedRecords.length > 0;

  const marqueeText = hasFailedFiles
    ? '⚠️ Failed files are there, please check it'
    : '';

  return (
    <div className="dashboard-root">
      <div className="dashboard-body">

        {/* Welcome Strip — compact single row */}
        <div className="dashboard-welcome-strip">
          <div>
            <h1 className="dashboard-welcome-title">Welcome to File Connect</h1>
            <div className="dashboard-welcome-bar" />
          </div>
          <div className="dashboard-auto-refresh">
            <span className="dashboard-auto-refresh-label" style={{ color: autoRefresh ? '#16a34a' : '#94a3b8' }}>
              Auto Refresh
            </span>
            <button
              onClick={handleToggleAutoRefresh}
              className="dashboard-toggle-btn"
              style={{ background: autoRefresh ? '#22c55e' : '#cbd5e1' }}
              title={autoRefresh ? 'Disable Auto Refresh' : 'Enable Auto Refresh'}
            >
              <div className="dashboard-toggle-knob" style={{ left: autoRefresh ? '22px' : '2px' }}>
                <RefreshCw size={11} color={autoRefresh ? '#22c55e' : '#94a3b8'} style={{ animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }} />
              </div>
            </button>
          </div>
        </div>

        {/* Edit Info Bar */}
        {(canEditInfo || user?.role === 'Business') && (
          <div className="dashboard-info-bar" style={{ background: '#fef3c7' }}>
            {user?.role !== 'Business' && (
              <button onClick={() => setShowEditModal(true)} className="dashboard-info-btn" style={{ background: '#d97706' }}>
                Edit Info
              </button>
            )}
            <div style={{ color: '#92400e', fontWeight: '600', fontSize: '13px', flex: 1 }}>{infoText}</div>
          </div>
        )}

        {/* View Failed Bar */}
        {hasFailedFiles && (
          <div className="dashboard-info-bar" style={{ background: '#fee2e2', marginTop: canEditInfo ? '6px' : '10px', position: 'relative' }}>
            <button
              onClick={() => setShowFailedDropdown(!showFailedDropdown)}
              className="dashboard-info-btn"
              style={{ background: '#991b1b' }}
            >
              View Failed
            </button>
            {showFailedDropdown && (
              <div className="dashboard-failed-dropdown">
                {dtcFailedRecords.length > 0 && (
                  <div
                    onClick={() => { setShowFailedDropdown(false); navigate('/failed-files', { state: { type: 'dtc' } }); }}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                      borderBottom: nonDtcFailedRecords.length > 0 ? '1px solid #fee2e2' : 'none',
                      fontSize: '13px', fontWeight: 600, color: '#991b1b',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span>⚠️ DTC Failed Files</span>
                    <span style={{
                      background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '10px', minWidth: '20px', textAlign: 'center'
                    }}>{dtcFailedRecords.length}</span>
                  </div>
                )}
                {nonDtcFailedRecords.length > 0 && (
                  <div
                    onClick={() => { setShowFailedDropdown(false); navigate('/failed-files', { state: { type: 'nondtc' } }); }}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                      fontSize: '13px', fontWeight: 600, color: '#991b1b',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span>⚠️ Non DTC Failed Files</span>
                    <span style={{
                      background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '10px', minWidth: '20px', textAlign: 'center'
                    }}>{nonDtcFailedRecords.length}</span>
                  </div>
                )}
              </div>
            )}
            <div style={{ color: '#991b1b', fontWeight: '600', fontSize: '13px', flex: 1 }}>{marqueeText}</div>
          </div>
        )}

        {/* Navigation Cards — 3 equal-width on one row */}
        <div className="dashboard-nav-cards">
          {NAV_CARDS.map((item) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
              onClick={() => navigate(item.path)}
              className="dashboard-nav-card"
              whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(102,126,234,0.18)', borderColor: '#667eea', scale: 1.02, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            >
              <div className="dashboard-nav-card-icon">
                <img src={`${process.env.PUBLIC_URL}/${item.icon}`} alt={item.label} style={{ width: 36, height: 36, objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="dashboard-nav-card-label">{item.label}</div>
                <div className="dashboard-nav-card-desc">{item.desc}</div>
              </div>
              <ChevronRight size={16} color="#475569" />
            </motion.div>
          ))}
        </div>

        {/* Two-column layout: File Status + App Status (left) | Performance (right) */}
        <div className="dashboard-layout">
          <div className="dashboard-col-left">
            <FileStatusSection
              fileStats={fileStats}
              dashboardUpdatedAt={dashboardUpdatedAt}
              onShowDetails={showDetails}
            />
            <ApplicationStatusSection dashboardUpdatedAt={dashboardUpdatedAt} />
          </div>
          <div className="dashboard-col-right">
            <PerformanceSection dashboardUpdatedAt={dashboardUpdatedAt} performanceItems={performanceItems} />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          infoText={infoText}
          onInfoTextChange={(text) => { setInfoText(text); localStorage.setItem('dashboardInfoText', text); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default Home;
