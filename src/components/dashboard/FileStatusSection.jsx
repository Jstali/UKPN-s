import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '../AnimatedCounter';
import { FILE_STATUS_ITEMS } from '../../data/dashboardConfig';

const FileStatusSection = ({ auditDataLength, dashboardUpdatedAt, onShowDetails }) => {
  const items = FILE_STATUS_ITEMS(auditDataLength);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="dashboard-section-card"
    >
      {/* Header */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-header-left">
          <div className="dashboard-pulse-dot" style={{ background: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' }} />
          <h3 className="dashboard-section-title">File Status</h3>
        </div>
        <span className="dashboard-section-meta">
          Updated: {dashboardUpdatedAt}
        </span>
      </div>

      {/* Cards Grid — responsive 3 cols on large, 2 on medium, 1 on small */}
      <div className="metrics-grid">
        {items.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => onShowDetails(item.key)}
            className="metrics-card"
            style={{ border: `1.5px solid ${item.borderColor}`, background: item.bgColor }}
            whileHover={{ y: -3, boxShadow: '0 6px 16px rgba(0,0,0,0.1)', scale: 1.02, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
          >
            <div className="metrics-card-icon">
              <img src={`${process.env.PUBLIC_URL}/${item.iconSrc}`} alt={item.label} style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: item.color, lineHeight: 1 }}>
                <AnimatedCounter value={item.value} />
              </div>
              <div className="metrics-card-label">{item.label}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default FileStatusSection;
