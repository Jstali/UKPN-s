import React, { useState, useEffect, useMemo } from 'react';

const NON_DTC_EVENT_TYPE_MAP = {
  '1': 'File Pickup from Source',
  '2': 'File Stored To Blob',
  '3': 'File Subscribe',
  '4': 'File Delivered',
};
const mapNonDtcEventType = (event) => {
  const raw = String(event.eventType || event.event_type || '');
  return event.description || NON_DTC_EVENT_TYPE_MAP[raw] || raw;
};
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import MultiCheckboxDropdown from '../components/MultiCheckboxDropdown';
import { useApp } from '../context/AppContext';

const ALL_COLUMNS = [
  { key: 'fileId', label: 'File ID' },
  { key: 'sourceAppName', label: 'Source App Name' },
  { key: 'sourceFileName', label: 'Source File Name' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'status', label: 'Status' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'changeFeedStatus', label: 'Change Feed Status' },
  { key: 'requestStatus', label: 'Request Status' },
  { key: 'processedTime', label: 'Processed Time' },
  { key: 'lastUpdatedAt', label: 'Last Updated At' },
];

const matchesMultiSelect = (selectedValue, actualValue) => {
  if (!selectedValue || selectedValue === 'All') return true;
  const selectedValues = selectedValue.split(',').map(v => v.trim()).filter(Boolean);
  return selectedValues.includes(actualValue);
};

const mapItem = (item) => ({
  fileId: item.id || '',
  sourceAppName: item.sourceAppName || '',
  sourceFileName: item.sourceFileName || '',
  subscription: item.subscription || '',
  status: item.status || '',
  timestamp: item.timestamp || '',
  eventType: item.events?.[0]?.eventType || item.eventType || '',
  changeFeedStatus: item.changeFeedStatus || '',
  requestStatus: item.requestStatus || '',
  processedTime: item.processedTime || '',
  lastUpdatedAt: item.lastUpdatedAt || '',
  rawData: item,
});

const formatValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  return String(value);
};

const NonDtcAuditDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const defaultFilters = {
    sourceApp: 'All',
    subscription: 'All',
    eventType: 'All',
    status: 'All',
    fileId: '',
  };

  const { nonDtcAuditData, loading, dataComplete, nonDtcFetchError } = useApp();
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [hasQueried, setHasQueried] = useState(true);
  const [filteredResults, setFilteredResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const auditData = useMemo(() => (nonDtcAuditData || []).map(mapItem), [nonDtcAuditData]);
  const selectedRecord = useMemo(() => {
    const navRecord = location.state?.record;
    if (!navRecord) return null;
    const selectedId = navRecord.uniqueId || navRecord.fileId || navRecord.id;
    const matched = (nonDtcAuditData || []).find(item => (item.id || '') === selectedId);
    return matched ? mapItem(matched) : navRecord;
  }, [location.state, nonDtcAuditData]);

  // Initialise filteredResults when data loads (no nav-state filters)
  useEffect(() => {
    if (!location.state?.filters && auditData.length > 0 && filteredResults.length === 0) {
      setFilteredResults(auditData);
    }
  }, [auditData, location.state, filteredResults.length]);

  // Apply filters from navigation state
  useEffect(() => {
    if (location.state?.filters && auditData.length > 0) {
      const incomingFilters = location.state.filters;
      setFilters(incomingFilters);
      
      let results = [...auditData];
      results = results.filter(r => matchesMultiSelect(incomingFilters.sourceApp, r.sourceAppName));
      results = results.filter(r => matchesMultiSelect(incomingFilters.subscription, r.subscription));
      results = results.filter(r => matchesMultiSelect(incomingFilters.status, r.status));
      results = results.filter(r => matchesMultiSelect(incomingFilters.eventType, r.eventType));
      if (incomingFilters.sourceFile) results = results.filter(r => r.sourceFileName?.toLowerCase().includes(incomingFilters.sourceFile.toLowerCase()));
      if (incomingFilters.fileId) results = results.filter(r => r.fileId?.includes(incomingFilters.fileId));
      if (incomingFilters.fileCreated) {
        results = results.filter(r => {
          const fileDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return fileDate === incomingFilters.fileCreated;
        });
      }
      if (incomingFilters.eventFrom) {
        results = results.filter(r => {
          const eventDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return eventDate >= incomingFilters.eventFrom;
        });
      }
      if (incomingFilters.eventTo) {
        results = results.filter(r => {
          const eventDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return eventDate <= incomingFilters.eventTo;
        });
      }
      
      setFilteredResults(results);
      setHasQueried(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, auditData]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...defaultFilters });
    setFilteredResults(auditData);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleQuery = () => {
    let results = [...auditData];
    results = results.filter(r => matchesMultiSelect(filters.sourceApp, r.sourceAppName));
    results = results.filter(r => matchesMultiSelect(filters.subscription, r.subscription));
    results = results.filter(r => matchesMultiSelect(filters.eventType, r.eventType));
    results = results.filter(r => matchesMultiSelect(filters.status, r.status));
    if (filters.fileId) results = results.filter(r => r.fileId && r.fileId.includes(filters.fileId));
    setFilteredResults(results);
    setCurrentPage(1);
    setHasQueried(true);
  };

  // Build dropdown options
  const flowOptions = [...new Set(auditData.map(r => r.sourceAppName).filter(Boolean))].sort();
  const eventTypeOptions = [...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort();
  const statusOptions = [...new Set(auditData.map(r => r.status).filter(Boolean))].sort();

  // Search + paginate
  const searchedResults = filteredResults.filter(row =>
    !searchTerm || Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const totalPages = Math.ceil(searchedResults.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = searchedResults.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

  if (selectedRecord) {
    const raw = selectedRecord.rawData || {};
    const summaryFields = [
      { label: 'File ID (id)', value: raw.id || selectedRecord.fileId },
      { label: 'Source App Name', value: raw.sourceAppName },
      { label: 'Source File Name', value: raw.sourceFileName },
      { label: 'Subscription', value: raw.subscription },
      { label: 'Status', value: raw.status || selectedRecord.status },
      { label: 'Timestamp', value: raw.timestamp || selectedRecord.timestamp },
      { label: 'Change Feed Status', value: raw.changeFeedStatus },
      { label: 'Request Status', value: raw.requestStatus },
      { label: 'Processed Time', value: raw.processedTime },
      { label: 'Last Updated At', value: raw.lastUpdatedAt },
    ];

    return (
      <motion.div className="page-container dtc-audit-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
          <Link to="/" style={{ color: '#4c4ebd', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={12} />
          <Link to="/non-dtc-audit" style={{ color: '#4c4ebd', textDecoration: 'none' }}>Non DTC Audit</Link>
          <ChevronRight size={12} />
          <span style={{ color: '#1e293b', fontWeight: 600 }}>Details</span>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate(location.state?.returnPath || '/non-dtc-audit')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#4c4ebd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={() => setShowPreview(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedRecord.sourceFile || selectedRecord.uniqueId || 'non_dtc_audit_details'}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <Download size={16} />
            Download
          </button>
        </div>

        {showPreview && (
          <div
            onClick={() => setShowPreview(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Record Preview</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedRecord.sourceFile || selectedRecord.uniqueId || 'non_dtc_audit_details'}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ background: '#10b981', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', padding: '0', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.6', overflow: 'auto', margin: 0, border: '1px solid #e2e8f0', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Audit Record Details</h2>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Summary Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px' }}>
                {summaryFields.map((field) => (
                  <div key={field.label} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', background: '#fff' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>{field.label}:</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', wordBreak: 'break-word' }}>{formatValue(field.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {raw.events && raw.events.length > 0 && (
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Events ({raw.events.length})
                </h3>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {['#', 'Event Type', 'Status', 'Timestamp', 'Application', 'Processed'].map(col => (
                          <th key={col} style={{ padding: '8px 14px', background: '#27187e', color: '#fff', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {raw.events.map((event, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                          <td style={{ padding: '8px 14px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 14px' }}>{formatValue(mapNonDtcEventType(event))}</td>
                          <td style={{ padding: '8px 14px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                              background: (event.status || '').toLowerCase() === 'success' ? '#dcfce7' : (event.status || '').toLowerCase().includes('fail') ? '#fef2f2' : '#f1f5f9',
                              color: (event.status || '').toLowerCase() === 'success' ? '#16a34a' : (event.status || '').toLowerCase().includes('fail') ? '#dc2626' : '#475569',
                            }}>
                              {formatValue(event.status)}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>{event.timestamp ? new Date(event.timestamp).toLocaleString('en-GB') : '-'}</td>
                          <td style={{ padding: '8px 14px' }}>{formatValue(event.applicationName)}</td>
                          <td style={{ padding: '8px 14px' }}>{event.processed !== undefined ? String(event.processed) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Detail View</span>
      </div>

      {/* Filter Section */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
        marginBottom: '16px', overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Source Application</label>
              <MultiCheckboxDropdown
                value={filters.sourceApp}
                onChange={(value) => handleFilterChange('sourceApp', value)}
                options={flowOptions}
              />
            </div>
            <div>
              <label style={labelStyle}>Event Type</label>
              <MultiCheckboxDropdown
                value={filters.eventType}
                onChange={(value) => handleFilterChange('eventType', value)}
                options={eventTypeOptions}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <MultiCheckboxDropdown
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                options={statusOptions}
              />
            </div>
            <div>
              <label style={labelStyle}>File ID</label>
              <input type="text" value={filters.fileId} onChange={(e) => handleFilterChange('fileId', e.target.value)} placeholder="Enter File ID" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc'
        }}>
          <button onClick={handleReset} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: '#f1f5f9', color: '#475569',
            border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
          }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handleQuery} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: '#667eea', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
          }}>
            <Search size={14} /> Apply Filters
          </button>
        </div>
      </div>

      {/* API error banner */}
      {nonDtcFetchError && nonDtcAuditData.length === 0 && (
        <div style={{
          marginBottom: '16px', padding: '16px 20px', background: '#fff7ed',
          border: '1px solid #fed7aa', borderRadius: '10px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <div style={{ fontSize: '22px', lineHeight: 1 }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>
              Non-DTC (SAP) API Unavailable
            </div>
            <div style={{ color: '#78350f', fontSize: '13px' }}>
              {nonDtcFetchError} — This API may require VPN or AVD access.
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {(loading || (!dataComplete && nonDtcAuditData.length === 0 && !nonDtcFetchError)) && (
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
          Loading Non-DTC audit data...
        </div>
      )}

      {/* Results Table */}
      {!loading && dataComplete && hasQueried && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
            overflow: 'hidden', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          {/* Table toolbar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Results: {searchedResults.length} records
              </span>
              <input
                type="text"
                placeholder="Search results..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '6px',
                  fontSize: '12px', outline: 'none', width: '200px',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={200}>200 per page</option>
              </select>
            </div>
          </div>

          {/* Horizontally scrollable table */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {ALL_COLUMNS.map(col => (
                    <th key={col.key} style={{
                      position: 'sticky', top: 0, zIndex: 10,
                      background: '#27187e', color: '#fff',
                      padding: '8px 14px', fontSize: '11px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      whiteSpace: 'nowrap', textAlign: 'left',
                      borderBottom: '2px solid #1a1160',
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_COLUMNS.length} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                      {ALL_COLUMNS.map(col => (
                        <td key={col.key} style={{
                          padding: '7px 14px', fontSize: '12px', color: '#334155',
                          whiteSpace: 'nowrap', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                        title={String(row[col.key] || '')}
                        >
                          {col.key === 'status' ? (
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                              background: (row[col.key] || '').toLowerCase() === 'success' ? '#dcfce7' : (row[col.key] || '').toLowerCase() === 'failed' ? '#fef2f2' : '#f1f5f9',
                              color: (row[col.key] || '').toLowerCase() === 'success' ? '#16a34a' : (row[col.key] || '').toLowerCase() === 'failed' ? '#dc2626' : '#475569',
                            }}>
                              {row[col.key] || ''}
                            </span>
                          ) : (
                            row[col.key] || ''
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px', borderTop: '1px solid #f1f5f9', background: '#fff',
          }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {searchedResults.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, searchedResults.length)} of {searchedResults.length} entries
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentPage === 1 ? '#f3f4f6' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentPage === totalPages ? '#f3f4f6' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default NonDtcAuditDetail;
