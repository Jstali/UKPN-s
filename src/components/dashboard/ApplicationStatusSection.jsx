import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const ApplicationStatusSection = ({
  dashboardUpdatedAt,
  loading = false,
  fetchError = null,
  nonDtcFetchError = null,
  hasAuditData = false,
}) => {
  const [hasAnimated, setHasAnimated] = React.useState(false);

  React.useEffect(() => {
    setHasAnimated(true);
  }, []);

  const hasDtcError = Boolean(fetchError);
  const hasNonDtcError = Boolean(nonDtcFetchError);
  const hasAnyError = hasDtcError || hasNonDtcError;

  const statusConfig = React.useMemo(() => {
    if (loading && !hasAuditData) {
      return {
        label: 'Checking systems',
        state: 'Loading',
        stateColor: '#475569',
        dotColor: '#94a3b8',
        dotShadow: '0 0 0 3px rgba(148, 163, 184, 0.2), 0 0 8px rgba(148, 163, 184, 0.3)',
      };
    }

    if (hasAnyError && !hasAuditData) {
      return {
        label: 'Audit APIs unavailable',
        state: 'Unavailable',
        stateColor: '#dc2626',
        dotColor: '#ef4444',
        dotShadow: '0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 8px rgba(239, 68, 68, 0.3)',
      };
    }

    if (hasAnyError) {
      const degradedParts = [
        hasDtcError ? 'DTC' : null,
        hasNonDtcError ? 'Non-DTC' : null,
      ].filter(Boolean);

      return {
        label: `${degradedParts.join(' + ')} API issue detected`,
        state: 'Degraded',
        stateColor: '#d97706',
        dotColor: '#f59e0b',
        dotShadow: '0 0 0 3px rgba(245, 158, 11, 0.2), 0 0 8px rgba(245, 158, 11, 0.3)',
      };
    }

    return {
      label: 'All Systems Operational',
      state: 'Healthy',
      stateColor: '#16a34a',
      dotColor: '#22c55e',
      dotShadow: '0 0 0 3px rgba(34, 197, 94, 0.2), 0 0 8px rgba(34, 197, 94, 0.3)',
    };
  }, [loading, hasAuditData, hasAnyError, hasDtcError, hasNonDtcError]);

  return (
    <motion.div
      initial={hasAnimated ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="dashboard-section-card"
    >
      {/* Header */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-header-left">
          <Activity size={16} color="#667eea" />
          <h3 className="dashboard-section-title">Application Status</h3>
        </div>
        <span className="dashboard-section-meta">
          Updated: {dashboardUpdatedAt}
        </span>
      </div>

      {/* Compact overall status */}
      <div style={{ padding: '12px 16px 14px' }}>
        <div className="app-status-summary">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dashboard-pulse-dot" style={{
              width: '12px', height: '12px', background: statusConfig.dotColor,
              boxShadow: statusConfig.dotShadow,
            }} />
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{statusConfig.label}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: statusConfig.stateColor }}>{statusConfig.state}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ApplicationStatusSection;
