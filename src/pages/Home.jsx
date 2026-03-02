import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { nonDtcAuditData } from '../data/mockData';
import auditData from '../data/Audit_Data_Dumy';
import admsData from '../data/ADMS_DEV_V1.js';
import electralinkData from '../data/Electralink_DEV_V1.js';
import mprsData from '../data/MPRS_DEV_V1.js';
import msbiData from '../data/application subscription.js';
import { NAV_CARDS } from '../data/dashboardConfig';
import FileStatusSection from '../components/dashboard/FileStatusSection';
import ApplicationStatusSection from '../components/dashboard/ApplicationStatusSection';
import PerformanceSection from '../components/dashboard/PerformanceSection';
import EditModal from '../components/dashboard/EditModal';

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [showFailedDropdown, setShowFailedDropdown] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [infoText, setInfoText] = React.useState('ℹ️ System Information: Regular maintenance scheduled for this weekend   •   •   •   📊 New reports available in Non DTC Audit section');
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = React.useState(() => new Date().toLocaleTimeString());
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setDashboardUpdatedAt(new Date().toLocaleTimeString());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const canEditInfo = user?.role === 'Business' || user?.role === 'Core Support' || user?.role === 'Admin';

  const allSubscriptions = [admsData, electralinkData, mprsData, msbiData];

  const showDetails = (type) => {
    const detailsMap = {
      files: {
        title: 'Files Received',
        items: auditData.map(item => item.Source_FileName),
        value: auditData.length,
        chartData: { labels: ['Valid', 'Invalid', 'Pending'], values: [78, 27, 27], colors: ['#10b981', '#ef4444', '#f59e0b'] }
      },
      subscriptions: {
        title: 'Total Files Subscribed',
        items: allSubscriptions.map(app => app.Application),
        value: 105,
        chartData: { labels: ['Valid', 'Invalid'], values: [78, 27], colors: ['#10b981', '#ef4444'] }
      },
      deliveries: {
        title: 'Total Deliveries',
        items: auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName),
        value: 78,
        chartData: { labels: ['Delivered', 'Pending'], values: [78, 27], colors: ['#10b981', '#f59e0b'] }
      },
      pending: {
        title: 'Pending Delivery',
        items: auditData.filter(item => item.events?.some(e => e.Event_Type === '2') && !item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName),
        value: 27,
        chartData: { labels: ['Pending', 'Delivered'], values: [27, 78], colors: ['#f59e0b', '#10b981'] }
      }
    };
    const detail = detailsMap[type];
    if (detail) navigate('/analytics', { state: { ...detail, type } });
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) setDashboardUpdatedAt(new Date().toLocaleTimeString());
  };

  const failedRecords = nonDtcAuditData.filter(item => item.status === 'Failed');
  const marqueeText = failedRecords.map(item =>
    `⚠️ Failed: ${item.flow} - ${item.fileId} (${item.startDate})`
  ).join('   •   •   •   ');

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
          <div className="dashboard-info-bar" style={{ background: '#dbeafe' }}>
            {user?.role !== 'Business' && (
              <button onClick={() => setShowEditModal(true)} className="dashboard-info-btn" style={{ background: '#1e40af' }}>
                Edit Info
              </button>
            )}
            <div style={{ color: '#1e40af', fontWeight: '600', fontSize: '13px', flex: 1 }}>{infoText}</div>
          </div>
        )}

        {/* View Failed Bar */}
        {failedRecords.length > 0 && (
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
                {failedRecords.map((record, index) => (
                  <div key={index} style={{
                    padding: '10px 14px',
                    borderBottom: index < failedRecords.length - 1 ? '1px solid #fee2e2' : 'none',
                    fontSize: '12px', color: '#991b1b'
                  }}>
                    ⚠️ {record.flow} - {record.fileId} ({record.startDate})
                  </div>
                ))}
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
              auditDataLength={auditData.length}
              dashboardUpdatedAt={dashboardUpdatedAt}
              onShowDetails={showDetails}
            />
            <ApplicationStatusSection dashboardUpdatedAt={dashboardUpdatedAt} />
          </div>
          <div className="dashboard-col-right">
            <PerformanceSection dashboardUpdatedAt={dashboardUpdatedAt} />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          infoText={infoText}
          onInfoTextChange={setInfoText}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default Home;
