import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import MultiCheckboxDropdown from '../components/MultiCheckboxDropdown';
import FileViewModal from '../components/FileViewModal';
import DataTable from '../components/DataTable';
import { useApp } from '../context/AppContext';
import { flattenNonDtcAuditData, buildFilteredNonDtcResults } from '../utils/flattenUtils';

// Columns mirror the main Non-DTC Audit table so the detail-view results table
// surfaces the same data the user saw before navigating in.
// (Source / Destination / File Type / Source Path / Destination Path were missing.)
const ALL_COLUMNS = [
  { key: 'fileId', label: 'File ID' },
  { key: 'sourceAppName', label: 'Source App Name' },
  { key: 'sourceFileName', label: 'Source File Name' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'status', label: 'Status' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'fileType', label: 'File Type' },
  { key: 'sourcePath', label: 'Source Path' },
  { key: 'destinationPath', label: 'Destination Path' },
  { key: 'changeFeedStatus', label: 'Change Feed Status' },
  { key: 'requestStatus', label: 'Request Status' },
  { key: 'processedTime', label: 'Processed Time' },
  { key: 'lastUpdatedAt', label: 'Last Updated At' },
];

const formatValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  return String(value);
};

const NonDtcAuditDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const defaultFilters = {
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

  const { nonDtcAuditData, loading, dataComplete, nonDtcFetchError } = useApp();
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [hasQueried, setHasQueried] = useState(true);
  const [filteredResults, setFilteredResults] = useState([]);
  const [fileViewModal, setFileViewModal] = useState({ show: false, fileName: '', fileContent: '', loading: false, error: null });

  const handlePreview = (rawRecord) => {
    const fileName = (rawRecord?.sourceFileName || rawRecord?.id || 'non_dtc_record') + '.json';
    const content = JSON.stringify(rawRecord, null, 2);
    setFileViewModal({ show: true, fileName, fileContent: content, loading: false, error: null });
  };

  const handleDownload = (rawRecord) => {
    const fileName = (rawRecord?.sourceFileName || rawRecord?.id || 'non_dtc_record') + '.json';
    const content = JSON.stringify(rawRecord, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const auditData = useMemo(() => flattenNonDtcAuditData(nonDtcAuditData || []), [nonDtcAuditData]);
  const selectedRecord = useMemo(() => {
    const navRecord = location.state?.record;
    if (!navRecord) return null;
    return navRecord;
  }, [location.state]);

  // Build filter options from audit data
  const filterOptions = useMemo(() => ({
    flow:           [...new Set(auditData.map(r => r.flow).filter(Boolean))].sort(),
    sourceApp:      [...new Set(auditData.map(r => r.sourceApp).filter(Boolean))].sort(),
    destinationApp: [...new Set(auditData.map(r => r.application).filter(Boolean))].sort(),
    eventType:      [...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort(),
    fileId:         [...new Set(auditData.map(r => r.fileId).filter(Boolean))].sort(),
  }), [auditData]);

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
      const results = buildFilteredNonDtcResults(auditData, incomingFilters);
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
  };

  const handleQuery = () => {
    const results = buildFilteredNonDtcResults(auditData, filters);
    setFilteredResults(results);
    setHasQueried(true);
  };

  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const hasTableRows = filteredResults.length > 0;
  const shouldShowLoading =
    !hasTableRows &&
    (loading || (!dataComplete && nonDtcAuditData.length === 0 && !nonDtcFetchError));

  if (selectedRecord) {
    const raw = selectedRecord.rawData || {};
    // Summary mirrors the main Non-DTC table's columns so the user sees the same
    // fields they had in the table (Source / Destination / File Type / paths)
    // on top of the existing per-record metadata.
    const summaryFields = [
      { label: 'File ID (id)',       value: raw.id || selectedRecord.fileId },
      { label: 'Source App Name',    value: raw.sourceAppName },
      { label: 'Source File Name',   value: raw.sourceFileName },
      { label: 'Subscription',       value: raw.subscription },
      { label: 'Status',             value: raw.status || selectedRecord.status },
      { label: 'Timestamp',          value: raw.timestamp || selectedRecord.timestamp },
      { label: 'Source',             value: selectedRecord.sourceApplication },
      { label: 'Destination',        value: selectedRecord.application },
      { label: 'File Type',          value: selectedRecord.fileType },
      { label: 'Source Path',        value: selectedRecord.sourcePath },
      { label: 'Destination Path',   value: selectedRecord.destinationPath },
      { label: 'Change Feed Status', value: selectedRecord.changeFeedStatus || '—' },
      { label: 'Request Status',     value: selectedRecord.requestStatus    || '—' },
      { label: 'Processed Time',     value: selectedRecord.processedTime    || '—' },
      { label: 'Last Updated At',    value: selectedRecord.lastUpdatedAt    || raw.lastUpdatedAt || '—' },
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
            onClick={() => navigate(location.state?.returnPath || '/non-dtc-audit', {
              state: location.state
            })}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#4c4ebd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={() => handlePreview(raw)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            onClick={() => handleDownload(raw)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <Download size={16} />
            Download
          </button>
        </div>

        {fileViewModal.show && (
          <FileViewModal
            fileName={fileViewModal.fileName}
            fileContent={fileViewModal.fileContent}
            loading={fileViewModal.loading}
            error={fileViewModal.error}
            onClose={() => setFileViewModal({ show: false, fileName: '', fileContent: '', loading: false, error: null })}
            onDownload={() => handleDownload(raw)}
          />
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

            {/* Events section intentionally removed to match DTC detail page layout */}
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
          onClick={() => navigate('/non-dtc-audit', {
            state: location.state
          })}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Flow</label>
              <MultiCheckboxDropdown
                value={filters.flow}
                onChange={(value) => handleFilterChange('flow', value)}
                options={filterOptions.flow}
              />
            </div>
            <div>
              <label style={labelStyle}>Source Application</label>
              <MultiCheckboxDropdown
                value={filters.sourceApp}
                onChange={(value) => handleFilterChange('sourceApp', value)}
                options={filterOptions.sourceApp}
              />
            </div>
            <div>
              <label style={labelStyle}>Destination Application</label>
              <MultiCheckboxDropdown
                value={filters.destinationApp}
                onChange={(value) => handleFilterChange('destinationApp', value)}
                options={filterOptions.destinationApp}
              />
            </div>
            <div>
              <label style={labelStyle}>Event Type</label>
              <MultiCheckboxDropdown
                value={filters.eventType}
                onChange={(value) => handleFilterChange('eventType', value)}
                options={filterOptions.eventType}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr 0.8fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Event From</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="date"
                  value={filters.eventFrom}
                  onChange={(e) => handleFilterChange('eventFrom', e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                />
                <input
                  type="time"
                  value={filters.eventFromTime}
                  onChange={(e) => handleFilterChange('eventFromTime', e.target.value)}
                  style={{ ...inputStyle, width: '95px', padding: '7px 8px', fontSize: '12px' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Event To</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="date"
                  value={filters.eventTo}
                  onChange={(e) => handleFilterChange('eventTo', e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                />
                <input
                  type="time"
                  value={filters.eventToTime}
                  onChange={(e) => handleFilterChange('eventToTime', e.target.value)}
                  style={{ ...inputStyle, width: '95px', padding: '7px 8px', fontSize: '12px' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>File Creation</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="date"
                  value={filters.fileCreated}
                  onChange={(e) => handleFilterChange('fileCreated', e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                />
                <input
                  type="time"
                  value={filters.fileCreatedTime}
                  onChange={(e) => handleFilterChange('fileCreatedTime', e.target.value)}
                  style={{ ...inputStyle, width: '95px', padding: '7px 8px', fontSize: '12px' }}
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
              <MultiCheckboxDropdown
                value={filters.fileId}
                onChange={(value) => handleFilterChange('fileId', value)}
                options={filterOptions.fileId}
              />
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
      {shouldShowLoading && (
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
      {hasQueried && hasTableRows && (
        <DataTable
          tableId="non_dtc_audit_detail"
          data={filteredResults}
          columns={ALL_COLUMNS}
          exportColumns={ALL_COLUMNS}
          compactColumns={ALL_COLUMNS}
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={25}
          onDownload={true}
          exportConfig={{
            filename: 'Non_DTC_Audit_Detail_Export',
            pdfOptions: {
              orientation: 'landscape',
              pageFormat: 'a4',
              fontSize: 6,
              overflow: 'linebreak',
              horizontalPageBreak: true,
              horizontalPageBreakRepeat: [0, 1, 2],
              minCellWidth: 12,
              cellPadding: 2,
            },
          }}
        />
      )}
    </motion.div>
  );
};

export default NonDtcAuditDetail;
