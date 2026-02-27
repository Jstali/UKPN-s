import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { APP_STATUS_ITEMS } from '../../data/dashboardConfig';

const ApplicationStatusSection = ({ dashboardUpdatedAt }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
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
          Updated: {dashboardUpdatedAt} &middot; <span style={{ color: '#10b981', fontWeight: 600 }}>Live — Last 24 hours</span>
        </span>
      </div>

      {/* Compact overall status */}
      <div style={{ padding: '12px 16px 14px' }}>
        <div className="app-status-summary">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dashboard-pulse-dot" style={{
              width: '12px', height: '12px', background: '#22c55e',
              boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2), 0 0 8px rgba(34, 197, 94, 0.3)',
            }} />
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>All Systems Operational</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '10px' }}>{APP_STATUS_ITEMS.length} apps monitored</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Healthy</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>99.7% avg uptime</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ApplicationStatusSection;
