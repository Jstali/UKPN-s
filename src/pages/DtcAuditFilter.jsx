import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RotateCcw, ArrowLeft } from 'lucide-react';
import DtcAuditTable from '../components/DtcAuditTable';
import auditData from '../data/Audit_Data_Dumy';

const DtcAuditFilter = () => {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
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

  const [hasQueried, setHasQueried] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(filteredResults.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = filteredResults.slice(startIndex, endIndex);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
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
    setHasQueried(false);
    setFilteredResults([]);
  };

  const handleQuery = () => {
    // Flatten the data - create one row per event
    let results = [];
    auditData.forEach(item => {
      if (item.events && item.events.length > 0) {
        item.events.forEach(event => {
          results.push({
            id: item.id,
            fileId: item.File_ID,
            fileName: item.Source_FileName,
            sourcePath: item.Source_Path,
            blobLocation: item.Blob_Location,
            blobFileName: item.Blob_File_Name,
            headerString: item.Header_String,
            checksum: item.Checksum_From_User,
            application: event.applicationName || event.Destination_Application || 'Unknown',
            eventType: event.Event_Type || 'Unknown',
            status: event.Status || 'Unknown',
            processed: event.processed || 'false',
            timestamp: event.timestamp || '',
            eventId: event.id || '',
            destinationPath: event.Destination_Path || '',
            destinationFileName: event.Destination_fileName || '',
            _rid: item._rid,
            _ts: item._ts
          });
        });
      }
    });
    
    // Apply filters
    if (filters.application !== 'All') {
      results = results.filter(item => item.application === filters.application);
    }
    if (filters.eventType !== 'All') {
      results = results.filter(item => item.eventType === filters.eventType);
    }
    if (filters.fileId) {
      results = results.filter(item => item.fileId.includes(filters.fileId));
    }
    if (filters.msgId) {
      results = results.filter(item => item.msgId && item.msgId.includes(filters.msgId));
    }

    setFilteredResults(results);
    setExceptionCount(0);
    setHasQueried(true);
    setCurrentPage(1);
    
    // Scroll to results after a short delay
    setTimeout(() => {
      const resultsSection = document.querySelector('.results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const flattenedAuditData = [];
  auditData.forEach(item => {
    if (item.events && item.events.length > 0) {
      item.events.forEach(event => {
        flattenedAuditData.push({
          application: event.applicationName || event.Destination_Application || 'Unknown',
          eventType: event.Event_Type || 'Unknown'
        });
      });
    }
  });

  const applicationOptions = ['All', ...new Set(flattenedAuditData.map(item => item.application).filter(Boolean))];
  const eventTypeOptions = ['All', ...new Set(flattenedAuditData.map(item => item.eventType).filter(Boolean))].sort();
  const flowOptions = ['All'];
  const versionOptions = ['All'];
  const fromRoleOptions = ['All'];
  const fromMPIDOptions = ['All'];
  const toRoleOptions = ['All'];
  const toMPIDOptions = ['All'];
  const recAppOptions = ['All'];

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb">
        <Link to="/">Home</Link> → <Link to="/dtc-audit">DTC Audit</Link> → Filters
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="page-title">DTC Audit Filters</h1>
        <button
          onClick={() => navigate('/dtc-audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={18} />
          Back to Audit
        </button>
      </div>

      <motion.div
        className="filters-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="filters-grid">
          <div className="filter-field">
            <fieldset>
              <legend>Application</legend>
              <select value={filters.application} onChange={(e) => handleFilterChange('application', e.target.value)}>
                {applicationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>Event Type</legend>
              <select value={filters.eventType} onChange={(e) => handleFilterChange('eventType', e.target.value)}>
                {eventTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>Flow</legend>
              <select value={filters.flow} onChange={(e) => handleFilterChange('flow', e.target.value)}>
                {flowOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>Version</legend>
              <select value={filters.version} onChange={(e) => handleFilterChange('version', e.target.value)}>
                {versionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>From Role</legend>
              <select value={filters.fromRole} onChange={(e) => handleFilterChange('fromRole', e.target.value)}>
                {fromRoleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>

          <div className="filter-field">
            <fieldset>
              <legend>From MPID</legend>
              <select value={filters.fromMPID} onChange={(e) => handleFilterChange('fromMPID', e.target.value)}>
                {fromMPIDOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>To Role</legend>
              <select value={filters.toRole} onChange={(e) => handleFilterChange('toRole', e.target.value)}>
                {toRoleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>To MPID</legend>
              <select value={filters.toMPID} onChange={(e) => handleFilterChange('toMPID', e.target.value)}>
                {toMPIDOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>

          <div className="filter-field">
            <fieldset>
              <legend>Receiving App</legend>
              <select value={filters.receivingApp} onChange={(e) => handleFilterChange('receivingApp', e.target.value)}>
                {recAppOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>Event Timestamp From</legend>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="date" 
                  value={filters.eventTimestampFrom.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = filters.eventTimestampFrom.split('T')[1] || '00:00';
                    handleFilterChange('eventTimestampFrom', e.target.value ? `${e.target.value}T${time}` : '');
                  }}
                  style={{ flex: 1 }}
                />
                <input 
                  type="time" 
                  value={filters.eventTimestampFrom.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = filters.eventTimestampFrom.split('T')[0] || new Date().toISOString().split('T')[0];
                    handleFilterChange('eventTimestampFrom', `${date}T${e.target.value}`);
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>Event Timestamp To</legend>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="date" 
                  value={filters.eventTimestampTo.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = filters.eventTimestampTo.split('T')[1] || '23:59';
                    handleFilterChange('eventTimestampTo', e.target.value ? `${e.target.value}T${time}` : '');
                  }}
                  style={{ flex: 1 }}
                />
                <input 
                  type="time" 
                  value={filters.eventTimestampTo.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = filters.eventTimestampTo.split('T')[0] || new Date().toISOString().split('T')[0];
                    handleFilterChange('eventTimestampTo', `${date}T${e.target.value}`);
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>File Creation Date</legend>
              <input 
                type="date" 
                value={filters.fileCreationDate}
                onChange={(e) => handleFilterChange('fileCreationDate', e.target.value)}
              />
            </fieldset>
          </div>

          <div className="filter-field">
            <fieldset>
              <legend>File ID</legend>
              <input 
                type="text" 
                value={filters.fileId}
                onChange={(e) => handleFilterChange('fileCreationDate', e.target.value)}
              />
            </fieldset>
          </div>

          <div className="filter-field">
            <fieldset>
              <legend>File ID</legend>
              <input 
                type="text" 
                value={filters.fileId}
                onChange={(e) => handleFilterChange('fileId', e.target.value)}
                placeholder="Enter File ID"
              />
            </fieldset>
          </div>
          <div className="filter-field">
            <fieldset>
              <legend>Msg ID</legend>
              <input 
                type="text" 
                value={filters.msgId}
                onChange={(e) => handleFilterChange('msgId', e.target.value)}
                placeholder="Enter Msg ID"
              />
            </fieldset>
          </div>
          <div className="filter-field filter-field-large">
            <fieldset>
              <legend>Search File Contents For (e.g. MPAN Number)</legend>
              <input 
                type="text" 
                value={filters.searchFileContents}
                onChange={(e) => handleFilterChange('searchFileContents', e.target.value)}
                placeholder="Enter search term"
              />
            </fieldset>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-query" onClick={handleQuery}>
            <Search size={18} />
            Query
          </button>
          <button className="btn-reset" onClick={handleReset}>
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </motion.div>

      {hasQueried && (
        <>
          <motion.div
            className="selection-criteria"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3>Your Selection Criteria Is</h3>
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
              <div><strong>Event Timestamp From:</strong> {filters.eventTimestampFrom || 'N/A'}</div>
              <div><strong>Event Timestamp To:</strong> {filters.eventTimestampTo || 'N/A'}</div>
              <div><strong>Created Date:</strong> {filters.fileCreationDate || 'N/A'}</div>
              <div><strong>File ID:</strong> {filters.fileId || 'N/A'}</div>
              <div><strong>Msg ID:</strong> {filters.msgId || 'N/A'}</div>
              <div><strong>Search File Contents:</strong> {filters.searchFileContents || 'N/A'}</div>
            </div>
            <p className="exception-message">
              There have been <span className="exception-count">{exceptionCount} DTC exception messages</span> since N/A relating to your applications
            </p>
          </motion.div>

          <motion.div
            className="results-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="results-title">Your Results Are :</h3>
            <DtcAuditTable data={currentData} />
            
            {/* Pagination Controls */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '20px',
              padding: '16px',
              background: 'white',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Page Size:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 32px 6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {startIndex + 1} to {Math.min(endIndex, filteredResults.length)} of {filteredResults.length}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f3f4f6' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ⟪
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f3f4f6' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ‹
                </button>
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f3f4f6' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f3f4f6' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ⟫
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default DtcAuditFilter;
