import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gauge, Clock } from 'lucide-react';
import { PERFORMANCE_ITEMS } from '../../data/dashboardConfig';

const PerformanceSection = ({ dashboardUpdatedAt }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="dashboard-section-card"
      style={{}}
    >
      {/* Header */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-header-left">
          <Gauge size={16} color="#8b5cf6" />
          <h3 className="dashboard-section-title">Performance</h3>
        </div>
        <span className="dashboard-section-meta">
          Updated: {dashboardUpdatedAt} &middot; <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Last 24 hours</span>
        </span>
      </div>

      <div style={{ padding: '12px 16px 14px' }}>
        {/* Overall Average — compact row */}
        <div className="perf-overall-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={15} color="#64748b" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Overall Average</span>
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>2.4s</div>
        </div>

        {/* Performance Table */}
        <table className="performance-table">
          <thead>
            <tr>
              <th>System</th>
              <th>Avg Time</th>
              <th>Files</th>
              <th>Threshold</th>
            </tr>
          </thead>
          <tbody>
            {PERFORMANCE_ITEMS.map((app) => (
              <tr
                key={app.name}
                onClick={() => navigate('/performance-graph', { state: { app } })}
                className="performance-table-row"
              >
                <td style={{ fontWeight: 600, color: '#1e293b' }}>{app.name}</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>{app.avgTime}</td>
                <td>{app.files}</td>
                <td>{app.threshold}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default PerformanceSection;
