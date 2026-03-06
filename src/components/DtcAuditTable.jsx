import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const DtcAuditTable = ({ data }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('dtcAuditTablePage');
    if (saved) {
      sessionStorage.removeItem('dtcAuditTablePage');
      return Number(saved) || 1;
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = sessionStorage.getItem('dtcAuditTablePageSize');
    if (saved) {
      sessionStorage.removeItem('dtcAuditTablePageSize');
      return Number(saved) || 10;
    }
    return 10;
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Reset to page 1 when data changes (skip on first mount if restoring page)
  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [data]);

  const filteredData = data.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="table-container">
      <div className="table-controls">
        <div className="modern-search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="modern-search-input"
            placeholder="Search results..."
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
          <option value={200}>200 per page</option>
        </select>
      </div>

      <table className="dtc-results-table">
        <thead>
          <tr>
            <th>Unique ID</th>
            <th>Flow ID</th>
            <th>Flow Version</th>
            <th>Event Type</th>
            <th>Source Application</th>
            <th>Destination Application</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No results found</td>
            </tr>
          ) : (
            paginatedData.map((result, index) => (
              <tr key={index}>
                <td>
                  <span
                    className="file-link"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      sessionStorage.setItem('dtcAuditTablePage', String(currentPage));
                      sessionStorage.setItem('dtcAuditTablePageSize', String(pageSize));
                      navigate('/audit-details', { state: { record: result } });
                    }}
                  >{result.id}</span>
                </td>
                <td>{result.flowVersion?.replace(/\d+$/, '') || ''}</td>
                <td>{result.flowVersion?.match(/\d+$/)?.[0] || ''}</td>
                <td><strong>{result.eventType}</strong></td>
                <td>{result.recApp || result.application || ''}</td>
                <td>{result.application || ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pagination">
        <div className="pagination-info">
          Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length} entries
        </div>
        <div className="pagination-buttons">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            ⟪
          </button>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info" style={{ fontWeight: 500 }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            ⟫
          </button>
        </div>
      </div>
    </div>
  );
};

export default DtcAuditTable;
