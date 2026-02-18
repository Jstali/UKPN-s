import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, GitBranch, Search, RotateCcw } from 'lucide-react';
import DtcAuditTable from '../components/DtcAuditTable';
import DataTable from '../components/DataTable';
import AnimatedCounter from '../components/AnimatedCounter';
import { ShineBorder } from '../components/ui/shine-border';
import auditData from '../data/Audit_Data_Dumy';
import { exportToCSV } from '../utils/exportUtils';

const DtcAudit = ({ user }) => {
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

  // Restore scroll position when returning from details page
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('dtcAuditScrollPos');
    if (savedScrollPos) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos));
        sessionStorage.removeItem('dtcAuditScrollPos');
      }, 100);
    }
  }, []);

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
    if (filters.flow !== 'All') {
      results = results.filter(item => item.flowVersion === filters.flow);
    }
    if (filters.version !== 'All') {
      results = results.filter(item => item.version === filters.version);
    }
    if (filters.fromRole !== 'All') {
      results = results.filter(item => item.fromRole === filters.fromRole);
    }
    if (filters.fromMPID !== 'All') {
      results = results.filter(item => item.fromMPID === filters.fromMPID);
    }
    if (filters.toRole !== 'All') {
      results = results.filter(item => item.toRole === filters.toRole);
    }
    if (filters.toMPID !== 'All') {
      results = results.filter(item => item.toMPID === filters.toMPID);
    }
    if (filters.receivingApp !== 'All') {
      results = results.filter(item => item.recApp === filters.receivingApp);
    }
    if (filters.fileId) {
      results = results.filter(item => item.fileId.includes(filters.fileId));
    }
    if (filters.msgId) {
      results = results.filter(item => item.msgId && item.msgId.includes(filters.msgId));
    }

    // Don't group - show all events
    setFilteredResults(results);
    setExceptionCount(0);
    setHasQueried(true);
  };

  // Flatten audit data to show all events
  const flattenedAuditData = useMemo(() => {
    let flatData = [];
    auditData.forEach(item => {
      if (item.events && item.events.length > 0) {
        item.events.forEach(event => {
          flatData.push({
            ...item,
            application: event.applicationName || event.Destination_Application || 'Unknown',
            eventType: event.Event_Type || 'Unknown',
            status: event.Status || 'Unknown',
            processed: event.processed || 'false',
            timestamp: event.timestamp || '',
            eventId: event.id || '',
            destinationPath: event.Destination_Path || '',
            destinationFileName: event.Destination_fileName || ''
          });
        });
      }
    });
    return flatData;
  }, []);

  // Transform data for filter options
  const transformedData = auditData.map(item => ({
    application: item.events?.[0]?.applicationName || 'Unknown',
    eventType: item.events?.[0]?.Event_Type || 'Unknown'
  }));

  const applicationOptions = ['All', ...new Set(flattenedAuditData.map(item => item.application).filter(Boolean))];
  const eventTypeOptions = ['All', ...new Set(flattenedAuditData.map(item => item.eventType).filter(Boolean))].sort();
  const flowOptions = ['All'];
  const versionOptions = ['All'];
  const fromRoleOptions = ['All'];
  const fromMPIDOptions = ['All'];
  const toRoleOptions = ['All'];
  const toMPIDOptions = ['All'];
  const recAppOptions = ['All'];
  
  const uniqueFlows = 0;

  // Role-based access - Business users only see flow details
  const isBusiness = user?.role === 'Business';

  // Main table columns - limited for Business users
  const columns = isBusiness ? [
    { key: 'id', label: 'ID' },
    { key: 'Source_FileName', label: 'File Name' },
    { key: 'Header_String', label: 'Header String' },
    { key: 'eventType', label: 'Event Type' },
    { key: 'status', label: 'Status' },
    { key: 'application', label: 'Application' }
  ] : [
    { key: 'id', label: 'ID' },
    { key: 'Source_FileName', label: 'File Name' },
    { key: 'eventType', label: 'Event Type' },
    { key: 'status', label: 'Status' },
    { key: 'application', label: 'Application' },
    { key: 'processed', label: 'Processed' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'eventId', label: 'Event ID' },
    { key: 'destinationPath', label: 'Destination Path' },
    { key: 'destinationFileName', label: 'Destination File' },
    { key: 'Source_Path', label: 'Source Path' },
    { key: 'Header_String', label: 'Header String' }
  ];


  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb">
        <Link to="/">Home</Link> → DTC Audit
      </div>
      {isBusiness && (
        <div style={{ 
          background: '#dbeafe', 
          border: '1px solid #93c5fd', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          color: '#1e40af',
          fontSize: '14px'
        }}>
          <strong>Business View:</strong> Showing flow details only
        </div>
      )}
      <h1 className="page-title">DTC Audit</h1>

      <div className="summary-cards">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ShineBorder
            className="summary-card"
            color={["#f97316", "#fb923c", "#fdba74"]}
            borderRadius={8}
            borderWidth={2}
            duration={10}
          >
            <div className="summary-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>
              <FileText />
            </div>
            <div className="summary-content">
              <h3>Total Events</h3>
              <p><AnimatedCounter value={flattenedAuditData.length} /></p>
            </div>
          </ShineBorder>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ShineBorder
            className="summary-card"
            color={["#3b82f6", "#60a5fa", "#93c5fd"]}
            borderRadius={8}
            borderWidth={2}
            duration={10}
          >
            <div className="summary-icon" style={{ background: '#dcfce7', color: '#10b981' }}>
              <GitBranch />
            </div>
            <div className="summary-content">
              <h3>Unique Flows</h3>
              <p><AnimatedCounter value={uniqueFlows} /></p>
            </div>
          </ShineBorder>
        </motion.div>
      </div>

      <motion.div
        className="filters-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="filters-grid">
          {/* Row 1 */}
          <div className="filter-field">
            <label>Application</label>
            <select value={filters.application} onChange={(e) => handleFilterChange('application', e.target.value)}>
              {applicationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Event Type</label>
            <select value={filters.eventType} onChange={(e) => handleFilterChange('eventType', e.target.value)}>
              {eventTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Flow</label>
            <select value={filters.flow} onChange={(e) => handleFilterChange('flow', e.target.value)}>
              {flowOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Version</label>
            <select value={filters.version} onChange={(e) => handleFilterChange('version', e.target.value)}>
              {versionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>From Role</label>
            <select value={filters.fromRole} onChange={(e) => handleFilterChange('fromRole', e.target.value)}>
              {fromRoleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Row 2 */}
          <div className="filter-field">
            <label>From MPID</label>
            <select value={filters.fromMPID} onChange={(e) => handleFilterChange('fromMPID', e.target.value)}>
              {fromMPIDOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>To Role</label>
            <select value={filters.toRole} onChange={(e) => handleFilterChange('toRole', e.target.value)}>
              {toRoleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>To MPID</label>
            <select value={filters.toMPID} onChange={(e) => handleFilterChange('toMPID', e.target.value)}>
              {toMPIDOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Row 3 */}
          <div className="filter-field">
            <label>Receiving App</label>
            <select value={filters.receivingApp} onChange={(e) => handleFilterChange('receivingApp', e.target.value)}>
              {recAppOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Event Timestamp From</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <small style={{ display: 'block', marginBottom: '4px', color: '#6B7280', fontSize: '12px' }}>Date</small>
                <input 
                  type="date" 
                  value={filters.eventTimestampFrom.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = filters.eventTimestampFrom.split('T')[1] || '00:00';
                    handleFilterChange('eventTimestampFrom', e.target.value ? `${e.target.value}T${time}` : '');
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <small style={{ display: 'block', marginBottom: '4px', color: '#6B7280', fontSize: '12px' }}>Time</small>
                <input 
                  type="time" 
                  value={filters.eventTimestampFrom.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = filters.eventTimestampFrom.split('T')[0] || new Date().toISOString().split('T')[0];
                    handleFilterChange('eventTimestampFrom', `${date}T${e.target.value}`);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="filter-field">
            <label>Event Timestamp To</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <small style={{ display: 'block', marginBottom: '4px', color: '#6B7280', fontSize: '12px' }}>Date</small>
                <input 
                  type="date" 
                  value={filters.eventTimestampTo.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = filters.eventTimestampTo.split('T')[1] || '23:59';
                    handleFilterChange('eventTimestampTo', e.target.value ? `${e.target.value}T${time}` : '');
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <small style={{ display: 'block', marginBottom: '4px', color: '#6B7280', fontSize: '12px' }}>Time</small>
                <input 
                  type="time" 
                  value={filters.eventTimestampTo.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = filters.eventTimestampTo.split('T')[0] || new Date().toISOString().split('T')[0];
                    handleFilterChange('eventTimestampTo', `${date}T${e.target.value}`);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="filter-field">
            <label>File Creation Date (yyyymmdd or yyyy or mmdd)</label>
            <input 
              type="text" 
              value={filters.fileCreationDate}
              onChange={(e) => handleFilterChange('fileCreationDate', e.target.value)}
              placeholder="yyyymmdd"
            />
          </div>

          {/* Row 4 */}
          <div className="filter-field">
            <label>File ID</label>
            <input 
              type="text" 
              value={filters.fileId}
              onChange={(e) => handleFilterChange('fileId', e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label>Msg ID</label>
            <input 
              type="text" 
              value={filters.msgId}
              onChange={(e) => handleFilterChange('msgId', e.target.value)}
            />
          </div>
          <div className="filter-field filter-field-large">
            <label>Search File Contents For (e.g. MPAN Number)</label>
            <input 
              type="text" 
              value={filters.searchFileContents}
              onChange={(e) => handleFilterChange('searchFileContents', e.target.value)}
            />
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
            <DtcAuditTable data={filteredResults} />
          </motion.div>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <DataTable 
          data={flattenedAuditData} 
          columns={columns}
          onDownload={(row) => exportToCSV([row], columns, `dtc_audit_${row.id}`)}
        />
      </motion.div>
    </motion.div>
  );
};

export default DtcAudit;
