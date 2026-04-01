import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Filter, Calendar, ArrowUp, ArrowDown, X, ChevronDown } from 'lucide-react';
import ExportDropdown from '../components/ExportDropdown';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import { useApp } from '../context/AppContext';
import { parseHeader, wildcardMatch, formatEventType, formatDateTime, formatFlowVersion } from '../utils/auditUtils';

const pickId = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';

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

// Log missing Header_String fields only once per session
let _missingHeaderLogged = false;

const MultiSelectDropdown = ({ label, value, options, onChange, style, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
    if (!isOpen) setSearchQuery('');
  }, [isOpen, searchable]);

  const selectedValues = value === 'All' ? [] : (value ? value.split(',') : []);
  const displayText = selectedValues.length === 0 ? 'All' :
                      selectedValues.length === 1 ? selectedValues[0] :
                      `${selectedValues.length} selected`;

  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleToggle = (option) => {
    let newSelected;
    if (selectedValues.includes(option)) {
      newSelected = selectedValues.filter(v => v !== option);
    } else {
      newSelected = [...selectedValues, option];
    }
    onChange(newSelected.length === 0 ? 'All' : newSelected.join(','));
  };

  const handleSelectAll = () => {
    onChange('All');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } if (e.key === 'Escape') setIsOpen(false); }}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '250px',
            overflowY: 'auto',
            zIndex: 1000,
            minWidth: '160px',
          }}
        >
          {searchable && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={`Search ${label}...`}
                aria-label={`Search ${label}`}
                style={{
                  width: '100%', padding: '4px 8px', border: '1px solid #e2e8f0',
                  borderRadius: '4px', fontSize: '11px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          )}
          <div
            onClick={handleSelectAll}
            role="option"
            aria-selected={selectedValues.length === 0}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              borderBottom: '1px solid #f1f5f9',
              background: selectedValues.length === 0 ? '#f8fafc' : '#fff',
              fontWeight: selectedValues.length === 0 ? 600 : 400
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.background = selectedValues.length === 0 ? '#f8fafc' : '#fff'}
          >
            <input
              type="checkbox"
              checked={selectedValues.length === 0}
              readOnly
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            All
          </div>
          {searchable && searchQuery && filteredOptions.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              No matches
            </div>
          )}
          {filteredOptions.map(option => (
            <div
              key={option}
              onClick={() => handleToggle(option)}
              role="option"
              aria-selected={selectedValues.includes(option)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: '1px solid #f1f5f9',
                background: selectedValues.includes(option) ? '#eef2ff' : '#fff'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = selectedValues.includes(option) ? '#eef2ff' : '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = selectedValues.includes(option) ? '#eef2ff' : '#fff'}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                readOnly
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ALL_COLUMNS = [
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
  { key: 'id', label: 'Unique ID' },
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
    receivingApp: 'All',
    eventTimestampFrom: '',
    eventTimestampTo: '',
    fileCreationDate: '',
    fileId: '',
    msgId: '',
  };

  const { auditData, loading } = useApp();
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [hasQueried, setHasQueried] = useState(true);
  const [filteredResults, setFilteredResults] = useState([]);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const filterBtnRefs = useRef({});

  // Auto-query on data load — use default filters (show all)
  useEffect(() => {
    if (auditData.length > 0) {
      handleQuery(defaultFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditData.length]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig({ key: null, direction: 'asc' });
    handleQuery(defaultFilters);
  };

  const handleQuery = (filtersToUse) => {
    const f = filtersToUse || appliedFilters;
    let results = [];
    auditData.forEach(item => {
      const headerStr = getHeaderString(item);
      const parsed = parseHeader(headerStr);
      const fileName = getSourceFileName(item);
      // Extract flow from filename as last resort (e.g. D0132001_P_X_EPN.DTC)
      const flowFromFilename = extractFlowFromFilename(fileName);
      const rawFlow = parsed.flowVersion || item.Flow_Version || item.flow_version || item.flow || item.FlowVersion || flowFromFilename;

      if (!headerStr && !_missingHeaderLogged) {
        _missingHeaderLogged = true;
        console.log('[DtcAuditFilter] Sample item missing Header_String — all available fields:', Object.keys(item));
        console.log('[DtcAuditFilter] Sample item values:', JSON.stringify(item, null, 2).substring(0, 2000));
      }

      if (item.events && item.events.length > 0) {
        item.events.forEach(event => {
          results.push({
            id: item.id,
            fileId: pickId(item.File_ID, item.fileId, item.file_id, item.correlationId, item.id),
            fileName,
            sourcePath: item.Source_Path || item.source_path || item.SourcePath || '',
            headerString: headerStr,
            flowVersion: formatFlowVersion(rawFlow) || '-',
            fromRole: parsed.fromRole || event.fromRole || event.From_Role || '',
            fromMPID: parsed.fromMPID || event.fromMPID || event.From_MPID || '',
            toRole: parsed.toRole || event.toRole || event.To_Role || '',
            toMPID: parsed.toMPID || event.toMPID || event.To_MPID || '',
            recApp: parsed.recApp || event.Receiving_Application || event.receivingApp || '',
            sourceApp: item.Source_Application || item.source_application || item.SourceApplication || 'Unknown',
            application: event.applicationName || event.Destination_Application || event.destinationApplication || 'Unknown',
            eventType: event.Event_Type || event.event_type || event.eventType || 'Unknown',
            status: event.Status || event.status || 'Unknown',
            processed: event.processed || 'false',
            timestamp: formatDateTime(event.timestamp || event.Timestamp || event.created || event.Created),
            eventId: event.id || event.eventId || '',
            destinationPath: event.Destination_Path || event.destination_path || '',
            destinationFileName: event.Destination_fileName || event.Destination_FileName || event.destinationFileName || '',
            checksum: item.Checksum_From_User || item.checksum || '',
            _rid: item._rid,
            _ts: item._ts,
          });
        });
      }
    });

    // Apply filters
    if (f.sourceApp && f.sourceApp !== 'All') {
      const selectedApps = f.sourceApp.split(',');
      results = results.filter(r => selectedApps.includes(r.sourceApp));
    }
    if (f.destinationApp && f.destinationApp !== 'All') {
      const selectedApps = f.destinationApp.split(',');
      results = results.filter(r => selectedApps.includes(r.application));
    }
    if (f.eventType && f.eventType !== 'All') { const v = f.eventType.split(','); results = results.filter(r => v.includes(r.eventType)); }
    if (f.flow && f.flow !== 'All') { const v = f.flow.split(','); results = results.filter(r => v.includes(r.flowVersion)); }
    if (f.fromRole && f.fromRole !== 'All') { const v = f.fromRole.split(','); results = results.filter(r => v.includes(r.fromRole)); }
    if (f.fromMPID && f.fromMPID !== 'All') { const v = f.fromMPID.split(','); results = results.filter(r => v.includes(r.fromMPID)); }
    if (f.toRole && f.toRole !== 'All') { const v = f.toRole.split(','); results = results.filter(r => v.includes(r.toRole)); }
    if (f.toMPID && f.toMPID !== 'All') { const v = f.toMPID.split(','); results = results.filter(r => v.includes(r.toMPID)); }
    if (f.receivingApp && f.receivingApp !== 'All') { const v = f.receivingApp.split(','); results = results.filter(r => v.includes(r.recApp)); }
    if (f.fileId) results = results.filter(r => r.fileId && r.fileId.includes(f.fileId));
    if (f.msgId) results = results.filter(r => r.eventId && r.eventId.includes(f.msgId));
    if (f.version && f.version !== 'All') { const v = f.version.split(','); results = results.filter(r => v.includes(r.flowVersion)); }
    if (f.eventTimestampFrom) {
      const from = new Date(f.eventTimestampFrom);
      results = results.filter(r => {
        if (!r.timestamp) return false;
        const parts = r.timestamp.split(' ')[0]?.split('/');
        if (parts && parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          return d >= from;
        }
        return new Date(r.timestamp) >= from;
      });
    }
    if (f.eventTimestampTo) {
      const to = new Date(f.eventTimestampTo);
      results = results.filter(r => {
        if (!r.timestamp) return false;
        const parts = r.timestamp.split(' ')[0]?.split('/');
        if (parts && parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          return d <= to;
        }
        return new Date(r.timestamp) <= to;
      });
    }
    if (f.publishDate) {
      results = results.filter(r => {
        // Only filter "Published" events (Event Type 3)
        if (r.eventType === '3' || r.eventType === 3) {
          if (!r.timestamp) return false;
          const parts = r.timestamp.split(' ')[0]?.split('/');
          if (parts && parts.length === 3) {
            const cellDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            return cellDate === f.publishDate;
          }
          const ts = new Date(r.timestamp);
          const dateStr = ts.toISOString().split('T')[0];
          return dateStr === f.publishDate;
        }
        return false;
      });
    }

    setFilteredResults(results);
    setExceptionCount(0);
    setHasQueried(true);
    setCurrentPage(1);
  };



  // Build dropdown options
  const flatData = [];
  const fileIdSet = new Set();
  auditData.forEach(item => {
    const headerStr = getHeaderString(item);
    const parsed = parseHeader(headerStr);
    const fileName = getSourceFileName(item);
    const flowFromFilename = extractFlowFromFilename(fileName);
    const rawFlow = parsed.flowVersion || item.Flow_Version || item.flow_version || item.flow || item.FlowVersion || flowFromFilename;
    const fileId = item.File_ID || item.fileId || item.file_id || item.correlationId || item.id;
    if (fileId && fileId !== 'UNKNOWN') fileIdSet.add(fileId);

    if (item.events && item.events.length > 0) {
      item.events.forEach(event => {
        flatData.push({
          sourceApp: item.Source_Application || item.source_application || 'Unknown',
          application: event.applicationName || event.Destination_Application || 'Unknown',
          eventType: event.Event_Type || event.event_type || event.eventType || 'Unknown',
          flowVersion: formatFlowVersion(rawFlow) || '-',
          fromRole: parsed.fromRole || event.fromRole || event.From_Role || '',
          fromMPID: parsed.fromMPID || event.fromMPID || event.From_MPID || '',
          toRole: parsed.toRole || event.toRole || event.To_Role || '',
          toMPID: parsed.toMPID || event.toMPID || event.To_MPID || '',
          recApp: parsed.recApp || event.Receiving_Application || event.receivingApp || '',
        });
      });
    }
  });
  const sourceAppOptions = ['All', ...new Set(flatData.map(i => i.sourceApp).filter(Boolean))];
  const destinationAppOptions = ['All', ...new Set(flatData.map(i => i.application).filter(Boolean))];
  const eventTypeOptions = ['All', ...new Set(flatData.map(i => i.eventType).filter(Boolean))].sort();
  const flowOptions = ['All', ...new Set(flatData.map(i => i.flowVersion).filter(v => v && v !== '-'))].sort();
  const fromRoleOptions = ['All', ...new Set(flatData.map(i => i.fromRole).filter(Boolean))].sort();
  const fromMPIDOptions = ['All', ...new Set(flatData.map(i => i.fromMPID).filter(Boolean))].sort();
  const toRoleOptions = ['All', ...new Set(flatData.map(i => i.toRole).filter(Boolean))].sort();
  const toMPIDOptions = ['All', ...new Set(flatData.map(i => i.toMPID).filter(Boolean))].sort();
  const recAppOptions = ['All', ...new Set(flatData.map(i => i.recApp).filter(Boolean))].sort();
  const fileIdOptions = ['All', ...Array.from(fileIdSet).sort()];

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
    { label: 'Source Application', field: 'sourceApp', options: sourceAppOptions },
    { label: 'Destination Application', field: 'destinationApp', options: destinationAppOptions },
    { label: 'Event Type', field: 'eventType', options: eventTypeOptions },
    { label: 'Flow', field: 'flow', options: flowOptions },
    { label: 'Version', field: 'version', options: flowOptions },
    { label: 'Receiving App', field: 'receivingApp', options: recAppOptions },
    { label: 'From Role', field: 'fromRole', options: fromRoleOptions },
    { label: 'From MPID', field: 'fromMPID', options: fromMPIDOptions },
    { label: 'To Role', field: 'toRole', options: toRoleOptions },
    { label: 'To MPID', field: 'toMPID', options: toMPIDOptions },
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

      {/* Filter Section */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
        marginBottom: '16px', overflow: 'visible',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
            {/* Source Application - Multi-select */}
            <div>
              <label style={labelStyle}>Source Application</label>
              <MultiSelectDropdown
                label="Source Application"
                value={filters.sourceApp}
                options={sourceAppOptions.filter(o => o !== 'All')}
                onChange={(value) => handleFilterChange('sourceApp', value)}
                style={selectStyle}
              />
            </div>

            {/* Destination Application - Multi-select */}
            <div>
              <label style={labelStyle}>Destination Application</label>
              <MultiSelectDropdown
                label="Destination Application"
                value={filters.destinationApp}
                options={destinationAppOptions.filter(o => o !== 'All')}
                onChange={(value) => handleFilterChange('destinationApp', value)}
                style={selectStyle}
              />
            </div>

            {/* Other fields - multi-select dropdowns */}
            {dropdownFields.filter(f => f.field !== 'sourceApp' && f.field !== 'destinationApp').map(({ label, field, options }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <MultiSelectDropdown
                  label={label}
                  value={filters[field]}
                  options={options.filter(o => o !== 'All')}
                  onChange={(value) => handleFilterChange(field, value)}
                  style={selectStyle}
                  searchable={field === 'flow' || field === 'version' || field === 'fromMPID' || field === 'toMPID'}
                />
              </div>
            ))}

            <div>
              <label style={labelStyle}>Event Timestamp From</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="date" value={filters.eventTimestampFrom.split('T')[0] || ''}
                  onChange={(e) => { const time = filters.eventTimestampFrom.split('T')[1] || '00:00'; handleFilterChange('eventTimestampFrom', e.target.value ? `${e.target.value}T${time}` : ''); }}
                  style={smallInputStyle} />
                <input type="time" value={filters.eventTimestampFrom.split('T')[1] || ''}
                  onChange={(e) => { const date = filters.eventTimestampFrom.split('T')[0]; if (date) handleFilterChange('eventTimestampFrom', `${date}T${e.target.value}`); }}
                  style={smallInputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Event Timestamp To</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="date" value={filters.eventTimestampTo.split('T')[0] || ''}
                  onChange={(e) => { const time = filters.eventTimestampTo.split('T')[1] || '23:59'; handleFilterChange('eventTimestampTo', e.target.value ? `${e.target.value}T${time}` : ''); }}
                  style={smallInputStyle} />
                <input type="time" value={filters.eventTimestampTo.split('T')[1] || ''}
                  onChange={(e) => { const date = filters.eventTimestampTo.split('T')[0]; if (date) handleFilterChange('eventTimestampTo', `${date}T${e.target.value}`); }}
                  style={smallInputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>File Creation Date</label>
              <input type="date" value={filters.fileCreationDate} onChange={(e) => handleFilterChange('fileCreationDate', e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Publish Date</label>
              <input type="date" value={filters.publishDate} onChange={(e) => handleFilterChange('publishDate', e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Unique ID</label>
              <input type="text" value={filters.fileId} onChange={(e) => handleFilterChange('fileId', e.target.value)} placeholder="Enter Unique ID" style={inputStyle} />
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
          <button onClick={() => { setAppliedFilters({ ...filters }); handleQuery(filters); }} style={{
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
          {/* Selection Criteria - only show if any filter is applied */}
          {(filters.sourceApp !== 'All' || filters.destinationApp !== 'All' || filters.eventType !== 'All' || 
            filters.flow !== 'All' || filters.version !== 'All' || filters.receivingApp !== 'All' || 
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
                {filters.receivingApp !== 'All' && (
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Receiving App: {filters.receivingApp}
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
                {filters.fileId && (
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
