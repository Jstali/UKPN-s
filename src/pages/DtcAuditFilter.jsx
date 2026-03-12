import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Filter, Calendar, ArrowUp, ArrowDown, X } from 'lucide-react';
import ExportDropdown from '../components/ExportDropdown';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import auditData from '../data/Audit_Data_Dumy';
import { parseHeader, wildcardMatch, formatEventType } from '../utils/auditUtils';

const ALL_COLUMNS = [
  { key: 'id', label: 'Unique ID' },
  { key: 'fileId', label: 'File ID' },
  { key: 'fileName', label: 'File Name' },
  { key: 'sourcePath', label: 'Source Path' },
  { key: 'headerString', label: 'Header String' },
  { key: 'flowVersion', label: 'Flow Version' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'recApp', label: 'Receiving App' },
  { key: 'application', label: 'Dest Application' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'status', label: 'Status' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'eventId', label: 'Event ID' },
  { key: 'destinationPath', label: 'Destination Path' },
  { key: 'destinationFileName', label: 'Destination File' },
  { key: 'checksum', label: 'Checksum' },
  { key: 'processed', label: 'Processed' },
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
  const incomingFilters = location.state?.filters;

  const defaultFilters = {
    application: 'All',
    eventType: 'All',
    flow: 'All',
    version: 'All',
    fromRole: 'All',
    fromMPID: 'All',
    toRole: 'All',
    toMPID: 'All',
    receivingApp: 'All',
    eventTimestampFrom: '',
    eventTimestampTo: '',
    fileCreationDate: '',
    fileId: '',
    msgId: '',
  };

  const [filters, setFilters] = useState(incomingFilters || defaultFilters);
  const [hasQueried, setHasQueried] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const filterBtnRefs = useRef({});

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...defaultFilters });
    setHasQueried(false);
    setFilteredResults([]);
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig({ key: null, direction: 'asc' });
  };

  const handleQuery = () => {
    let results = [];
    auditData.forEach(item => {
      const parsed = parseHeader(item.Header_String);
      if (item.events && item.events.length > 0) {
        item.events.forEach(event => {
          const ts = event.timestamp ? new Date(event.timestamp) : null;
          const formatDate = (d) => d ? d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          results.push({
            id: item.id,
            fileId: item.File_ID || '',
            fileName: item.Source_FileName,
            sourcePath: item.Source_Path,
            headerString: item.Header_String,
            flowVersion: parsed.flowVersion || 'UNKNOWN',
            fromRole: parsed.fromRole,
            fromMPID: parsed.fromMPID,
            toRole: parsed.toRole,
            toMPID: parsed.toMPID,
            recApp: parsed.recApp,
            application: event.applicationName || event.Destination_Application || 'Unknown',
            eventType: event.Event_Type || 'Unknown',
            status: event.Status || 'Unknown',
            processed: event.processed || 'false',
            timestamp: formatDate(ts),
            eventId: event.id || '',
            destinationPath: event.Destination_Path || '',
            destinationFileName: event.Destination_fileName || '',
            checksum: item.Checksum_From_User || '',
            _rid: item._rid,
            _ts: item._ts,
          });
        });
      }
    });

    // Apply filters
    if (filters.application !== 'All') results = results.filter(r => r.application === filters.application);
    if (filters.eventType !== 'All') results = results.filter(r => r.eventType === filters.eventType);
    if (filters.flow !== 'All') results = results.filter(r => r.flowVersion === filters.flow);
    if (filters.fromRole !== 'All') results = results.filter(r => r.fromRole === filters.fromRole);
    if (filters.fromMPID !== 'All') results = results.filter(r => r.fromMPID === filters.fromMPID);
    if (filters.toRole !== 'All') results = results.filter(r => r.toRole === filters.toRole);
    if (filters.toMPID !== 'All') results = results.filter(r => r.toMPID === filters.toMPID);
    if (filters.receivingApp !== 'All') results = results.filter(r => r.recApp === filters.receivingApp);
    if (filters.fileId) results = results.filter(r => r.fileId && r.fileId.includes(filters.fileId));
    if (filters.msgId) results = results.filter(r => r.msgId && r.msgId.includes(filters.msgId));

    setFilteredResults(results);
    setExceptionCount(0);
    setHasQueried(true);
    setCurrentPage(1);
  };

  // Auto-query if navigated from DTC Audit page
  useEffect(() => {
    if (incomingFilters) {
      handleQuery();
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Build dropdown options
  const flatData = [];
  auditData.forEach(item => {
    if (item.events && item.events.length > 0) {
      item.events.forEach(event => {
        flatData.push({
          application: event.applicationName || event.Destination_Application || 'Unknown',
          eventType: event.Event_Type || 'Unknown',
        });
      });
    }
  });
  const applicationOptions = ['All', ...new Set(flatData.map(i => i.application).filter(Boolean))];
  const eventTypeOptions = ['All', ...new Set(flatData.map(i => i.eventType).filter(Boolean))].sort();

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

  const dropdownFields = [
    { label: 'Application', field: 'application', options: applicationOptions },
    { label: 'Event Type', field: 'eventType', options: eventTypeOptions },
    { label: 'Flow', field: 'flow', options: ['All'] },
    { label: 'Version', field: 'version', options: ['All'] },
    { label: 'From Role', field: 'fromRole', options: ['All'] },
    { label: 'From MPID', field: 'fromMPID', options: ['All'] },
    { label: 'To Role', field: 'toRole', options: ['All'] },
    { label: 'To MPID', field: 'toMPID', options: ['All'] },
    { label: 'Receiving App', field: 'receivingApp', options: ['All'] },
  ];

  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' };
  const selectStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const smallInputStyle = { flex: 1, padding: '8px 8px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', outline: 'none' };

  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>
            <Link to="/" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
            {' > '}
            <Link to="/dtc-audit" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>DTC Audit</Link>
            {' > '}
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Detail View</span>
          </div>
        </div>
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
      </div>

      {/* Filter Section */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
        marginBottom: '16px', overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {dropdownFields.map(({ label, field, options }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <select value={filters[field]} onChange={(e) => handleFilterChange(field, e.target.value)} style={selectStyle}>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}

            <div>
              <label style={labelStyle}>Event Timestamp From</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="date" value={filters.eventTimestampFrom.split('T')[0] || ''}
                  onChange={(e) => { const time = filters.eventTimestampFrom.split('T')[1] || '00:00'; handleFilterChange('eventTimestampFrom', e.target.value ? `${e.target.value}T${time}` : ''); }}
                  style={smallInputStyle} />
                <input type="time" value={filters.eventTimestampFrom.split('T')[1] || ''}
                  onChange={(e) => { const date = filters.eventTimestampFrom.split('T')[0] || new Date().toISOString().split('T')[0]; handleFilterChange('eventTimestampFrom', `${date}T${e.target.value}`); }}
                  style={smallInputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Event Timestamp To</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="date" value={filters.eventTimestampTo.split('T')[0] || ''}
                  onChange={(e) => { const time = filters.eventTimestampTo.split('T')[1] || '23:59'; handleFilterChange('eventTimestampTo', e.target.value ? `${e.target.value}T${time}` : ''); }}
                  style={smallInputStyle} />
                <input type="time" value={filters.eventTimestampTo.split('T')[1] || ''}
                  onChange={(e) => { const date = filters.eventTimestampTo.split('T')[0] || new Date().toISOString().split('T')[0]; handleFilterChange('eventTimestampTo', `${date}T${e.target.value}`); }}
                  style={smallInputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>File Creation Date</label>
              <input type="date" value={filters.fileCreationDate} onChange={(e) => handleFilterChange('fileCreationDate', e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>File ID</label>
              <input type="text" value={filters.fileId} onChange={(e) => handleFilterChange('fileId', e.target.value)} placeholder="Enter File ID" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Msg ID</label>
              <input type="text" value={filters.msgId} onChange={(e) => handleFilterChange('msgId', e.target.value)} placeholder="Enter Msg ID" style={inputStyle} />
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
                onExportPDF={() => exportToPDF(searchedResults, ALL_COLUMNS, 'DTC_Audit_Detail')}
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
                          style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          {col.label}
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

export default DtcAuditFilter;
