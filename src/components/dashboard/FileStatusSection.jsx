import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '../AnimatedCounter';
import { FILE_STATUS_ITEMS } from '../../data/dashboardConfig';

const FileStatusSection = ({ auditDataLength, dashboardUpdatedAt, onShowDetails }) => {
  const items = FILE_STATUS_ITEMS(auditDataLength);

  return (
    <div style={{ padding: '10px 24px', marginTop: '16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
              animation: 'pulse-dot 2s ease-in-out infinite'
            }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>File Status</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
            Updated: {dashboardUpdatedAt}
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#10b981',
            background: '#ecfdf5', padding: '4px 12px', borderRadius: '20px',
            border: '1px solid #a7f3d0'
          }}>Live — Last 24 hours</span>
        </div>

        {/* Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', padding: '18px 24px' }}>
          {items.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
              onClick={() => onShowDetails(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px 16px', borderRadius: '12px',
                border: `1.5px solid ${item.borderColor}`,
                background: item.bgColor, cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}>
                <img src={`${process.env.PUBLIC_URL}/${item.iconSrc}`} alt={item.label} style={{ width: 38, height: 38, objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: item.color, lineHeight: 1 }}>
                  <AnimatedCounter value={item.value} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginTop: '3px' }}>{item.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
};

export default FileStatusSection;
