import React, { useState, useEffect, useRef, useMemo } from 'react';
import { wildcardMatch } from '../utils/auditUtils';

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

export default ColumnFilterPopover;
