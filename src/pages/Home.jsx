import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { NAV_CARDS } from '../data/dashboardConfig';
import FileStatusSection from '../components/dashboard/FileStatusSection';
import ApplicationStatusSection from '../components/dashboard/ApplicationStatusSection';
import PerformanceSection from '../components/dashboard/PerformanceSection';
import FailedFilesSection from '../components/dashboard/FailedFilesSection';
import EditModal from '../components/dashboard/EditModal';
import { parseHeader } from '../utils/auditUtils';

import { useApp } from '../context/AppContext';

const Home = () => {
  const { user, autoRefresh, setAutoRefresh } = useApp();
  const navigate = useNavigate();
  const [auditData, setAuditData] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
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

  // Fetch audit data from API on mount and with auto-refresh
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.fetchDtcAuditData();
      const auditArray = response.data || response || [];
      setTotalCount(response.totalCount || (Array.isArray(auditArray) ? auditArray.length : 0));
      setAuditData(Array.isArray(auditArray) ? auditArray : []);
      
      // Update timestamp
      const newTime = new Date().toLocaleTimeString();
      setDashboardUpdatedAt(newTime);
      sessionStorage.setItem('dashboardUpdatedAt', newTime);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setAuditData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const canEditInfo = user?.role === 'Business' || user?.role === 'Core Support' || user?.role === 'Admin';

  const deliveredFiles = React.useMemo(() => {
    const delivered = auditData.filter(item => item.events?.some(e => String(e.Event_Type) === '4'));
    return delivered;
  }, [auditData]);

  const pendingFiles = React.useMemo(() => {
    return auditData.filter(item => item.events?.some(e => String(e.Event_Type) === '2') && !item.events?.some(e => String(e.Event_Type) === '4'));
  }, [auditData]);

  const failedFiles = React.useMemo(() => {
    const dtcFailed = [];
    const nonDtcFailed = [];
    
    auditData.forEach(item => {
      const hasFailed = item.events?.some(e => e.Status === 'Failed' || e.Status === 'Invalid Subscription');
      if (hasFailed) {
        // Check if it's DTC or Non-DTC based on header string or other criteria
        const parsed = parseHeader(item.Header_String);
        if (parsed.flowVersion && parsed.flowVersion !== 'UNKNOWN') {
          dtcFailed.push(item);
        } else {
          nonDtcFailed.push(item);
        }
      }
    });
    
    return { dtcFailed, nonDtcFailed };
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
    // Calculate actual status distribution from audit data
    const statusCounts = auditData.reduce((acc, item) => {
      const hasDelivered = item.events?.some(e => String(e.Event_Type) === '4');
      const hasFailed = item.events?.some(e => e.Status === 'Failed' || e.Status === 'Invalid Subscription');
      const hasPending = item.events?.some(e => String(e.Event_Type) === '2');
      
      if (hasDelivered) {
        acc.valid = (acc.valid || 0) + 1;
      } else if (hasFailed) {
        acc.invalid = (acc.invalid || 0) + 1;
      } else if (hasPending) {
        acc.pending = (acc.pending || 0) + 1;
      } else {
        // Count files that don't match any category as pending
        acc.pending = (acc.pending || 0) + 1;
      }
      return acc;
    }, { valid: 0, invalid: 0, pending: 0 });

    const detailsMap = {
      files: {
        title: 'Files Received',
        items: auditData.map(item => item.Source_FileName),
        value: fileStats.filesReceived,
        chartData: { 
          labels: ['Valid', 'Invalid', 'Pending'], 
          values: [statusCounts.valid, statusCounts.invalid, statusCounts.pending], 
          colors: ['#10b981', '#ef4444', '#f59e0b'] 
        }
      },
      subscriptions: {
        title: 'Total Files Subscribed',
        items: [],
        value: fileStats.totalToBeDelivered,
        chartData: { 
          labels: ['Delivered', 'Pending'], 
          values: [fileStats.totalDelivered, fileStats.pendingDelivery], 
          colors: ['#10b981', '#f59e0b'] 
        }
      },
      deliveries: {
        title: 'Total Deliveries',
        items: deliveredFiles.map(item => item.Source_FileName),
        value: fileStats.totalDelivered,
        chartData: { 
          labels: ['Delivered', 'Pending'], 
          values: [fileStats.totalDelivered, fileStats.pendingDelivery], 
          colors: ['#10b981', '#f59e0b'] 
        }
      },
      pending: {
        title: 'Pending Delivery',
        items: pendingFiles.map(item => item.Source_FileName),
        value: fileStats.pendingDelivery,
        chartData: { 
          labels: ['Pending', 'Delivered'], 
          values: [fileStats.pendingDelivery, fileStats.totalDelivered], 
          colors: ['#f59e0b', '#10b981'] 
        }
      }
    };
    const detail = detailsMap[type];
    if (detail) navigate('/analytics', { state: { ...detail, type } });
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) setDashboardUpdatedAt(new Date().toLocaleTimeString());
  };

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
            <FailedFilesSection
              dtcFailed={failedFiles.dtcFailed}
              nonDtcFailed={failedFiles.nonDtcFailed}
              dashboardUpdatedAt={dashboardUpdatedAt}
            />
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
