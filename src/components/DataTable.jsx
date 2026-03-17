import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Download, ArrowUp, ArrowDown, Filter, Calendar, X } from 'lucide-react';
import ExportDropdown from './ExportDropdown';
import EmailModal from './EmailModal';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import { wildcardMatch } from '../utils/auditUtils';
import useDebounce from '../hooks/useDebounce';

const DATE_COLUMNS = ['created', 'timestamp'];
const MAX_FILTER_SUGGESTIONS = 50;
const MAX_EXPORT_ROWS = 5000;

const ColumnFilterPopover = ({ col, columnFilters, setColumnFilters, onClose, allData, anchorRef }) => {
  const ref = useRef(null);
  const isDateCol = DATE_COLUMNS.includes(col.key);
  const filterVal = columnFilters[col.key] || '';
  const [localVal, setLocalVal] = useState(filterVal);
  const debouncedVal = useDebounce(localVal, 300);
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

  // Sync debounced value to actual filter
  useEffect(() => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (debouncedVal) next[col.key] = debouncedVal;
      else delete next[col.key];
      return next;
    });
  }, [debouncedVal, col.key, setColumnFilters]);

  const handleChange = (val) => {
    setLocalVal(val);
  };

  const handleSelect = (val) => {
    setLocalVal(val);
    setColumnFilters(prev => {
      const next = { ...prev };
      if (val) next[col.key] = val;
      else delete next[col.key];
      return next;
    });
    onClose();
  };

  // Pre-compute unique values once, then filter — capped at MAX_FILTER_SUGGESTIONS
  const uniqueValues = useMemo(() => {
    return [...new Set(allData.map(row => String(row[col.key] || '')).filter(Boolean))].sort();
  }, [allData, col.key]);

  const matchingValues = useMemo(() => {
    if (isDateCol || !localVal) return [];
    return uniqueValues.filter(v => wildcardMatch(v, localVal)).slice(0, MAX_FILTER_SUGGESTIONS);
  }, [uniqueValues, localVal, isDateCol]);

  const totalMatches = useMemo(() => {
    if (isDateCol || !localVal) return 0;
    return uniqueValues.filter(v => wildcardMatch(v, localVal)).length;
  }, [uniqueValues, localVal, isDateCol]);

  const showDropdown = !isDateCol && localVal && matchingValues.length > 0;

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
        <input
          type="date"
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0',
            borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#4c4ebd')}
          onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Search ${col.label}...`}
          style={{
            width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0',
            borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#4c4ebd')}
          onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
          autoFocus
        />
      )}
      {showDropdown && (
        <div style={{
          marginTop: '6px', maxHeight: '180px', overflowY: 'auto',
          border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff',
        }}>
          <div style={{ padding: '4px 10px', fontSize: '10px', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
            {totalMatches > MAX_FILTER_SUGGESTIONS
              ? `Showing ${MAX_FILTER_SUGGESTIONS} of ${totalMatches} matches`
              : `${totalMatches} match${totalMatches !== 1 ? 'es' : ''} found`
            }
          </div>
          {matchingValues.map((val) => (
            <div
              key={val}
              onClick={() => handleSelect(val)}
              style={{
                padding: '7px 10px', fontSize: '12px', color: '#334155',
                cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {val}
            </div>
          ))}
        </div>
      )}
      {!isDateCol && localVal && matchingValues.length === 0 && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '6px 0' }}>
          No matches found
        </div>
      )}
      {localVal && (
        <button
          onClick={() => { handleChange(''); handleSelect(''); }}
          style={{
            marginTop: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 600,
            background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
            borderRadius: '6px', cursor: 'pointer', width: '100%',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
};

const DataTable = ({ data, columns, compactColumns, onDownload, exportConfig, onViewDetail }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('dataTablePage');
    if (saved) {
      sessionStorage.removeItem('dataTablePage');
      return Number(saved) || 1;
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = sessionStorage.getItem('dataTablePageSize');
    if (saved) {
      sessionStorage.removeItem('dataTablePageSize');
      return Number(saved) || 10;
    }
    return 10;
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const filterBtnRefs = useRef({});
  const [colWidths, setColWidths] = useState({});
  const [viewAll, setViewAll] = useState(false);
  const resizing = useRef(null);

  const activeColumns = compactColumns && !viewAll ? compactColumns : columns;

  const handleResizeStart = useCallback((colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const th = e.target.parentElement;
    const startWidth = th.offsetWidth;

    const onMouseMove = (moveE) => {
      const diff = moveE.clientX - startX;
      const newWidth = Math.max(60, startWidth + diff);
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizing.current = null;
    };

    resizing.current = colKey;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Memoized: Global search using debounced term
  const globalFiltered = useMemo(() => {
    if (!debouncedSearch) return data;
    const term = debouncedSearch.toLowerCase();
    return data.filter(item =>
      Object.values(item).some(val =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [data, debouncedSearch]);

  // Memoized: Per-column filters
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(([, val]) => val);
    if (activeFilters.length === 0) return globalFiltered;

    return globalFiltered.filter(item => {
      return activeFilters.every(([key, val]) => {
        const cellVal = String(item[key] || '');
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
  }, [globalFiltered, columnFilters]);

  // Memoized: Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, columnFilters]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

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

  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  const getStatusClass = (status) => {
    if (status === 'Success') return 'status-success';
    if (status === 'Failed') return 'status-failed';
    if (status === 'In Progress') return 'status-progress';
    return '';
  };

  const handleExport = useCallback((exportFn) => {
    if (sortedData.length > MAX_EXPORT_ROWS) {
      const proceed = window.confirm(
        `You are about to export ${sortedData.length.toLocaleString()} rows. This may take a while and could slow down your browser.\n\nContinue?`
      );
      if (!proceed) return;
    }
    exportFn();
  }, [sortedData.length]);

  return (
    <div className="table-container">
      <div className="table-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="modern-search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="modern-search-input"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {exportConfig && (
            <ExportDropdown
              onExportPDF={() => handleExport(() => exportToPDF(sortedData, columns, exportConfig.filename))}
              onExportExcel={() => handleExport(() => exportToExcel(sortedData, columns, exportConfig.filename))}
              onExportCSV={() => handleExport(() => exportToCSV(sortedData, columns, exportConfig.filename))}
              onSendEmail={() => setShowEmailModal(true)}
            />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
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
          <select
            className="page-size-selector"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
              setViewAll(false);
            }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
          <span
            onClick={() => onViewDetail ? onViewDetail() : setViewAll(!viewAll)}
            style={{
              color: viewAll ? '#dc2626' : '#4f46e5',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              marginLeft: '14px',
            }}
          >
            {viewAll ? 'Collapse Table' : 'View in Detail'}
          </span>
        </div>
      </div>

      {showEmailModal && <EmailModal onClose={() => setShowEmailModal(false)} />}

      <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table
          className="data-table"
          style={Object.keys(colWidths).length > 0 ? { tableLayout: 'fixed', width: 'max-content', minWidth: '100%' } : undefined}
        >
          {Object.keys(colWidths).length > 0 && (
            <colgroup>
              {activeColumns.map((col) => (
                <col key={col.key} style={{ width: colWidths[col.key] ? `${colWidths[col.key]}px` : undefined }} />
              ))}
              {onDownload && <col style={{ width: '80px' }} />}
            </colgroup>
          )}
          <thead>
            <tr>
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    position: 'sticky', top: 0, zIndex: 20, userSelect: 'none',
                    width: colWidths[col.key] ? `${colWidths[col.key]}px` : undefined,
                    minWidth: '60px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                      onClick={() => handleSort(col.key)}
                      style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}
                    >
                      {col.label}
                      <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '2px', lineHeight: 0, flexShrink: 0 }}>
                        <ArrowUp
                          size={10}
                          color={sortConfig.key === col.key && sortConfig.direction === 'asc' ? '#4c4ebd' : '#cbd5e1'}
                          strokeWidth={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 3 : 2}
                          style={{ marginBottom: '-1px' }}
                        />
                        <ArrowDown
                          size={10}
                          color={sortConfig.key === col.key && sortConfig.direction === 'desc' ? '#4c4ebd' : '#cbd5e1'}
                          strokeWidth={sortConfig.key === col.key && sortConfig.direction === 'desc' ? 3 : 2}
                          style={{ marginTop: '-1px' }}
                        />
                      </span>
                    </span>
                    <button
                      ref={(el) => { filterBtnRefs.current[col.key] = el; }}
                      onClick={(e) => toggleFilter(col.key, e)}
                      title={`Filter ${col.label}`}
                      style={{
                        background: columnFilters[col.key] ? '#eef2ff' : 'transparent',
                        border: 'none', cursor: 'pointer', padding: '2px',
                        borderRadius: '4px', display: 'flex', alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {DATE_COLUMNS.includes(col.key) ? (
                        <Calendar size={12} color={columnFilters[col.key] ? '#4c4ebd' : '#94a3b8'} />
                      ) : (
                        <Filter size={12} color={columnFilters[col.key] ? '#4c4ebd' : '#94a3b8'} />
                      )}
                    </button>
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(col.key, e)}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px',
                      cursor: 'col-resize', zIndex: 25,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  />
                  {activeFilter === col.key && (
                    <ColumnFilterPopover
                      col={col}
                      columnFilters={columnFilters}
                      setColumnFilters={(fn) => { setColumnFilters(fn); setCurrentPage(1); }}
                      onClose={() => setActiveFilter(null)}
                      allData={data}
                      anchorRef={{ current: filterBtnRefs.current[col.key] }}
                    />
                  )}
                </th>
              ))}
              {onDownload && <th style={{ width: '80px', position: 'sticky', top: 0, zIndex: 20 }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + (onDownload ? 1 : 0)} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No records found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx}>
                  {activeColumns.map((col) => (
                    <td key={col.key}>
                      {col.key === 'status' ? (
                        <span className={`status-badge ${getStatusClass(row[col.key])}`}>
                          {row[col.key]}
                        </span>
                      ) : col.key === 'application' ? (
                        <span
                          style={{ color: '#4c4ebd', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            sessionStorage.setItem('dataTablePage', String(currentPage));
                            sessionStorage.setItem('dataTablePageSize', String(pageSize));
                            navigate(`/audit-details`, { state: { record: row } });
                          }}
                        >
                          {row[col.key]}
                        </span>
                      ) : (
                        row[col.key]
                      )}
                    </td>
                  ))}
                  {onDownload && (
                    <td>
                      <button
                        className="table-download-btn"
                        onClick={() => onDownload(row)}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 0', marginTop: '0' }}>
        <div className="pagination-info">
          {`Showing ${sortedData.length === 0 ? 0 : startIndex + 1} to ${Math.min(startIndex + pageSize, sortedData.length)} of ${sortedData.length} entries`}
        </div>
        <div className="pagination-buttons">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">Page {currentPage} of {totalPages}</span>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
