import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

const DEFAULT_FILTERS = {
  flow: 'All',
  sourceApp: 'All',
  destinationApp: 'All',
  eventType: 'All',
  eventFrom: '',
  eventFromTime: '',
  eventTo: '',
  eventToTime: '',
  fileCreated: '',
  fileCreatedTime: '',
  publishDate: '',
  fileId: 'All',
};

const NonDtcAuditFilter = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const { nonDtcAuditData, loading } = useApp();

  const auditData = useMemo(() => (nonDtcAuditData || []).map(item => ({
    uniqueId: item.id || '',
    flow: item.flow || '-',
    sourceApp: item.sourceAppName || item.subscription || '-',
    destinationApp: item.destinationApp || '-',
    eventType: item.events?.[0]?.eventType || '',
    fileId: item.id || '',
    timestamp: item.timestamp || '',
    events: item.events || [],
    rawData: item
  })), [nonDtcAuditData]);

  const [dateError, setDateError] = useState('');

  const validateDateRange = (updatedFilters) => {
    const f = updatedFilters || filters;
    const fromDate = f.eventFrom;
    const toDate = f.eventTo;
    const now = new Date();

    if (fromDate) {
      const fromDateTime = new Date(`${fromDate}T${f.eventFromTime || '00:00:00'}`);
      if (fromDateTime > now) {
        setDateError('Event From date cannot be a future date. No data will exist for future dates.');
        return false;
      }
    }

    if (toDate) {
      const toDateTime = new Date(`${toDate}T${f.eventToTime || '23:59:59'}`);
      if (toDateTime > now) {
        setDateError('Event To date cannot be a future date. No data will exist for future dates.');
        return false;
      }
    }

    if (fromDate && toDate) {
      const fromDateTime = new Date(`${fromDate}T${f.eventFromTime || '00:00:00'}`);
      const toDateTime = new Date(`${toDate}T${f.eventToTime || '23:59:59'}`);
      if (fromDateTime > toDateTime) {
        setDateError('Event From date cannot be later than Event To date.');
        return false;
      }
    }

    setDateError('');
    return true;
  };

  const handleFilterChange = (field, value) => {
    const updatedFilters = { ...filters, [field]: value };
    setFilters(updatedFilters);
    if (['eventFrom', 'eventFromTime', 'eventTo', 'eventToTime'].includes(field)) {
      validateDateRange(updatedFilters);
    }
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setDateError('');
  };

  const handleApply = () => {
    if (!validateDateRange()) return;
    navigate('/non-dtc-audit-detail', { state: { filters } });
  };

  // Build dropdown options
  const flowOptions = ['All', ...new Set(auditData.map(r => r.flow).filter(Boolean))].sort();
  const sourceAppOptions = ['All', ...new Set(auditData.map(r => r.sourceApp).filter(Boolean))].sort();
  const destinationAppOptions = ['All', ...new Set(auditData.map(r => r.destinationApp).filter(Boolean))].sort();
  const eventTypeOptions = ['All', ...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort();
  const fileIdOptions = ['All', ...new Set(auditData.map(r => r.fileId).filter(Boolean))].sort();

  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const selectStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none' };
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '20px 24px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/non-dtc-audit')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: '#667eea', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
          }}
        >
          <ArrowLeft size={15} /> Back to Audit
        </button>
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Advanced Filters</span>
      </div>

      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px', flexDirection: 'column', gap: '14px',
          color: '#64748b', fontSize: '14px', fontWeight: 500,
        }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid #e2e8f0',
            borderTopColor: '#667eea', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading filter options...
        </div>
      ) : (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
          padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          {/* All Filters */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Flow</label>
                <select value={filters.flow} onChange={(e) => handleFilterChange('flow', e.target.value)} style={selectStyle}>
                  {flowOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Source Application</label>
                <select value={filters.sourceApp} onChange={(e) => handleFilterChange('sourceApp', e.target.value)} style={selectStyle}>
                  {sourceAppOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Destination Application</label>
                <select value={filters.destinationApp} onChange={(e) => handleFilterChange('destinationApp', e.target.value)} style={selectStyle}>
                  {destinationAppOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Event Type</label>
                <select value={filters.eventType} onChange={(e) => handleFilterChange('eventType', e.target.value)} style={selectStyle}>
                  {eventTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Event From</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={filters.eventFrom}
                    onChange={(e) => handleFilterChange('eventFrom', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="time"
                    value={filters.eventFromTime}
                    onChange={(e) => handleFilterChange('eventFromTime', e.target.value)}
                    style={{ ...inputStyle, width: '120px' }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Event To</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={filters.eventTo}
                    onChange={(e) => handleFilterChange('eventTo', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="time"
                    value={filters.eventToTime}
                    onChange={(e) => handleFilterChange('eventToTime', e.target.value)}
                    style={{ ...inputStyle, width: '120px' }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>File Created</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={filters.fileCreated}
                    onChange={(e) => handleFilterChange('fileCreated', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="time"
                    value={filters.fileCreatedTime}
                    onChange={(e) => handleFilterChange('fileCreatedTime', e.target.value)}
                    style={{ ...inputStyle, width: '120px' }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Publish Date</label>
                <input
                  type="date"
                  value={filters.publishDate}
                  onChange={(e) => handleFilterChange('publishDate', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>File ID</label>
                <select value={filters.fileId} onChange={(e) => handleFilterChange('fileId', e.target.value)} style={selectStyle}>
                  {fileIdOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            paddingTop: '20px', borderTop: '1px solid #f1f5f9',
          }}>
            {dateError && (
              <div style={{
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '12px',
                fontWeight: 500,
              }}>
                ⚠️ {dateError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleReset}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', background: '#f1f5f9', color: '#475569',
                  border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600,
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={handleApply}
                disabled={!!dateError}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', background: '#667eea', color: 'white',
                  border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600,
                  opacity: dateError ? 0.5 : 1,
                  cursor: dateError ? 'not-allowed' : 'pointer',
                }}
              >
                <Search size={14} /> Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NonDtcAuditFilter;
