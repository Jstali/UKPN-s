import React from 'react';
import { motion } from 'framer-motion';
import { Filter, X, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedCounter from '../AnimatedCounter';
import { FILE_STATUS_ITEMS } from '../../data/dashboardConfig';
import { useApp } from '../../context/AppContext';

const FileStatusSection = ({ fileStats, dashboardUpdatedAt, onShowDetails, loading }) => {
  const items = React.useMemo(() => FILE_STATUS_ITEMS(fileStats || {}), [fileStats]);
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const { user, auditData } = useApp();
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const navigate = useNavigate();

  React.useEffect(() => {
    setHasAnimated(true);
  }, []);

  const isSupportTeam = user?.role === 'Core Support' || user?.role === 'Admin';

  const applyFilter = () => {
    const filteredData = auditData.filter(item => {
      // Date filter
      if (startDate || endDate) {
        const itemDate = new Date(item.Created || item.timestamp);
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate && itemDate > new Date(endDate + 'T23:59:59')) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const hasDelivered = item.events?.some(e => String(e.Event_Type) === '4');
        const hasFailed = item.events?.some(e => {
          const s = (e.Status || e.status || '').toLowerCase();
          if (s === 'duplicate checksum') return false;
          return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
        });
        const hasDuplicateChecksum = item.events?.some(e => 
          (e.Status || e.status || '').toLowerCase() === 'duplicate checksum'
        );

        if (statusFilter === 'delivered' && !hasDelivered) return false;
        if (statusFilter === 'pending' && hasDelivered) return false;
        if (statusFilter === 'failed' && !hasFailed) return false;
        if (statusFilter === 'duplicate' && !hasDuplicateChecksum) return false;
      }

      return true;
    });

    navigate('/filtered-file-status', { state: { filteredData, startDate, endDate, statusFilter } });
    setShowFilterModal(false);
  };

  return (
    <>
      <motion.div
        initial={hasAnimated ? false : { opacity: 0, y: 20 }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isSupportTeam && (
              <button
                onClick={() => setShowFilterModal(true)}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                <Filter size={14} />
                Filter
              </button>
            )}
            <span className="dashboard-section-meta">
              Updated: {dashboardUpdatedAt}
            </span>
          </div>
        </div>

      {/* Cards Grid — responsive 3 cols on large, 2 on medium, 1 on small */}
      <div className="metrics-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="metrics-card"
              style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'default' }}
            >
              <div style={{ width: 30, height: 30, borderRadius: '6px', background: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '40%', height: '18px', borderRadius: '4px', background: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '70%', height: '12px', borderRadius: '4px', background: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          ))
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.key}
              initial={hasAnimated ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: hasAnimated ? 0 : 0.4 + index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
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
          ))
        )}
      </div>
    </motion.div>

    {/* Filter Modal */}
    {showFilterModal && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999,
      }} onClick={() => setShowFilterModal(false)}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: 'white', borderRadius: '12px', width: '90%',
          maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
              Filter File Status
            </h3>
            <button onClick={() => setShowFilterModal(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', display: 'flex', alignItems: 'center',
            }}>
              <X size={20} color="#64748b" />
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                Status Type
              </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px',
              }}>
                <option value="all">All Files</option>
                <option value="delivered">Delivered Files</option>
                <option value="pending">Pending Files</option>
                <option value="failed">Failed Files</option>
                <option value="duplicate">Duplicate Checksum</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                Start Date
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px',
              }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                End Date
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px',
              }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('all'); }} style={{
                flex: 1, padding: '10px', background: '#f1f5f9', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569',
              }}>
                Clear
              </button>
              <button onClick={applyFilter} style={{
                flex: 1, padding: '10px', background: '#3b82f6', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#fff',
              }}>
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default FileStatusSection;
