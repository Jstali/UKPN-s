import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { APP_STATUS_ITEMS } from '../../data/dashboardConfig';

const ApplicationStatusSection = ({ dashboardUpdatedAt }) => {
  return (
    <div style={{ padding: '10px 24px', marginTop: '16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="#667eea" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Application Status</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
            Last checked: {dashboardUpdatedAt}
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#10b981',
            background: '#ecfdf5', padding: '4px 12px', borderRadius: '20px',
            border: '1px solid #a7f3d0'
          }}>Live Monitoring</span>
        </div>

        {/* Overall Status */}
        <div style={{ padding: '18px 24px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: '12px',
              border: '1.5px solid #d1fae5', background: '#f0fdf4'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2), 0 0 8px rgba(34, 197, 94, 0.3)',
                flexShrink: 0,
                animation: 'pulse-dot 2s ease-in-out infinite'
              }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>All Systems Operational</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{APP_STATUS_ITEMS.length} applications monitored</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>Healthy</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>99.7% avg uptime</div>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
};

export default ApplicationStatusSection;
