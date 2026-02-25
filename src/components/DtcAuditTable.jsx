import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const DtcAuditTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset to page 1 when data changes
  useEffect(() => {
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
        </select>
      </div>

      <table className="dtc-results-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>File Name</th>
            <th>Event Type</th>
            <th>Status</th>
            <th>Application</th>
            <th>Processed</th>
            <th>Timestamp</th>
            <th>Event ID</th>
            <th>Destination Path</th>
            <th>Destination File</th>
            <th>Source Path</th>
            <th>Header String</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={12} style={{ textAlign: 'center', padding: '20px' }}>No results found</td>
            </tr>
          ) : (
            paginatedData.map((result, index) => (
              <tr key={index}>
                <td>
                  <Link to={`/audit-details`} state={{ record: result }} className="file-link">{result.id}</Link>
                </td>
                <td>{result.fileName}</td>
                <td><strong>{result.eventType}</strong></td>
                <td>{result.status}</td>
                <td>{result.application}</td>
                <td>{result.processed}</td>
                <td>{new Date(result.timestamp).toLocaleString()}</td>
                <td>{result.eventId}</td>
                <td>{result.destinationPath}</td>
                <td>{result.destinationFileName}</td>
                <td>{result.sourcePath}</td>
                <td>{result.headerString}</td>
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
