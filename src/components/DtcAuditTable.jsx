import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DtcAuditTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div className="table-container">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
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
          Showing {startIndex + 1} to {Math.min(startIndex + pageSize, data.length)} of {data.length} entries
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

export default DtcAuditTable;
