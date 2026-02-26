import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Download, ArrowUp, ArrowDown, Filter, Calendar, X } from 'lucide-react';
import ExportDropdown from './ExportDropdown';
import EmailModal from './EmailModal';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';

const DATE_COLUMNS = ['created', 'timestamp'];

// Wildcard matching: cos* = startsWith, *cos = endsWith, *cos* = contains, plain = contains
const wildcardMatch = (value, pattern) => {
  const val = value.toLowerCase();
  const pat = pattern.toLowerCase();
  const startsWithStar = pat.startsWith('*');
  const endsWithStar = pat.endsWith('*');
  const core = pat.replace(/^\*|\*$/g, '');
  if (!core) return true;
  if (startsWithStar && endsWithStar) return val.includes(core);
  if (startsWithStar) return val.endsWith(core);
  if (endsWithStar) return val.startsWith(core);
  return val.includes(core);
};

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

  // Get unique values for this column and filter by wildcard pattern
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
        <input
          type="date"
          value={filterVal}
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
          value={filterVal}
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
            {matchingValues.length} match{matchingValues.length !== 1 ? 'es' : ''} found
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
      {!isDateCol && filterVal && matchingValues.length === 0 && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '6px 0' }}>
          No matches found
        </div>
      )}
      {filterVal && (
        <button
          onClick={() => handleChange('')}
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

const DataTable = ({ data, columns, onDownload, exportConfig }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const filterBtnRefs = useRef({});
  const [colWidths, setColWidths] = useState({});
  const resizing = useRef(null);

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

  // Global search
  const globalFiltered = data.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Per-column filters (supports wildcard: cos*, *cos, *cos*)
  const filteredData = globalFiltered.filter(item => {
    return Object.entries(columnFilters).every(([key, val]) => {
      if (!val) return true;
      const cellVal = String(item[key] || '');
      if (DATE_COLUMNS.includes(key)) {
        const parts = cellVal.split(' ')[0]?.split('/');
        if (parts && parts.length === 3) {
          const cellDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          return cellDate === val;
        }
        return cellVal.includes(val);
      }
      // If filter has no wildcard and matches an exact value (user picked from dropdown), do exact match
      if (!val.includes('*')) {
        return cellVal.toLowerCase() === val.toLowerCase() || cellVal.toLowerCase().includes(val.toLowerCase());
      }
      return wildcardMatch(cellVal, val);
    });
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  return (
    <div className="table-container">
      <div className="table-controls">
        <div className="modern-search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="modern-search-input"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              className="search-clear-btn"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
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
          {exportConfig && (
            <ExportDropdown
              onExportPDF={() => exportToPDF(sortedData, columns, exportConfig.filename)}
              onExportExcel={() => exportToExcel(sortedData, columns, exportConfig.filename)}
              onExportCSV={() => exportToCSV(sortedData, columns, exportConfig.filename)}
              onSendEmail={() => setShowEmailModal(true)}
            />
          )}
          <select
            className="page-size-selector"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
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
              {columns.map((col) => (
                <col key={col.key} style={{ width: colWidths[col.key] ? `${colWidths[col.key]}px` : undefined }} />
              ))}
              {onDownload && <col style={{ width: '80px' }} />}
            </colgroup>
          )}
          <thead>
            <tr>
              {columns.map((col) => (
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
                <td colSpan={columns.length + (onDownload ? 1 : 0)} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No records found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.key === 'status' ? (
                        <span className={`status-badge ${getStatusClass(row[col.key])}`}>
                          {row[col.key]}
                        </span>
                      ) : col.key === 'application' ? (
                        <span
                          style={{ color: '#4c4ebd', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/audit-details`, { state: { record: row } })}
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
          Showing {sortedData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} entries
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
