import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, BarChart3, Activity, Filter, RotateCcw, ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { EVENT_TYPE_COLORS } from '../components/ColorBar';
import MultiCheckboxDropdown from '../components/MultiCheckboxDropdown';
import { useApp } from '../context/AppContext';
import { DEFAULT_COLUMNS_FULL } from '../data/dashboardConfig';
import { formatDateTime } from '../utils/auditUtils';

const NON_DTC_DEFAULT_COLUMNS = DEFAULT_COLUMNS_FULL.filter(
  ({ key }) => !['flow', 'version', 'fromRole', 'fromMPID', 'toRole', 'toMPID'].includes(key)
);

const NON_DTC_EVENT_TYPE_MAP = {
  '1': 'File Pickup from Source',
  '2': 'File Stored To Blob',
  '3': 'File Subscribe',
  '4': 'File Delivered',
};

const mapNonDtcEventType = (event) => {
  const raw = String(event.eventType || event.event_type || event.Event_Type || event.EventType || '');
  return event.description || event.Description || NON_DTC_EVENT_TYPE_MAP[raw] || raw;
};

const BLOB_PATH_FIELDS = [
  'destinationPath', 'Destination_Path', 'destination_path',
  'destinationContent', 'DestinationContent', 'destination_content',
  'blobPath', 'BlobPath', 'blob_path',
  'blobFilePath', 'blobFileName', 'Blob_File_Name',
  'blobLocation', 'Blob_Location', 'blob_location',
  'blobArchiveLinkLocation', 'Blob_Archive_Link_Location', 'blob_archive_link_location',
  'archivePath', 'Archive_Path', 'archive_path',
  'storagePath', 'StoragePath', 'storage_path',
  'filePath', 'FilePath', 'file_path',
];

// UNC paths (\\server or //server) and absolute filesystem paths are NOT blob paths
const isBlobPath = (p) => {
  if (!p) return false;
  const s = String(p).trim();
  if (s.startsWith('//') || s.startsWith('\\\\') || s.startsWith('/')) return false;
  return s.length > 0;
};

const getNonDtcBlobPath = (item) => {
  const events = item.events || [];
  // Only use "File Stored To Blob" event (type 2) — other events have network share paths
  for (const e of events) {
    const evtType = String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '');
    if (evtType === '2') {
      for (const f of BLOB_PATH_FIELDS) {
        if (isBlobPath(e[f])) return e[f];
      }
    }
  }
  // Top-level item blob fields only (skip sourcePath which is filesystem)
  for (const f of BLOB_PATH_FIELDS.filter(f => f !== 'destinationPath' && f !== 'Destination_Path' && f !== 'destination_path')) {
    if (isBlobPath(item[f])) return item[f];
  }
  return '';
};

// All possible field names that could hold a destination path (for display — no blob filter)
const DEST_PATH_FIELDS = [
  'destinationPath', 'Destination_Path', 'destination_path',
  'destinationContent', 'DestinationContent', 'destination_content',
  'destPath', 'DestPath', 'dest_path',
  'targetPath', 'TargetPath', 'target_path',
  'outputPath', 'OutputPath', 'output_path',
];

const getNonDtcDisplayDestPath = (item) => {
  const events = item.events || [];
  // Search events in reverse priority order: prefer later events (delivery events have destination)
  for (const e of [...events].reverse()) {
    for (const f of DEST_PATH_FIELDS) {
      if (e[f] && String(e[f]).trim()) return String(e[f]).trim();
    }
  }
  // Fall back to top-level item fields
  for (const f of DEST_PATH_FIELDS) {
    if (item[f] && String(item[f]).trim()) return String(item[f]).trim();
  }
  return '';
};

const flattenNonDtcEvents = (data) => {
  const flatData = [];
  (data || []).forEach(item => {
    const events = item.events && item.events.length > 0 ? item.events : [{}];
    const fileName = item.sourceFileName || '';
    const fileType = fileName ? fileName.split('.').pop().toUpperCase() : '-';
    // blobArchiveLocation is the top-level blob storage path for the file
    const blobPath = item.blobArchiveLocation || getNonDtcBlobPath(item);
    const displayDestPath = getNonDtcDisplayDestPath(item);

    // Extract blob archive fields from top-level item (same fields DTC uses)
    const itemBlobArchive = item.Blob_Archive_Link_Location || item.blobArchiveLinkLocation || item.blob_archive_link_location || '';
    const itemBlobLocation = item.Blob_Location || item.blobLocation || item.blob_location || '';
    const itemBlobFileName = item.Blob_File_Name || item.blobFileName || item.blob_file_name || '';

    // Also extract blob fields from the "File Stored To Blob" event (type 2)
    const blobEvent = (item.events || []).find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '2');
    const evtBlobArchive = blobEvent ? (blobEvent.Blob_Archive_Link_Location || blobEvent.blobArchiveLinkLocation || '') : '';
    const evtBlobLocation = blobEvent ? (blobEvent.Blob_Location || blobEvent.blobLocation || blobEvent.storagePath || blobEvent.StoragePath || blobEvent.filePath || '') : '';
    const evtBlobFileName = blobEvent ? (blobEvent.Blob_File_Name || blobEvent.blobFileName || blobEvent.destinationContent || blobEvent.DestinationContent || '') : '';

    // Get subscription from Event Type 3 for flow column
    const subscriptionEvent = (item.events || []).find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '3');
    const flowValue = subscriptionEvent?.subscription || item.subscription || item.description || '-';

    events.forEach(event => {
      flatData.push({
        uniqueId: item.id || '',
        flow: flowValue,
        version: item.version || item.subscription || '-',
        fileId: item.id || '-',
        timestamp: formatDateTime(event.timestamp || item.timestamp || ''),
        fromRole: item.fromRole || '-',
        fromMPID: item.fromMPID || '-',
        toRole: item.toRole || '-',
        toMPID: item.toMPID || '-',
        sourceApplication: item.sourceAppName || '-',
        application: event.destinationApplication || event.applicationName || 'NA event',
        status: event.status || event.Status || item.status || '',
        fileType: fileType,
        fileName: fileName || '-',
        sourceApp: item.sourceAppName || item.subscription || '-',
        sourceFile: fileName || '',
        subscription: item.subscription || '',
        sourcePath: item.sourcePath || '',
        destinationPath: displayDestPath,
        _blobPath: blobPath,
        // Blob archive fields — passed through so DataTable can build paths the same way as DTC
        Blob_Archive_Link_Location: itemBlobArchive || evtBlobArchive,
        Blob_Location: itemBlobLocation || evtBlobLocation,
        Blob_File_Name: itemBlobFileName || evtBlobFileName,
        Source_FileName: fileName,
        eventType: mapNonDtcEventType(Object.keys(event).length ? event : { eventType: item.eventType }),
        startDate: item.events?.[0]?.timestamp ? new Date(item.events[0].timestamp).toLocaleString('en-GB') : '',
        endDate: item.events?.[item.events.length - 1]?.timestamp ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString('en-GB') : '',
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
  ...NON_DTC_DEFAULT_COLUMNS.slice(0, -1), // All columns except fileName
  { key: 'fileType', label: 'File Type', width: 80 },
  NON_DTC_DEFAULT_COLUMNS[NON_DTC_DEFAULT_COLUMNS.length - 1], // fileName
  { key: 'sourcePath', label: 'Source Path', width: 150 },
  { key: 'destinationPath', label: 'Destination Path', width: 150 },
];

const NonDtcAudit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { nonDtcAuditData, loading, dataComplete, nonDtcFetchError } = useApp();
  const [showBars, setShowBars] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize filters from location state if returning from detail page
  const initialFilters = location.state?.filters || {
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

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(location.state?.appliedFilters || initialFilters);
  const [hasQueried, setHasQueried] = useState(location.state?.hasQueried || false);

  // Restore UI state when coming back
  useEffect(() => {
    if (location.state?.showBars !== undefined) {
      setShowBars(location.state.showBars);
    }
  }, [location.state]);

  const auditData = useMemo(() => flattenNonDtcEvents(nonDtcAuditData || []), [nonDtcAuditData]);

  const filteredData = useMemo(() => {
    let result = [...auditData];
    result = result.filter(r => matchesMultiSelect(appliedFilters.flow, r.flow));
    result = result.filter(r => matchesMultiSelect(appliedFilters.sourceApp, r.sourceApp));
    result = result.filter(r => matchesMultiSelect(appliedFilters.destinationApp, r.application));
    result = result.filter(r => matchesMultiSelect(appliedFilters.eventType, r.eventType));
    result = result.filter(r => matchesMultiSelect(appliedFilters.fileId, r.fileId));
    return result;
  }, [auditData, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
    setHasQueried(true);
    setShowFilters(false);
  };

  const resetFilters = () => {
    const empty = {
      flow: 'All', sourceApp: 'All', destinationApp: 'All',
      eventType: 'All', eventFrom: '', eventFromTime: '', eventTo: '', eventToTime: '',
      fileCreated: '', fileCreatedTime: '', publishDate: '', fileId: 'All',
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setHasQueried(false);
  };

  // Selection criteria display config - matches Non-DTC filter fields
  const CRITERIA_FIELDS = [
    { label: 'Flow', key: 'flow' },
    { label: 'Source Application', key: 'sourceApp' },
    { label: 'Destination Application', key: 'destinationApp' },
    { label: 'Event Type', key: 'eventType' },
    { label: 'Event From Date', key: 'eventFrom' },
    { label: 'Event From Time', key: 'eventFromTime' },
    { label: 'Event To Date', key: 'eventTo' },
    { label: 'Event To Time', key: 'eventToTime' },
    { label: 'File Creation Date', key: 'fileCreated' },
    { label: 'File Creation Time', key: 'fileCreatedTime' },
    { label: 'Publish Date', key: 'publishDate' },
    { label: 'File ID', key: 'fileId' },
  ];

  const appliedCriteria = useMemo(() => {
    if (!appliedFilters) return [];

    return CRITERIA_FIELDS.filter(({ key }) => {
      const value = appliedFilters[key];
      return value && value !== 'All' && value !== '';
    });
  }, [appliedFilters]);

  const uniqueFlows = [...new Set(filteredData.map(r => r.sourceApp))].filter(Boolean).length;

  // Filter options always computed from full dataset (not filtered subset)
  const filterOptions = useMemo(() => ({
    flow:           [...new Set(auditData.map(r => r.flow).filter(Boolean))].sort(),
    sourceApp:      [...new Set(auditData.map(r => r.sourceApp).filter(Boolean))].sort(),
    destinationApp: [...new Set(auditData.map(r => r.application).filter(Boolean))].sort(),
    eventType:      [...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort(),
    fileId:         [...new Set(auditData.map(r => r.fileId).filter(Boolean))].sort(),
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
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Events</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{auditData.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <Activity size={13} color="#0ea5e9" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Flow</span>
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
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Flow</label>
                    <MultiCheckboxDropdown
                      value={filters.flow}
                      onChange={value => setFilters(prev => ({ ...prev, flow: value }))}
                      options={filterOptions.flow}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Source Application</label>
                    <MultiCheckboxDropdown
                      value={filters.sourceApp}
                      onChange={value => setFilters(prev => ({ ...prev, sourceApp: value }))}
                      options={filterOptions.sourceApp}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Destination Application</label>
                    <MultiCheckboxDropdown
                      value={filters.destinationApp}
                      onChange={value => setFilters(prev => ({ ...prev, destinationApp: value }))}
                      options={filterOptions.destinationApp}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr 0.8fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Event From</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="date"
                        value={filters.eventFrom}
                        onChange={e => setFilters({ ...filters, eventFrom: e.target.value })}
                        style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                      />
                      <input
                        type="time"
                        value={filters.eventFromTime}
                        onChange={e => setFilters({ ...filters, eventFromTime: e.target.value })}
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
                        onChange={e => setFilters({ ...filters, eventTo: e.target.value })}
                        style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                      />
                      <input
                        type="time"
                        value={filters.eventToTime}
                        onChange={e => setFilters({ ...filters, eventToTime: e.target.value })}
                        style={{ ...inputStyle, width: '95px', padding: '7px 8px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>File Created</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="date"
                        value={filters.fileCreated}
                        onChange={e => setFilters({ ...filters, fileCreated: e.target.value })}
                        style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                      />
                      <input
                        type="time"
                        value={filters.fileCreatedTime}
                        onChange={e => setFilters({ ...filters, fileCreatedTime: e.target.value })}
                        style={{ ...inputStyle, width: '95px', padding: '7px 8px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Publish Date</label>
                    <input
                      type="date"
                      value={filters.publishDate}
                      onChange={e => setFilters({ ...filters, publishDate: e.target.value })}
                      style={{ ...inputStyle, padding: '7px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>File ID</label>
                    <MultiCheckboxDropdown
                      value={filters.fileId}
                      onChange={value => setFilters(prev => ({ ...prev, fileId: value }))}
                      options={filterOptions.fileId}
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
      {hasQueried && appliedCriteria.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px',
            marginBottom: '8px', overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid #f1f5f9',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Your Selection Criteria is</h3>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px 16px', padding: '10px 16px'
          }}>
            {appliedCriteria.map(({ label, key }) => {
              let displayValue = appliedFilters[key];

              // Format datetime fields if they contain T separator
              if (key === 'eventFrom' || key === 'eventTo' || key === 'fileCreated') {
                if (displayValue && displayValue.includes('T')) {
                  displayValue = displayValue.replace('T', ' ');
                }
              }

              return (
                <div key={key} style={{ fontSize: '12px', color: '#475569', padding: '2px 0' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{label}:</span>{' '}
                  {displayValue}
                </div>
              );
            })}
          </div>

          <div style={{
            padding: '8px 16px', borderTop: '1px solid #f1f5f9',
            textAlign: 'center', fontSize: '12px', color: '#475569'
          }}>
            {filteredData.length === 0
              ? 'No Non-DTC audit records found matching your criteria'
              : <>Found <span style={{ fontWeight: 700, color: '#10b981' }}>{filteredData.length}</span> Non-DTC audit record{filteredData.length !== 1 ? 's' : ''} matching your criteria</>
            }
          </div>
        </motion.div>
      )}

      {/* ── Fallback: show simple count when no criteria applied but hasQueried is true ── */}
      {hasQueried && appliedCriteria.length === 0 && (
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
          tableId="non_dtc_audit"
          data={filteredData}
          columns={NON_DTC_COLUMNS}
          compactColumns={[
            { key: 'flow',              label: 'Flow',              width: 65  },
            { key: 'fileId',            label: 'File ID',           width: 130 },
            { key: 'timestamp',         label: 'Timestamp',         width: 130 },
            { key: 'sourceApplication', label: 'Source',            width: 95  },
            { key: 'application',       label: 'Destination',       width: 105 },
            { key: 'sourcePath',        label: 'Source Path',       width: 150 },
            { key: 'destinationPath',   label: 'Destination Path',  width: 150 },
            { key: 'status',            label: 'Status',            width: 88  },
            { key: 'fileName',          label: 'Source File Name',  width: 155 },
          ]}
          exportColumns={NON_DTC_COLUMNS}
          defaultSort={{ key: 'startDate', direction: 'desc' }}
          isNonDtc={true}
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
          onViewDetail={() => navigate('/non-dtc-audit-detail', {
            state: {
              filters,
              appliedFilters,
              hasQueried,
              showBars,
            }
          })}
          navigationState={{ filters, appliedFilters, hasQueried, showBars }}
          detailPagePath="/non-dtc-audit-detail"
        />
      )}
    </motion.div>
  );
};

export default NonDtcAudit;
