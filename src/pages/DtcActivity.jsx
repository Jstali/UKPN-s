import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, RotateCcw, Download } from 'lucide-react';

const DtcActivity = () => {
  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem('dtcFilters');
    return saved ? JSON.parse(saved) : {
      application: 'All',
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
      searchFileContents: ''
    };
  });

  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('dtcResults');
    return saved ? JSON.parse(saved) : [];
  });

  const [hasSearched, setHasSearched] = useState(() => {
    const saved = sessionStorage.getItem('dtcHasSearched');
    return saved === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('dtcFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    sessionStorage.setItem('dtcResults', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    sessionStorage.setItem('dtcHasSearched', hasSearched.toString());
  }, [hasSearched]);

  const mockResults = [
    {
      flowVers: 'D0030 001',
      fileId: '0065078209',
      fromRole: 'G',
      fromMPID: 'CAPG',
      toRole: 'R',
      toMPID: 'EELC',
      created: '12/02/2026 08:02:40',
      eventType: 'MSG RCVD INTO EWAY',
      publishedTopic: 'Source file name',
      sentOut: 'SENT OUT TO APP Q',
      writtenFlow: 'Destination file name',
      applicationName: 'ELECTRALINK',
      recApp: 'DURABILL',
      durabillApp: 'DURABILL1_PHUB03',
      downloadLink: '12376001221607',
      eventTimestamp: '12/02/2026 08:32:3'
    },
    {
      flowVers: 'D0030 001',
      fileId: '0065078198',
      fromRole: 'G',
      fromMPID: 'CAPG',
      toRole: 'R',
      toMPID: 'LOND',
      created: '12/02/2026 07:57:50',
      eventType: 'MSG RCVD INTO EWAY',
      publishedTopic: 'Source file name',
      sentOut: 'SENT OUT TO APP Q',
      writtenFlow: 'Destination file name',
      applicationName: 'ELECTRALINK',
      recApp: 'DURABILL',
      durabillApp: 'DURABILL1_PHUB03',
      downloadLink: '12376001082599',
      eventTimestamp: '12/02/2026 08:31:5'
    }
  ];

  const handleQuery = () => {
    setResults(mockResults);
    setHasSearched(true);
  };

  const handleReset = () => {
    setFilters({
      application: 'All',
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
      searchFileContents: ''
    });
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/">Home</Link> → DTC Activity
      </div>
      <h1 className="page-title">Welcome to file connect</h1>
      
      <div className="dtc-activity-container">
        <div className="dtc-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Application</label>
              <select value={filters.application} onChange={(e) => setFilters({...filters, application: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Event Type</label>
              <select value={filters.eventType} onChange={(e) => setFilters({...filters, eventType: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Flow</label>
              <select value={filters.flow} onChange={(e) => setFilters({...filters, flow: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Version</label>
              <select value={filters.version} onChange={(e) => setFilters({...filters, version: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>From Role</label>
              <select value={filters.fromRole} onChange={(e) => setFilters({...filters, fromRole: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>From MPID</label>
              <select value={filters.fromMPID} onChange={(e) => setFilters({...filters, fromMPID: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>To Role</label>
              <select value={filters.toRole} onChange={(e) => setFilters({...filters, toRole: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>To MPID</label>
              <select value={filters.toMPID} onChange={(e) => setFilters({...filters, toMPID: e.target.value})}>
                <option>All</option>
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Receiving App</label>
              <select value={filters.receivingApp} onChange={(e) => setFilters({...filters, receivingApp: e.target.value})}>
                <option>All</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Event Timestamp From (dd/mm/yyyy hh:mm)</label>
              <input type="text" value={filters.eventTimestampFrom} onChange={(e) => setFilters({...filters, eventTimestampFrom: e.target.value})} />
            </div>
            <div className="filter-group">
              <label>Event Timestamp To (dd/mm/yyyy hh:mm)</label>
              <input type="text" value={filters.eventTimestampTo} onChange={(e) => setFilters({...filters, eventTimestampTo: e.target.value})} />
            </div>
            <div className="filter-group">
              <label>File Creation Date (yyyymmdd or yyyy or mmdd)</label>
              <input type="text" value={filters.fileCreationDate} onChange={(e) => setFilters({...filters, fileCreationDate: e.target.value})} />
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>File ID</label>
              <input type="text" value={filters.fileId} onChange={(e) => setFilters({...filters, fileId: e.target.value})} />
            </div>
            <div className="filter-group">
              <label>Msg ID</label>
              <input type="text" value={filters.msgId} onChange={(e) => setFilters({...filters, msgId: e.target.value})} />
            </div>
            <div className="filter-group filter-group-wide">
              <label>Search File Contents For (e.g. MPAN Number)</label>
              <input type="text" value={filters.searchFileContents} onChange={(e) => setFilters({...filters, searchFileContents: e.target.value})} />
            </div>
          </div>

          <div className="filter-actions">
            <button className="button button-query" onClick={handleQuery}>
              <Search size={16} /> Query
            </button>
            <button className="button button-warning" onClick={handleReset}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>

        {hasSearched && (
          <>
            <div className="selection-criteria">
              <h3>Your Selection Criteria is</h3>
              <div className="criteria-grid">
                <div><strong>Application:</strong> {filters.application}</div>
                <div><strong>Event Type:</strong> {filters.eventType}</div>
                <div><strong>Flow:</strong> {filters.flow}</div>
                <div><strong>Version:</strong> {filters.version}</div>
                <div><strong>From Role:</strong> {filters.fromRole}</div>
                <div><strong>From MPID:</strong> {filters.fromMPID}</div>
                <div><strong>To Role:</strong> {filters.toRole}</div>
                <div><strong>To MPID:</strong> {filters.toMPID}</div>
                <div><strong>Receiving App:</strong> {filters.receivingApp}</div>
                <div><strong>Event Timestamp From:</strong> {filters.eventTimestampFrom}</div>
                <div><strong>Event Timestamp To:</strong> {filters.eventTimestampTo}</div>
                <div><strong>Created Date:</strong> {filters.fileCreationDate}</div>
                <div><strong>File ID:</strong> {filters.fileId}</div>
                <div><strong>Msg ID:</strong> {filters.msgId}</div>
                <div><strong>Search File Contents:</strong> {filters.searchFileContents}</div>
              </div>
              <p className="dtc-message">
                There have been <strong>0 DTC exception messages</strong> since {filters.eventTimestampFrom || 'N/A'} relating to your applications
              </p>
            </div>

            <div className="results-section">
              <h3>Your Results Are :</h3>
              <div className="table-container">
                <table className="dtc-results-table">
                  <thead>
                    <tr>
                      <th>Flow Vers</th>
                      <th>File Id</th>
                      <th>From Role</th>
                      <th>From MPID</th>
                      <th>To Role</th>
                      <th>To MPID</th>
                      <th>Created</th>
                      <th>Rec App</th>
                      <th>File Name</th>
                      <th>Event Type</th>
                      <th>Application Name</th>
                      <th>Time Stamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <React.Fragment key={index}>
                        <tr>
                          <td rowSpan="4">{result.flowVers}</td>
                          <td rowSpan="4">{result.fileId}</td>
                          <td rowSpan="4">{result.fromRole}</td>
                          <td rowSpan="4">{result.fromMPID}</td>
                          <td rowSpan="4">{result.toRole}</td>
                          <td rowSpan="4">{result.toMPID}</td>
                          <td rowSpan="4">{result.created}</td>
                          <td rowSpan="4">{result.recApp}</td>
                          <td>
                            <Link to={`/file-view/${result.fileId}`} className="file-link">Source filename</Link>
                          </td>
                          <td>File sent to FileConnect</td>
                          <td>Source app name</td>
                          <td>{result.eventTimestamp}</td>
                        </tr>
                        <tr>
                          <td></td>
                          <td>Publiced topic</td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td></td>
                          <td>Msg sent to Subcribed APP</td>
                          <td>Subcribed app name</td>
                          <td>12/02/2026 08:32:4</td>
                        </tr>
                        <tr>
                          <td>Destination file name</td>
                          <td>File Delivered to destination</td>
                          <td>Destination app name</td>
                          <td>12/02/2026 08:30:2</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DtcActivity;
