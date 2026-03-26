import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw, ChevronDown } from 'lucide-react';
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
  const [nonDtcAuditData, setNonDtcAuditData] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showFailedDropdown, setShowFailedDropdown] = React.useState(false);
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
  const fetchData = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Check cache first (5 min expiry)
      const cacheKey = 'dashboardData';
      const cacheTimeKey = 'dashboardDataTime';
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);
      const now = Date.now();
      
      if (cached && cacheTime && (now - parseInt(cacheTime)) < 300000) {
        const { dtc, nonDtc, count } = JSON.parse(cached);
        setAuditData(dtc);
        setNonDtcAuditData(nonDtc);
        setTotalCount(count);
        setLoading(false);
        return;
      }

      // Fetch first page only for initial load
      const [dtcResponse, nonDtcResponse] = await Promise.all([
        api.fetchDtcAuditData(null, 200),
        api.fetchNonDtcAuditData(null, 200)
      ]);

      const initialDtc = dtcResponse.data || [];
      const initialNonDtc = nonDtcResponse.data || [];
      
      setAuditData(initialDtc);
      setNonDtcAuditData(initialNonDtc);
      setTotalCount(dtcResponse.totalCount || initialDtc.length);
      setLoading(false);

      // Lazy load remaining pages in background
      const loadRemaining = async () => {
        let allDtc = [...initialDtc];
        let allNonDtc = [...initialNonDtc];
        let dtcToken = dtcResponse.continuationToken;
        let nonDtcToken = nonDtcResponse.continuationToken;

        while (dtcToken || nonDtcToken) {
          const promises = [];
          if (dtcToken) promises.push(api.fetchDtcAuditData(dtcToken, 500));
          if (nonDtcToken) promises.push(api.fetchNonDtcAuditData(nonDtcToken, 500));
          
          const results = await Promise.all(promises);
          
          if (dtcToken) {
            const dtcRes = results[0];
            allDtc = [...allDtc, ...(dtcRes.data || [])];
            dtcToken = dtcRes.continuationToken;
          }
          if (nonDtcToken) {
            const nonDtcRes = results[promises.length === 2 ? 1 : 0];
            allNonDtc = [...allNonDtc, ...(nonDtcRes.data || [])];
            nonDtcToken = nonDtcRes.continuationToken;
          }
          
          setAuditData([...allDtc]);
          setNonDtcAuditData([...allNonDtc]);
        }

        // Cache complete data
        sessionStorage.setItem(cacheKey, JSON.stringify({
          dtc: allDtc,
          nonDtc: allNonDtc,
          count: dtcResponse.totalCount || allDtc.length
        }));
        sessionStorage.setItem(cacheTimeKey, now.toString());
      };

      loadRemaining();

      const newTime = new Date().toLocaleTimeString();
      setDashboardUpdatedAt(newTime);
      sessionStorage.setItem('dashboardUpdatedAt', newTime);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setAuditData([]);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true); // silent refresh — no loading screen
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const canEditInfo = user?.role === 'Business' || user?.role === 'Core Support' || user?.role === 'Admin';

  const deliveredFiles = React.useMemo(() => {
    const delivered = auditData.filter(item => item.events?.some(e => String(e.Event_Type) === '4'));
    return delivered;
  }, [auditData]);

  const pendingFiles = React.useMemo(() => {
    return auditData.filter(item => !item.events?.some(e => String(e.Event_Type) === '4'));
  }, [auditData]);

  const failedFiles = React.useMemo(() => {
    const FAILED_STATUSES = ['failed', 'invalid subscription', 'checksum mismatch'];
    const isFailed = (status) => {
      if (!status) return false;
      return FAILED_STATUSES.includes(String(status).toLowerCase());
    };

    const dtcFailed = auditData.filter(item =>
      item.events?.some(e => isFailed(e.Status) || isFailed(e.status))
    );
    const nonDtcFailed = nonDtcAuditData.filter(item =>
      isFailed(item.status) || isFailed(item.Status)
    );
    return { dtcFailed, nonDtcFailed };
  }, [auditData, nonDtcAuditData]);

  const performanceItems = React.useMemo(() => {
    const appStats = new Map();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours

    auditData.forEach((item) => {
      const events = Array.isArray(item.events) ? item.events : [];
      const event1 = events.find((e) => String(e.Event_Type) === '1' && e.timestamp);
      const event4 = events.find((e) => String(e.Event_Type) === '4' && e.timestamp);

      if (!event1 || !event4) return;

      const start = new Date(event1.timestamp).getTime();
      const end = new Date(event4.timestamp).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;

      // Only include files received within last 24 hours
      if (start < cutoff) return;

      const durationSec = (end - start) / 1000;
      const appName = event1.applicationName || item.Application_Name || 'Unknown';

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
        totalDuration: stats.totalDuration,
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
      const hasFailed = item.events?.some(e => {
        const s = (e.Status || e.status || '').toLowerCase();
        return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
      });
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
        items: auditData.map(item => item.Source_FileName).filter(Boolean),
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
        {(canEditInfo || user?.role === 'Business' || user?.role === 'Testing Team') && (
          <div className="dashboard-info-bar" style={{ background: '#fef3c7' }}>
            {user?.role !== 'Business' && (
              <button onClick={() => setShowEditModal(true)} className="dashboard-info-btn" style={{ background: '#d97706' }}>
                Edit Info
              </button>
            )}
            <div style={{ color: '#92400e', fontWeight: '600', fontSize: '13px', flex: 1 }}>{infoText}</div>
          </div>
        )}

        {/* Failed Files Marquee */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            margin: '6px 24px 0',
            padding: '8px 18px',
            background: (failedFiles.dtcFailed.length > 0 || failedFiles.nonDtcFailed.length > 0) 
              ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' 
              : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            border: (failedFiles.dtcFailed.length > 0 || failedFiles.nonDtcFailed.length > 0) 
              ? '1px solid #fca5a5' 
              : '1px solid #d1d5db',
            borderRadius: '10px',
            overflow: 'visible',
            position: 'relative',
            boxShadow: (failedFiles.dtcFailed.length > 0 || failedFiles.nonDtcFailed.length > 0) 
              ? '0 2px 8px rgba(239, 68, 68, 0.1)' 
              : '0 2px 8px rgba(107, 114, 128, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowFailedDropdown(!showFailedDropdown)}
              style={{
                padding: '5px 12px',
                background: (failedFiles.dtcFailed.length > 0 || failedFiles.nonDtcFailed.length > 0) 
                  ? '#dc2626' 
                  : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View Failed
              <ChevronDown size={14} style={{ transform: showFailedDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ 
                fontSize: '13px', 
                color: (failedFiles.dtcFailed.length > 0 || failedFiles.nonDtcFailed.length > 0) 
                  ? '#7f1d1d' 
                  : '#374151', 
                fontWeight: 600 
              }}>
                {(failedFiles.dtcFailed.length > 0 || failedFiles.nonDtcFailed.length > 0) 
                  ? 'Some files have failed processing. Click View Failed to see details.' 
                  : 'All files are processing successfully.'}
              </span>
            </div>
          </div>

          {/* Dropdown Menu */}
          {showFailedDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: '18px',
                marginTop: '4px',
                background: '#fff',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '200px',
              }}
            >
              <div
                onClick={() => {
                  navigate('/dtc-failed-files');
                  setShowFailedDropdown(false);
                }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  borderBottom: '1px solid #f1f5f9',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                DTC Audit ({failedFiles.dtcFailed.length} failed)
              </div>
              <div
                onClick={() => {
                  navigate('/non-dtc-failed-files');
                  setShowFailedDropdown(false);
                }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                Non DTC Audit ({failedFiles.nonDtcFailed.length} failed)
              </div>
            </motion.div>
          )}
        </motion.div>

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
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '300px', flexDirection: 'column', gap: '14px',
            color: '#64748b', fontSize: '14px', fontWeight: 500,
          }}>
            <div style={{
              width: '36px', height: '36px', border: '3px solid #e2e8f0',
              borderTopColor: '#667eea', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Fetching dashboard data...
          </div>
        ) : (
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
        )}
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
