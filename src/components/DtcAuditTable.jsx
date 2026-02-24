import React from 'react';
import { Link } from 'react-router-dom';

const DtcAuditTable = ({ data }) => {
  return (
    <div className="table-container">
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
          {data.length === 0 ? (
            <tr>
              <td colSpan={12} style={{ textAlign: 'center', padding: '20px' }}>No results found</td>
            </tr>
          ) : (
            data.map((result, index) => (
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
    </div>
  );
};

export default DtcAuditTable;
