import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, BarChart3, Activity, Filter, RotateCcw, ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { EVENT_TYPE_COLORS } from '../components/ColorBar';
import MultiCheckboxDropdown from '../components/MultiCheckboxDropdown';
import { useApp } from '../context/AppContext';
import { DEFAULT_COLUMNS_FULL } from '../data/dashboardConfig';

const NON_DTC_DEFAULT_COLUMNS = DEFAULT_COLUMNS_FULL.filter(
  ({ key }) => !['flow', 'version', 'fromRole', 'fromMPID', 'toRole', 'toMPID'].includes(key)
);

const formatDateTimeCell = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toLocaleString('en-GB');
};

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

const flattenNonDtcEvents = (data) => {
  const flatData = [];
  (data || []).forEach(item => {
    const events = item.events && item.events.length > 0 ? item.events : [{}];
    events.forEach(event => {
      flatData.push({
        uniqueId: item.id || '',
        flow: item.flow || item.sourceAppName || '-',
        version: item.version || item.subscription || '-',
        fileId: item.id || '-',
        timestamp: formatDateTimeCell(event.timestamp || item.timestamp || ''),
        fromRole: item.fromRole || '-',
        fromMPID: item.fromMPID || '-',
        toRole: item.toRole || '-',
        toMPID: item.toMPID || '-',
        sourceApplication: item.sourceAppName || '-',
        application: event.applicationName || item.destinationApplication || item.subscription || '-',
        fileName: item.sourceFileName || '-',
        sourceApp: item.sourceAppName || item.subscription || '-',
        sourceFile: item.sourceFileName || '',
        subscription: item.subscription || '',
        sourcePath: item.sourcePath || '',
        destinationPath: event.destinationPath || event.Destination_Path || item.destinationPath || '',
        eventType: mapNonDtcEventType(Object.keys(event).length ? event : { eventType: item.eventType }),
        startDate: item.events?.[0]?.timestamp ? new Date(item.events[0].timestamp).toLocaleString('en-GB') : '',
        endDate: item.events?.[item.events.length - 1]?.timestamp ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString('en-GB') : '',
        status: event.status || item.status || '',
        rawData: item,
      });
    });
  });
  return flatData;
};

const matchesMultiSelect = (selectedValue, actualValue) => {
  if (!selectedValue || selectedValue === 'All') return true;
  const selectedValues = selectedValue.split(',').map(v => v.trim()).filter(Boolean);
  return selectedValues.includes(actualValue);
};

const NON_DTC_COLUMNS = [
  ...NON_DTC_DEFAULT_COLUMNS,
  { key: 'sourcePath', label: 'Source Path' },
  { key: 'destinationPath', label: 'Destination Path' },
];

const NonDtcAudit = () => {
  const navigate = useNavigate();
  const { nonDtcAuditData, loading, dataComplete, nonDtcFetchError } = useApp();
  const [showBars, setShowBars] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sourceApp: 'All',
    subscription: 'All',
    status: 'All',
    eventType: 'All',
    sourceFile: '',
    fileId: '',
    fileCreated: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [hasQueried, setHasQueried] = useState(false);

  const auditData = useMemo(() => flattenNonDtcEvents(nonDtcAuditData || []), [nonDtcAuditData]);

  const filteredData = useMemo(() => {
    let result = [...auditData];
    result = result.filter(r => matchesMultiSelect(appliedFilters.sourceApp, r.sourceApp));
    result = result.filter(r => matchesMultiSelect(appliedFilters.subscription, r.subscription));
    result = result.filter(r => matchesMultiSelect(appliedFilters.status, r.status));
    result = result.filter(r => matchesMultiSelect(appliedFilters.eventType, r.eventType));
    if (appliedFilters.sourceFile)
      result = result.filter(r => r.sourceFile?.toLowerCase().includes(appliedFilters.sourceFile.toLowerCase()));
    if (appliedFilters.fileId)
      result = result.filter(r => r.fileId?.includes(appliedFilters.fileId));
    return result;
  }, [auditData, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
    setHasQueried(true);
    setShowFilters(false);
  };

  const resetFilters = () => {
    const empty = {
      sourceApp: 'All', subscription: 'All', status: 'All',
      eventType: 'All', sourceFile: '', fileId: '', fileCreated: '',
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setHasQueried(false);
  };

  const uniqueFlows = [...new Set(filteredData.map(r => r.sourceApp))].filter(Boolean).length;

  // Filter options always computed from full dataset (not filtered subset)
  const filterOptions = useMemo(() => ({
    sourceApp:    [...new Set(auditData.map(r => r.sourceApp).filter(Boolean))].sort(),
    subscription: [...new Set(auditData.map(r => r.subscription).filter(Boolean))].sort(),
    status:       [...new Set(auditData.map(r => r.status).filter(Boolean))].sort(),
    eventType:    [...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort(),
  }), [auditData]);

  const eventTypeCounts = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      const et = row.eventType || 'Unknown';
      counts[et] = (counts[et] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '13px', background: '#fff', cursor: 'pointer',
  };
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b',
    marginBottom: '4px', textTransform: 'uppercase',
  };

  return (
    <motion.div
      className="page-container non-dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header bar — identical structure to DTC Audit ── */}
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', background: '#667eea', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div className="dtc-breadcrumb-inline">
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Non DTC Audit</span>
          </div>
        </div>

        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <BarChart3 size={13} color="#6366f1" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Records</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{auditData.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <Activity size={13} color="#0ea5e9" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Apps</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{uniqueFlows}</span>
          </div>
          {hasQueried && (
            <div className="dtc-kpi-chip dtc-kpi-results" style={{ padding: '6px 12px', fontSize: '13px' }}>
              <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Results</span>
              <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{filteredData.length.toLocaleString()}</span>
            </div>
          )}
          <button
            className={`dtc-apps-toggle ${showBars ? 'active' : ''}`}
            onClick={() => setShowBars(!showBars)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            Charts
            <ChevronDown size={11} style={{ transform: showBars ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>
          {hasQueried && (
            <button onClick={resetFilters} className="dtc-reset-btn" style={{ padding: '6px 14px', fontSize: '13px' }}>
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <button
            className={`dtc-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            <Filter size={12} /> Filters
            <ChevronDown size={11} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>
        </div>
      </div>

      {/* ── Charts bar — identical position to DTC Audit ── */}
      <AnimatePresence>
        {showBars && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="dtc-apps-bar"
          >
            {eventTypeCounts.length > 0 && (
              <ColorBar data={eventTypeCounts} label="Event Type" colors={EVENT_TYPE_COLORS} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter panel — same margin/padding as DTC Audit (no lateral inset) ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ marginBottom: '8px', overflow: 'hidden' }}
          >
            <div style={{
              background: 'white', borderRadius: '12px', padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '11px', fontWeight: 700, color: '#64748b',
                  marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Primary Filters
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Source Application</label>
                    <MultiCheckboxDropdown
                      value={filters.sourceApp}
                      onChange={value => setFilters(prev => ({ ...prev, sourceApp: value }))}
                      options={filterOptions.sourceApp}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Subscription</label>
                    <MultiCheckboxDropdown
                      value={filters.subscription}
                      onChange={value => setFilters(prev => ({ ...prev, subscription: value }))}
                      options={filterOptions.subscription}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <MultiCheckboxDropdown
                      value={filters.status}
                      onChange={value => setFilters(prev => ({ ...prev, status: value }))}
                      options={filterOptions.status}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Event Type</label>
                    <MultiCheckboxDropdown
                      value={filters.eventType}
                      onChange={value => setFilters(prev => ({ ...prev, eventType: value }))}
                      options={filterOptions.eventType}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '11px', fontWeight: 700, color: '#64748b',
                  marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Additional Filters
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Source File</label>
                    <input
                      type="text"
                      value={filters.sourceFile}
                      onChange={e => setFilters({ ...filters, sourceFile: e.target.value })}
                      placeholder="Enter source file name"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>File ID</label>
                    <input
                      type="text"
                      value={filters.fileId}
                      onChange={e => setFilters({ ...filters, fileId: e.target.value })}
                      placeholder="Enter File ID"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>File Created</label>
                    <input
                      type="date"
                      value={filters.fileCreated}
                      onChange={e => setFilters({ ...filters, fileCreated: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', gap: '8px', justifyContent: 'flex-end',
                paddingTop: '12px', borderTop: '1px solid #f1f5f9',
              }}>
                <button
                  onClick={resetFilters}
                  style={{
                    padding: '8px 16px', background: '#f1f5f9', color: '#475569',
                    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  onClick={applyFilters}
                  style={{
                    padding: '8px 16px', background: '#667eea', color: 'white',
                    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter summary — same as DTC Audit's criteria bar ── */}
      {hasQueried && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px',
            marginBottom: '8px', padding: '8px 16px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            textAlign: 'center', fontSize: '12px', color: '#475569',
          }}
        >
          {filteredData.length === 0
            ? 'No Non-DTC audit records found matching your criteria'
            : <>Found <span style={{ fontWeight: 700, color: '#10b981' }}>{filteredData.length}</span> Non-DTC audit record{filteredData.length !== 1 ? 's' : ''} matching your criteria</>
          }
        </motion.div>
      )}

      {/* ── SAP API error — shown below header like DTC Audit error banner ── */}
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
              The SAP Audit API returned an error: <strong>{nonDtcFetchError}</strong>.<br />
              This API may require VPN or AVD access. Please contact your administrator if this persists.
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {(loading || (!dataComplete && nonDtcAuditData.length === 0 && !nonDtcFetchError)) ? (
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
      ) : (
        <DataTable
          data={filteredData}
          columns={NON_DTC_COLUMNS}
          compactColumns={[
            { key: 'fileId', label: 'File ID' },
            { key: 'timestamp', label: 'Event Timestamp' },
            { key: 'sourceApplication', label: 'Source' },
            { key: 'application', label: 'Destination' },
            { key: 'status', label: 'Status' },
            { key: 'fileName', label: 'Source File Name' },
            { key: 'sourcePath', label: 'Source Path' },
            { key: 'destinationPath', label: 'Destination Path' },
          ]}
          exportColumns={NON_DTC_COLUMNS}
          defaultSort={{ key: 'startDate', direction: 'desc' }}
          defaultPageSize={50}
          onDownload={true}
          exportConfig={{
            filename: 'Non_DTC_Audit_Export',
            pdfOptions: {
              orientation: 'landscape',
              pageFormat: 'a4',
              fontSize: 6,
              overflow: 'linebreak',
              horizontalPageBreak: true,
              horizontalPageBreakRepeat: [0, 1, 2],
              minCellWidth: 14,
              cellPadding: 2,
            },
          }}
          onViewDetail={() => navigate('/non-dtc-audit-detail')}
          detailPagePath="/non-dtc-audit-detail"
        />
      )}
    </motion.div>
  );
};

export default NonDtcAudit;
