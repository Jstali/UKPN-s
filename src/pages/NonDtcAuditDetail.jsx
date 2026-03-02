import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { nonDtcAuditData } from '../data/mockData';

const ALL_COLUMNS = [
  { key: 'uniqueId', label: 'Unique ID' },
  { key: 'flow', label: 'Flow' },
  { key: 'sourceFile', label: 'Source File' },
  { key: 'fileId', label: 'File ID' },
  { key: 'sourcePath', label: 'Source Path' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'status', label: 'Status' },
];

const NonDtcAuditDetail = () => {
  const navigate = useNavigate();

  const defaultFilters = {
    flow: 'All',
    eventType: 'All',
    status: 'All',
    fileId: '',
  };

  const [filters, setFilters] = useState({ ...defaultFilters });
  const [hasQueried, setHasQueried] = useState(true);
  const [filteredResults, setFilteredResults] = useState(nonDtcAuditData);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...defaultFilters });
    setFilteredResults(nonDtcAuditData);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleQuery = () => {
    let results = [...nonDtcAuditData];
    if (filters.flow !== 'All') results = results.filter(r => r.flow === filters.flow);
    if (filters.eventType !== 'All') results = results.filter(r => r.eventType === filters.eventType);
    if (filters.status !== 'All') results = results.filter(r => r.status === filters.status);
    if (filters.fileId) results = results.filter(r => r.fileId && r.fileId.includes(filters.fileId));
    setFilteredResults(results);
    setCurrentPage(1);
    setHasQueried(true);
  };

  // Build dropdown options
  const flowOptions = ['All', ...new Set(nonDtcAuditData.map(r => r.flow).filter(Boolean))].sort();
  const eventTypeOptions = ['All', ...new Set(nonDtcAuditData.map(r => r.eventType).filter(Boolean))].sort();
  const statusOptions = ['All', ...new Set(nonDtcAuditData.map(r => r.status).filter(Boolean))].sort();

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
  const selectStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

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
            <Link to="/non-dtc-audit" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>Non DTC Audit</Link>
            {' > '}
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Detail View</span>
          </div>
        </div>
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
              <label style={labelStyle}>Flow</label>
              <select value={filters.flow} onChange={(e) => handleFilterChange('flow', e.target.value)} style={selectStyle}>
                {flowOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Event Type</label>
              <select value={filters.eventType} onChange={(e) => handleFilterChange('eventType', e.target.value)} style={selectStyle}>
                {eventTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} style={selectStyle}>
                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
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
                              background: row[col.key] === 'Success' ? '#dcfce7' : row[col.key] === 'Failed' ? '#fef2f2' : '#f1f5f9',
                              color: row[col.key] === 'Success' ? '#16a34a' : row[col.key] === 'Failed' ? '#dc2626' : '#475569',
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
