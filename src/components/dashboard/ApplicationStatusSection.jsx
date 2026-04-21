import React from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Normalise any API response shape into a flat array of { name, healthy }
const normalizeApps = (data) => {
  if (!data) return [];

  // Array of app objects
  if (Array.isArray(data)) {
    return data.map((item) => ({
      name: item.applicationName || item.name || item.service || item.component || 'Application',
      healthy: /healthy|up|ok|green|running|active/i.test(String(item.status || item.health || '')),
    }));
  }

  // Object with a nested components map (e.g. Spring Boot Actuator style)
  if (data.components && typeof data.components === 'object') {
    return Object.entries(data.components).map(([key, val]) => ({
      name: key,
      healthy: /healthy|up|ok/i.test(String(val?.status || '')),
    }));
  }

  // Single status object — wrap into a one-item list
  const isHealthy = /healthy|up|ok|green|running|active/i.test(
    String(data.status || data.health || data.overallStatus || '')
  );
  return [{ name: data.applicationName || data.name || 'System', healthy: isHealthy }];
};

const ApplicationStatusSection = ({ dashboardUpdatedAt }) => {
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const [apps, setApps] = React.useState([]);
  const [fetchLoading, setFetchLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState('');

  React.useEffect(() => { setHasAnimated(true); }, []);

  const loadStatus = React.useCallback(async () => {
    setFetchError(null);
    try {
      const data = await api.fetchApplicationStatus();
      setApps(normalizeApps(data));
    } catch (err) {
      setFetchError('Unable to reach status API');
      setApps([]);
    } finally {
      setFetchLoading(false);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, []);

  React.useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const anyUnhealthy = apps.some((a) => !a.healthy);
  const allHealthy   = apps.length > 0 && apps.every((a) => a.healthy);

  const overallDot    = fetchLoading ? '#94a3b8' : anyUnhealthy ? '#ef4444' : allHealthy ? '#22c55e' : '#94a3b8';
  const overallShadow = fetchLoading
    ? '0 0 0 3px rgba(148,163,184,0.2)'
    : anyUnhealthy
      ? '0 0 0 3px rgba(239,68,68,0.2), 0 0 8px rgba(239,68,68,0.3)'
      : '0 0 0 3px rgba(34,197,94,0.2), 0 0 8px rgba(34,197,94,0.3)';
  const overallLabel  = fetchLoading ? 'Checking…' : anyUnhealthy ? 'Degraded' : allHealthy ? 'All Systems Operational' : '—';

  const updatedLabel = lastUpdated ? `Updated: ${lastUpdated}` : `Updated: ${dashboardUpdatedAt}`;

  return (
    <motion.div
      initial={hasAnimated ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="dashboard-section-card"
      style={anyUnhealthy ? { background: '#fef2f2', border: '1.5px solid #fecaca' } : {}}
    >
      {/* Header */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-header-left">
          <Activity size={16} color="#667eea" />
          <h3 className="dashboard-section-title">Application Status</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadStatus}
            title="Refresh"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={13} />
          </button>
          <span className="dashboard-section-meta">{updatedLabel}</span>
        </div>
      </div>

      <div style={{ padding: '10px 16px 14px' }}>
        {/* Overall summary row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: apps.length > 0 ? '10px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="dashboard-pulse-dot"
              style={{ width: '12px', height: '12px', background: overallDot, boxShadow: overallShadow }}
            />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{overallLabel}</span>
          </div>
          {!fetchLoading && apps.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: anyUnhealthy ? '#dc2626' : '#16a34a' }}>
              {anyUnhealthy
                ? `${apps.filter(a => !a.healthy).length} unhealthy`
                : `${apps.length} healthy`}
            </span>
          )}
        </div>

        {/* Per-app rows */}
        {fetchLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '32px', borderRadius: '6px', background: '#f1f5f9', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!fetchLoading && fetchError && (
          <div style={{ fontSize: '12px', color: '#b91c1c', padding: '6px 0' }}>{fetchError}</div>
        )}

        {!fetchLoading && !fetchError && apps.length === 0 && (
          <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>No application data returned.</div>
        )}

        {!fetchLoading && apps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {apps.map((app) => (
              <div
                key={app.name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '7px',
                  background: app.healthy ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${app.healthy ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: app.healthy ? '#22c55e' : '#ef4444',
                    boxShadow: app.healthy
                      ? '0 0 0 2px rgba(34,197,94,0.2)'
                      : '0 0 0 2px rgba(239,68,68,0.2)',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{app.name}</span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  color: app.healthy ? '#16a34a' : '#dc2626',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {app.healthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ApplicationStatusSection;
