import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

const DEFAULT_FILTERS = {
  sourceApp: 'All',
  subscription: 'All',
  status: 'All',
  eventType: 'All',
  fileId: '',
  sourceFile: '',
  fileCreated: '',
  eventFrom: '',
  eventTo: '',
};

const NonDtcAuditFilter = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let allData = [];
        let token = null;
        do {
          const response = await api.fetchNonDtcAuditData(token, 100);
          allData = [...allData, ...(response.data || [])];
          token = response.continuationToken || null;
        } while (token);
        
        // Map SAP API fields
        const mappedData = allData.map(item => ({
          uniqueId: item.id || '',
          sourceApp: item.sourceAppName || item.subscription || '-',
          subscription: item.subscription || '',
          sourceFile: item.sourceFileName || '',
          fileId: item.id || '',
          sourcePath: item.sourcePath || '',
          eventType: item.events?.[0]?.eventType || '',
          status: item.status || '',
          timestamp: item.timestamp || '',
          events: item.events || [],
          rawData: item
        }));
        
        setAuditData(mappedData);
      } catch (error) {
        console.error('Error fetching Non-DTC audit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
  };

  const handleApply = () => {
    navigate('/non-dtc-audit-detail', { state: { filters } });
  };

  // Build dropdown options
  const sourceAppOptions = ['All', ...new Set(auditData.map(r => r.sourceApp).filter(Boolean))].sort();
  const subscriptionOptions = ['All', ...new Set(auditData.map(r => r.subscription).filter(Boolean))].sort();
  const statusOptions = ['All', ...new Set(auditData.map(r => r.status).filter(Boolean))].sort();
  const eventTypeOptions = ['All', ...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort();

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
          {/* Primary Filters */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Primary Filters
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Source Application</label>
                <select value={filters.sourceApp} onChange={(e) => handleFilterChange('sourceApp', e.target.value)} style={selectStyle}>
                  {sourceAppOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subscription</label>
                <select value={filters.subscription} onChange={(e) => handleFilterChange('subscription', e.target.value)} style={selectStyle}>
                  {subscriptionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} style={selectStyle}>
                  {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Event Type</label>
                <select value={filters.eventType} onChange={(e) => handleFilterChange('eventType', e.target.value)} style={selectStyle}>
                  {eventTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Additional Filters */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Additional Filters
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Source File</label>
                <input
                  type="text"
                  value={filters.sourceFile}
                  onChange={(e) => handleFilterChange('sourceFile', e.target.value)}
                  placeholder="Enter source file name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>File ID</label>
                <input
                  type="text"
                  value={filters.fileId}
                  onChange={(e) => handleFilterChange('fileId', e.target.value)}
                  placeholder="Enter File ID"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>File Created</label>
                <input
                  type="date"
                  value={filters.fileCreated}
                  onChange={(e) => handleFilterChange('fileCreated', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Event From</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={filters.eventFrom}
                    onChange={(e) => handleFilterChange('eventFrom', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Event To</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={filters.eventTo}
                    onChange={(e) => handleFilterChange('eventTo', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '12px',
            paddingTop: '20px', borderTop: '1px solid #f1f5f9',
          }}>
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
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', background: '#667eea', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
              }}
            >
              <Search size={14} /> Apply Filters
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NonDtcAuditFilter;
