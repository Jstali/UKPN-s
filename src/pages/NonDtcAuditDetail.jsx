import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const ALL_COLUMNS = [
  { key: 'uniqueId', label: 'Unique ID' },
  { key: 'flow', label: 'Source Application' },
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
  const location = useLocation();

  const defaultFilters = {
    flow: 'All',
    eventType: 'All',
    status: 'All',
    fileId: '',
  };

  const [filters, setFilters] = useState({ ...defaultFilters });
  const [hasQueried, setHasQueried] = useState(true);
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredResults, setFilteredResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        let allData = [];
        let token = null;
        do {
          const response = await api.fetchNonDtcAuditData(token, 100);
          allData = [...allData, ...(response.data || [])];
          token = response.continuationToken || null;
        } while (token);
        
        // Map SAP API fields to expected format
        const mappedData = allData.map(item => ({
          uniqueId: item.id || '',
          flow: item.sourceAppName || item.subscription || 'UNKNOWN',
          sourceFile: item.sourceFileName || '',
          fileId: item.id || '',
          sourcePath: item.sourcePath || '',
          eventType: item.events?.[0]?.eventType || '',
          startDate: item.events?.[0]?.timestamp ? new Date(item.events[0].timestamp).toLocaleString() : '',
          endDate: item.events?.[item.events.length - 1]?.timestamp ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString() : '',
          status: item.status || '',
          timestamp: item.timestamp || '',
          rawData: item
        }));
        
        setAuditData(mappedData);
        setFilteredResults(mappedData);
      } catch (error) {
        console.error('Error fetching Non-DTC audit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply filters from navigation state
  useEffect(() => {
    if (location.state?.filters && auditData.length > 0) {
      const incomingFilters = location.state.filters;
      setFilters(incomingFilters);
      
      let results = [...auditData];
      if (incomingFilters.sourceApp !== 'All') results = results.filter(r => r.flow === incomingFilters.sourceApp);
      if (incomingFilters.subscription !== 'All') results = results.filter(r => r.rawData?.subscription === incomingFilters.subscription);
      if (incomingFilters.status !== 'All') results = results.filter(r => r.status === incomingFilters.status);
      if (incomingFilters.eventType !== 'All') results = results.filter(r => r.eventType === incomingFilters.eventType);
      if (incomingFilters.sourceFile) results = results.filter(r => r.sourceFile?.toLowerCase().includes(incomingFilters.sourceFile.toLowerCase()));
      if (incomingFilters.fileId) results = results.filter(r => r.fileId?.includes(incomingFilters.fileId));
      if (incomingFilters.fileCreated) {
        results = results.filter(r => {
          const fileDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return fileDate === incomingFilters.fileCreated;
        });
      }
      if (incomingFilters.eventFrom) {
        results = results.filter(r => {
          const eventDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return eventDate >= incomingFilters.eventFrom;
        });
      }
      if (incomingFilters.eventTo) {
        results = results.filter(r => {
          const eventDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return eventDate <= incomingFilters.eventTo;
        });
      }
      
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
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleQuery = () => {
    let results = [...auditData];
    if (filters.flow !== 'All') results = results.filter(r => r.flow === filters.flow);
    if (filters.eventType !== 'All') results = results.filter(r => r.eventType === filters.eventType);
    if (filters.status !== 'All') results = results.filter(r => r.status === filters.status);
    if (filters.fileId) results = results.filter(r => r.fileId && r.fileId.includes(filters.fileId));
    setFilteredResults(results);
    setCurrentPage(1);
    setHasQueried(true);
  };

  // Build dropdown options
  const flowOptions = ['All', ...new Set(auditData.map(r => r.flow).filter(Boolean))].sort();
  const eventTypeOptions = ['All', ...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort();
  const statusOptions = ['All', ...new Set(auditData.map(r => r.status).filter(Boolean))].sort();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Detail View</span>
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
              <label style={labelStyle}>Source Application</label>
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

      {/* Loading state */}
      {loading && (
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
      {!loading && hasQueried && (
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
                              background: (row[col.key] || '').toLowerCase() === 'success' ? '#dcfce7' : (row[col.key] || '').toLowerCase() === 'failed' ? '#fef2f2' : '#f1f5f9',
                              color: (row[col.key] || '').toLowerCase() === 'success' ? '#16a34a' : (row[col.key] || '').toLowerCase() === 'failed' ? '#dc2626' : '#475569',
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
