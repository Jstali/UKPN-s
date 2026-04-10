import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import api from '../../utils/api';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const COLOR_MAP = {
  green:  { dot: '#22c55e', label: '#16a34a', shadow: '0 0 0 3px rgba(34, 197, 94, 0.2), 0 0 8px rgba(34, 197, 94, 0.3)',  cardBg: null,      cardBorder: null },
  yellow: { dot: '#f59e0b', label: '#d97706', shadow: '0 0 0 3px rgba(245, 158, 11, 0.2), 0 0 8px rgba(245, 158, 11, 0.3)', cardBg: null,      cardBorder: null },
  red:    { dot: '#ef4444', label: '#dc2626', shadow: '0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 8px rgba(239, 68, 68, 0.3)',   cardBg: '#fef2f2', cardBorder: '1.5px solid #ffffff' },
};

const LOADING_CONFIG = {
  dot: '#94a3b8', label: '#475569',
  shadow: '0 0 0 3px rgba(148, 163, 184, 0.2), 0 0 8px rgba(148, 163, 184, 0.3)',
  cardBg: null, cardBorder: null,
};

const ApplicationStatusSection = ({ dashboardUpdatedAt }) => {
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const [status, setStatus] = React.useState(null); // raw API response
  const [fetchLoading, setFetchLoading] = React.useState(true);

  React.useEffect(() => { setHasAnimated(true); }, []);

  const loadStatus = React.useCallback(async () => {
    const data = await api.fetchApplicationStatus();
    setStatus(data);
    setFetchLoading(false);
  }, []);

  // Initial fetch + 5-minute poll
  React.useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const colors = React.useMemo(() => {
    if (fetchLoading || !status) return LOADING_CONFIG;
    return COLOR_MAP[status.overallColor] || COLOR_MAP.yellow;
  }, [fetchLoading, status]);

  const headline  = fetchLoading || !status ? 'Checking systems...' : (status.headline || status.summary || 'Status unknown');
  const badgeText = fetchLoading || !status ? 'Loading'            : (status.badgeText || status.overallStatus || '—');
  const updatedLabel = status?.updatedTimeLabel || `Updated: ${dashboardUpdatedAt}`;

  return (
    <motion.div
      initial={hasAnimated ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="dashboard-section-card"
      style={{
        ...(colors.cardBg     ? { background: colors.cardBg }    : {}),
        ...(colors.cardBorder ? { border: colors.cardBorder }     : {}),
      }}
    >
      {/* Header */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-header-left">
          <Activity size={16} color="#667eea" />
          <h3 className="dashboard-section-title">Application Status</h3>
        </div>
        <span className="dashboard-section-meta">{updatedLabel}</span>
      </div>

      {/* Status row */}
      <div style={{ padding: '12px 16px 14px' }}>
        <div className="app-status-summary">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="dashboard-pulse-dot"
              style={{ width: '12px', height: '12px', background: colors.dot, boxShadow: colors.shadow }}
            />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{headline}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: colors.label }}>{badgeText}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ApplicationStatusSection;
