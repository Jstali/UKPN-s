import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Calendar, ArrowUp, ArrowDown, X } from 'lucide-react';
import ExportDropdown from '../components/ExportDropdown';
import DtcFilterDropdown from '../components/DtcFilterDropdown';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import { useApp } from '../context/AppContext';
import { parseHeader, wildcardMatch, formatEventType, formatDateTime, formatFlowVersion, deriveFlowVersion, pick } from '../utils/auditUtils';
import { mapStatusDisplay, AUDIT_FILTER_EVENT_LABELS as EVENT_TYPE_MAP } from '../constants/eventTypes';
import { applyDtcFilters } from '../utils/dtcFilterUtils';

// Maps the raw boolean/string "processed" DB flag to a business-readable label.
// true  → file has been acknowledged and consumed by the downstream receiving application.
// false → file delivered but downstream acknowledgement not yet received.
const formatProcessed = (value) => {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'true')  return 'Processed';
  if (v === 'false') return 'Not Processed';
  return value || '—';
};

const PROCESSED_STYLE = {
  true:  { background: '#dcfce7', color: '#16a34a' },
  false: { background: '#fef2f2', color: '#dc2626' },
  other: { background: '#f1f5f9', color: '#475569' },
};

const resolveProcessedValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === true || candidate === false) return String(candidate);
    if (candidate === null || candidate === undefined) continue;
    const normalized = String(candidate).trim();
    if (normalized && normalized.toLowerCase() !== 'unknown') return normalized;
  }
  return '';
};

// Try to extract DTC flow code from filename (e.g. D0132001_P_X_EPN.DTC → D0132001)
const extractFlowFromFilename = (filename) => {
  if (!filename) return '';
  const match = String(filename).match(/^([A-Z]\d{7})/);
  return match ? match[1] : '';
};

// Get Header_String with case-insensitive fallbacks
const getHeaderString = (item) =>
  item.Header_String || item.header_string || item.HeaderString || item.header || '';

// Get Source_FileName with case-insensitive fallbacks
const getSourceFileName = (item) =>
  item.Source_FileName || item.source_file_name || item.SourceFileName ||
  item.Source_File_Name || item.fileName || item.filename || '';

const ALL_COLUMNS = [
  { key: 'fileId',              label: 'File ID' },
  { key: 'fileName',            label: 'File Name' },
  { key: 'sourcePath',          label: 'Source Path' },
  { key: 'sourceApp',           label: 'Source Application' },
  { key: 'headerString',        label: 'Header String' },
  { key: 'flow',                label: 'Flow' },
  { key: 'version',             label: 'Version' },
  { key: 'fromRole',            label: 'From Role' },
  { key: 'fromMPID',            label: 'From MPID' },
  { key: 'toRole',              label: 'To Role' },
  { key: 'toMPID',              label: 'To MPID' },
  { key: 'recApp',              label: 'Receiving App' },
  { key: 'application',         label: 'Dest Application' },
  { key: 'eventType',           label: 'Event Type' },
  { key: 'status',              label: 'Status' },
  { key: 'id',                  label: 'Unique ID' },
  { key: 'timestamp',           label: 'Timestamp' },
  { key: 'destinationPath',     label: 'Destination Path' },
  { key: 'destinationFileName', label: 'Destination File' },
  { key: 'checksum',            label: 'Checksum' },
];

const DATE_COLUMNS = ['timestamp'];

const ColumnFilterPopover = ({ col, columnFilters, setColumnFilters, onClose, allData, anchorRef }) => {
  const ref = useRef(null);
  const isDateCol = DATE_COLUMNS.includes(col.key);
  const filterVal = columnFilters[col.key] || '';
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const handleChange = (val) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (val) next[col.key] = val;
      else delete next[col.key];
      return next;
    });
  };

  const handleSelect = (val) => {
    handleChange(val);
    onClose();
  };

  const matchingValues = useMemo(() => {
    if (isDateCol || !filterVal) return [];
    const unique = [...new Set(allData.map(row => String(row[col.key] || '')).filter(Boolean))];
    return unique.filter(v => wildcardMatch(v, filterVal)).sort();
  }, [allData, col.key, filterVal, isDateCol]);

  const showDropdown = !isDateCol && filterVal && matchingValues.length > 0;

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '12px',
        minWidth: '240px', maxWidth: '320px',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
        {isDateCol ? 'Filter by date' : `Filter ${col.label}`}
      </div>
      {!isDateCol && (
        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>
          Use * as wildcard: cos*, *cos, *cos*
        </div>
      )}
      {isDateCol ? (
        <input type="date" value={filterVal} onChange={(e) => handleChange(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          autoFocus />
      ) : (
        <input type="text" value={filterVal} onChange={(e) => handleChange(e.target.value)}
          placeholder={`Search ${col.label}...`}
          style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          autoFocus />
      )}
      {showDropdown && (
        <div style={{ marginTop: '6px', maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
          <div style={{ padding: '4px 10px', fontSize: '10px', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
            {matchingValues.length} match{matchingValues.length !== 1 ? 'es' : ''} found
          </div>
          {matchingValues.map((val) => (
            <div key={val} onClick={() => handleSelect(val)}
              style={{ padding: '7px 10px', fontSize: '12px', color: '#334155', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {val}
            </div>
          ))}
        </div>
      )}
      {!isDateCol && filterVal && matchingValues.length === 0 && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '6px 0' }}>No matches found</div>
      )}
      {filterVal && (
        <button onClick={() => handleChange('')}
          style={{ marginTop: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
          Clear
        </button>
      )}
    </div>
  );
};

const DtcAuditFilter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const defaultFilters = {
    sourceApp: 'All',
    destinationApp: 'All',
    eventType: 'All',
    flow: 'All',
    version: 'All',
    fromRole: 'All',
    fromMPID: 'All',
    toRole: 'All',
    toMPID: 'All',
    eventTimestampFrom: '',
    eventTimestampTo: '',
    fileCreationDate: '',
    publishDate: '',
    fileId: '',
    msgId: '',
  };

  const { auditData, loading, subscriptionData } = useApp();
  const subscriptionAppNames = useMemo(
    () => [...new Set((subscriptionData || []).map(app => app.Application || app.application || app.filterId || app.id).filter(Boolean))].sort(),
    [subscriptionData]
  );
  
  // Helper function to convert DtcAudit filters to DtcAuditFilter format
  const convertFiltersFromAudit = (auditFilters) => {
    if (!auditFilters) return defaultFilters;
    return {
      ...defaultFilters,
      ...auditFilters,
      sourceApp: auditFilters.sourceApplication ?? auditFilters.sourceApp ?? 'All',
      destinationApp: auditFilters.destinationApplication ?? auditFilters.destinationApp ?? 'All',
    };
  };

  // Initialize filters from navigation state (from DtcAudit page) or use defaults
  const initialFilters = convertFiltersFromAudit(location.state?.filters);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [hasQueried, setHasQueried] = useState(true);
  const [filteredResults, setFilteredResults] = useState([]);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [dateError, setDateError] = useState('');
  const filterBtnRefs = useRef({});

  // Derive flow options from flattened results — guarantees dropdown matches actual row values.
  const flowOptions = useMemo(
    () => [...new Set(filteredResults.map(r => r.flow).filter(v => v && v !== '-'))].sort(),
    [filteredResults]
  );

  // Auto-query on data load — use filters from navigation state or defaults
  useEffect(() => {
    if (auditData.length > 0) {
      handleQuery(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditData.length]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const next = { ...prev, [field]: value };
      if (next.eventTimestampFrom && next.eventTimestampTo) {
        const fromDate = new Date(next.eventTimestampFrom);
        const toDate = new Date(next.eventTimestampTo);
        if (fromDate > toDate) {
          setDateError('Event From date cannot be later than Event To date');
        } else {
          setDateError('');
        }
      } else {
        setDateError('');
      }
      return next;
    });
  };

  const dropdownFilters = useMemo(() => ({
    ...filters,
    sourceApplication: filters.sourceApp,
    destinationApplication: filters.destinationApp,
  }), [filters]);

  const mapDropdownFieldToInternal = (field) => {
    if (field === 'sourceApplication') return 'sourceApp';
    if (field === 'destinationApplication') return 'destinationApp';
    return field;
  };

  const mapDropdownFiltersToInternal = (nextFilters = {}) => ({
    ...nextFilters,
    sourceApp: nextFilters.sourceApplication ?? nextFilters.sourceApp ?? 'All',
    destinationApp: nextFilters.destinationApplication ?? nextFilters.destinationApp ?? 'All',
  });

  const handleDropdownFilterChange = (field, value) => {
    handleFilterChange(mapDropdownFieldToInternal(field), value);
  };

  const handleDropdownApply = (nextFilters) => {
    const safeNextFilters = nextFilters ?? dropdownFilters;
    const mappedFilters = mapDropdownFiltersToInternal(safeNextFilters);
    if (handleQuery(mappedFilters)) {
      setAppliedFilters({ ...mappedFilters });
    }
  };

  const handleReset = () => {
    setFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
    setDateError('');
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig({ key: null, direction: 'asc' });
    handleQuery(defaultFilters);
  };

  const handleQuery = (filtersToUse) => {
    const f = filtersToUse || appliedFilters;
    if (f.eventTimestampFrom && f.eventTimestampTo) {
      const fromDate = new Date(f.eventTimestampFrom);
      const toDate = new Date(f.eventTimestampTo);
      if (fromDate > toDate) {
        setDateError('Event From date cannot be later than Event To date');
        return false;
      }
    }
    setDateError('');
    let results = [];

    auditData.forEach(item => {
      const headerStr = getHeaderString(item);
      const parsed = parseHeader(headerStr);
      const fileName = getSourceFileName(item);
      // Extract flow from filename as last resort (e.g. D0132001_P_X_EPN.DTC)
      const flowFromFilename = extractFlowFromFilename(fileName);
      const rawFlow = deriveFlowVersion(item, parsed.flowVersion, flowFromFilename);

      // Get source application from first event (same as DtcAudit.jsx)
      const sourceApplication = (item.events && item.events.length > 0) 
        ? (item.events[0]?.applicationName || 'Unknown')
        : (item.Source_Application || item.source_application || item.SourceApplication || 'Unknown');

      if (item.events && item.events.length > 0) {
        item.events.forEach(event => {
          const formattedFlowVersion = formatFlowVersion(rawFlow) || '-';
          const flowVersionParts = formattedFlowVersion.split(' ');
          const rawTimestamp = event.timestamp || event.Timestamp || event.created || event.Created || '';
          const eventTypeKey = event.Status === 'Failed'
            ? 'Failed'
            : (event.Event_Type || event.event_type || event.eventType || 'Unknown');
          const eventTypeValue = EVENT_TYPE_MAP[eventTypeKey] || eventTypeKey;
          const applicationValue = event.applicationName || event.Destination_Application || event.destinationApplication || 'NA';
          
          results.push({
            id: item.id,
            fileId: item.id || pick(item.File_ID, item.fileId, item.file_id, item.correlationId),
            fileName,
            sourcePath: item.Source_FileName || item.Source_Path || item.source_path || item.SourcePath || '',
            headerString: headerStr,
            flowVersion: formattedFlowVersion,
            flow: flowVersionParts[0] || '-',
            version: flowVersionParts[1] || '-',
            fromRole: parsed.fromRole || event.fromRole || event.From_Role || '',
            fromMPID: parsed.fromMPID || event.fromMPID || event.From_MPID || '',
            toRole: parsed.toRole || event.toRole || event.To_Role || '',
            toMPID: parsed.toMPID || event.toMPID || event.To_MPID || '',
            recApp: parsed.recApp || event.Receiving_Application || event.receivingApp || '',
            sourceApp: sourceApplication,
            application: applicationValue,
            eventType: eventTypeValue,
            status: mapStatusDisplay(event.Status || event.status || 'Unknown'),
            processed: resolveProcessedValue(event.processed, event.Processed, item.processed, item.Processed),
            timestamp: formatDateTime(rawTimestamp),
            rawTimestamp,
            eventId: event.id || event.eventId || '',
            destinationPath: event.Destination_Folder || event.Destination_Path || event.destination_path || '',
            destinationFileName: event.Destination_fileName || event.Destination_FileName || event.Destination_file_name || event.destinationFileName || '',
            checksum: item.Checksum_From_User || item.checksum || '',
            _rid: item._rid,
            _ts: item._ts,
          });
        });
      }
    });

    // Apply filters — normalize field names to match shared utility convention
    results = applyDtcFilters(results, {
      ...f,
      sourceApplication: f.sourceApp,
      destinationApplication: f.destinationApp,
    });

    setFilteredResults(results);
    setAppliedFilters({ ...f });
    setExceptionCount(0);
    setHasQueried(true);
    setCurrentPage(1);
    return true;
  };

  // Search + column filters + sort + paginate
  const globalFiltered = filteredResults.filter(row =>
    !searchTerm || Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columnFiltered = globalFiltered.filter(row => {
    return Object.entries(columnFilters).every(([key, val]) => {
      if (!val) return true;
      const cellVal = String(row[key] || '');
      if (DATE_COLUMNS.includes(key)) {
        const parts = cellVal.split(' ')[0]?.split('/');
        if (parts && parts.length === 3) {
          const cellDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          return cellDate === val;
        }
        return cellVal.includes(val);
      }
      if (!val.includes('*')) {
        return cellVal.toLowerCase() === val.toLowerCase() || cellVal.toLowerCase().includes(val.toLowerCase());
      }
      return wildcardMatch(cellVal, val);
    });
  });

  const searchedResults = [...columnFiltered].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(searchedResults.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = searchedResults.slice(startIndex, startIndex + pageSize);

  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const toggleFilter = (key, e) => {
    e.stopPropagation();
    setActiveFilter(prev => prev === key ? null : key);
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
          onClick={() => navigate('/dtc-audit')}
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

      {/* Shared Filter Section (same component as DTC Audit page) */}
      <DtcFilterDropdown
        filters={dropdownFilters}
        auditData={auditData}
        flowOptions={flowOptions}
        subscriptionAppNames={subscriptionAppNames}
        onFilterChange={handleDropdownFilterChange}
        onReset={handleReset}
        onApply={handleDropdownApply}
        disableAnimation={true}
      />

      {/* Results Table */}
      {hasQueried && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
            overflow: 'hidden', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          {/* Selection Criteria - only show if any filter is applied */}
          {(filters.sourceApp !== 'All' || filters.destinationApp !== 'All' || filters.eventType !== 'All' || 
            filters.flow !== 'All' || filters.version !== 'All' || 
            filters.fromRole !== 'All' || filters.fromMPID !== 'All' || filters.toRole !== 'All' || 
            filters.toMPID !== 'All' || filters.eventTimestampFrom || filters.eventTimestampTo || 
            filters.fileCreationDate || filters.publishDate || filters.fileId) && (
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', textAlign: 'center' }}>
                Your Selection Criteria is
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {filters.sourceApp !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Source App: {filters.sourceApp}
                  </span>
                )}
                {filters.destinationApp !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Destination App: {filters.destinationApp}
                  </span>
                )}
                {filters.eventType !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Event Type: {filters.eventType}
                  </span>
                )}
                {filters.flow !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Flow: {filters.flow}
                  </span>
                )}
                {filters.version !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Version: {filters.version}
                  </span>
                )}
                {filters.fromRole !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    From Role: {filters.fromRole}
                  </span>
                )}
                {filters.fromMPID !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    From MPID: {filters.fromMPID}
                  </span>
                )}
                {filters.toRole !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    To Role: {filters.toRole}
                  </span>
                )}
                {filters.toMPID !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    To MPID: {filters.toMPID}
                  </span>
                )}
                {filters.eventTimestampFrom && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    From: {filters.eventTimestampFrom}
                  </span>
                )}
                {filters.eventTimestampTo && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    To: {filters.eventTimestampTo}
                  </span>
                )}
                {filters.fileCreationDate && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    File Date: {filters.fileCreationDate}
                  </span>
                )}
                {filters.publishDate && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Publish Date: {filters.publishDate}
                  </span>
                )}
                {filters.fileId && filters.fileId !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Unique ID: {filters.fileId}
                  </span>
                )}
              </div>
              {searchedResults.length === 0 && (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
                  No DTC audit records found matching your criteria
                </p>
              )}
            </div>
          )}

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
              <ExportDropdown
                onExportPDF={() => exportToPDF(searchedResults, ALL_COLUMNS, 'DTC_Audit_Detail', 'DTC Audit Detail', {
                  fontSize: 7,
                  overflow: 'linebreak',
                  horizontalPageBreak: true,
                  horizontalPageBreakRepeat: [0, 1, 2],
                  minCellWidth: 14,
                })}
                onExportExcel={() => exportToExcel(searchedResults, ALL_COLUMNS, 'DTC_Audit_Detail')}
                onExportCSV={() => exportToCSV(searchedResults, ALL_COLUMNS, 'DTC_Audit_Detail')}
                onSendEmail={() => {}}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600,
                  }}
                >
                  <X size={12} /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              )}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          onClick={() => handleSort(col.key)}
                          title={col.tooltip}
                          style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          {col.label}
                          {col.tooltip && (
                            <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '1px', flexShrink: 0 }}>ⓘ</span>
                          )}
                          <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '2px', lineHeight: 0, flexShrink: 0 }}>
                            <ArrowUp size={10}
                              color={sortConfig.key === col.key && sortConfig.direction === 'asc' ? '#fbbf24' : 'rgba(255,255,255,0.35)'}
                              strokeWidth={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 3 : 2}
                              style={{ marginBottom: '-1px' }} />
                            <ArrowDown size={10}
                              color={sortConfig.key === col.key && sortConfig.direction === 'desc' ? '#fbbf24' : 'rgba(255,255,255,0.35)'}
                              strokeWidth={sortConfig.key === col.key && sortConfig.direction === 'desc' ? 3 : 2}
                              style={{ marginTop: '-1px' }} />
                          </span>
                        </span>
                        <button
                          ref={(el) => { filterBtnRefs.current[col.key] = el; }}
                          onClick={(e) => toggleFilter(col.key, e)}
                          title={`Filter ${col.label}`}
                          style={{
                            background: columnFilters[col.key] ? 'rgba(255,255,255,0.2)' : 'transparent',
                            border: 'none', cursor: 'pointer', padding: '2px',
                            borderRadius: '4px', display: 'flex', alignItems: 'center', flexShrink: 0,
                          }}
                        >
                          {DATE_COLUMNS.includes(col.key) ? (
                            <Calendar size={12} color={columnFilters[col.key] ? '#fbbf24' : 'rgba(255,255,255,0.5)'} />
                          ) : (
                            <Filter size={12} color={columnFilters[col.key] ? '#fbbf24' : 'rgba(255,255,255,0.5)'} />
                          )}
                        </button>
                      </div>
                      {activeFilter === col.key && (
                        <ColumnFilterPopover
                          col={col}
                          columnFilters={columnFilters}
                          setColumnFilters={(fn) => { setColumnFilters(fn); setCurrentPage(1); }}
                          onClose={() => setActiveFilter(null)}
                          allData={filteredResults}
                          anchorRef={{ current: filterBtnRefs.current[col.key] }}
                        />
                      )}
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
                              background: row[col.key] === 'Success' ? '#dcfce7' : row[col.key] === 'Failed' ? '#fef2f2' : '#f1f5f9',
                              color: row[col.key] === 'Success' ? '#16a34a' : row[col.key] === 'Failed' ? '#dc2626' : '#475569',
                            }}>
                              {row[col.key] || ''}
                            </span>
                          ) : col.key === 'eventType' ? (
                            formatEventType(row[col.key])
                          ) : col.key === 'processed' ? (() => {
                            const v = String(row[col.key] ?? '').trim().toLowerCase();
                            const style = v === 'true' ? PROCESSED_STYLE.true
                                        : v === 'false' ? PROCESSED_STYLE.false
                                        : PROCESSED_STYLE.other;
                            return (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...style }}>
                                {formatProcessed(row[col.key])}
                              </span>
                            );
                          })() : (
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

export default DtcAuditFilter;
