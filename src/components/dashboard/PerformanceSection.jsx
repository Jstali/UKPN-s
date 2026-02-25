import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gauge, Clock } from 'lucide-react';
import { PERFORMANCE_ITEMS } from '../../data/dashboardConfig';

const PerformanceSection = ({ dashboardUpdatedAt }) => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '10px 24px', marginTop: '16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
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
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9', position: 'relative'
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gauge size={18} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Performance — Avg File Processing Time</h3>
          </div>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
            Updated: {dashboardUpdatedAt}
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#8b5cf6',
            background: '#f5f3ff', padding: '4px 12px', borderRadius: '20px',
            border: '1px solid #c4b5fd', flexShrink: 0
          }}>Last 24 hours</span>
        </div>

        <div style={{ padding: '18px 24px' }}>
          {/* Overall Average */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', background: '#f8fafc', borderRadius: '10px', marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="#64748b" />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>Overall Average</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>2.4s</div>
          </div>

          {/* Per-Application Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {PERFORMANCE_ITEMS.map((app, index) => {
              const ratio = Math.min(app.actual / (app.threshold * 2), 1);

              return (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.06 }}
                  onClick={() => navigate('/performance-graph', { state: { app } })}
                  style={{
                    padding: '16px 16px', borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{app.name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>{app.avgTime}</span>
                  </div>

                  <div style={{
                    height: '7px', background: '#f1f5f9', borderRadius: '4px',
                    overflow: 'hidden', marginBottom: '8px'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ delay: 0.8 + index * 0.06, duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', background: '#22c55e', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>{app.files} files processed</span>
                    <span>Threshold: {app.threshold}s</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PerformanceSection;
