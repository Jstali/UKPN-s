import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import DtcAuditTable from '../components/DtcAuditTable';
import DataTable from '../components/DataTable';
import AnimatedCounter from '../components/AnimatedCounter';
import auditData from '../data/Audit_Data_Dumy';
import { exportToCSV } from '../utils/exportUtils';

const DtcAudit = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [hasQueried, setHasQueried] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [filters, setFilters] = useState(location.state?.filters || null);

  // Handle incoming filters from filter page
  useEffect(() => {
    if (location.state?.filters) {
      setFilters(location.state.filters);
      handleQuery(location.state.filters);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const handleQuery = (filterData) => {
    const filtersToUse = filterData || filters;
    if (!filtersToUse) return;

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
    if (filtersToUse.application !== 'All') {
      results = results.filter(item => item.application === filtersToUse.application);
    }
    if (filtersToUse.eventType !== 'All') {
      results = results.filter(item => item.eventType === filtersToUse.eventType);
    }
    if (filtersToUse.flow !== 'All') {
      results = results.filter(item => item.flowVersion === filtersToUse.flow);
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
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'eventId', label: 'Event ID' },
    { key: 'destinationPath', label: 'Destination Path' },
    { key: 'destinationFileName', label: 'Destination File' },
    { key: 'Source_Path', label: 'Source Path' },
    { key: 'Header_String', label: 'Header String' }
  ];


  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → DTC Audit
      </div>
      {isBusiness && (
        <div style={{
          background: '#dbeafe',
          border: '1px solid #93c5fd',
          padding: '8px 14px',
          borderRadius: '8px',
          marginBottom: '10px',
          color: '#1e40af',
          fontSize: '13px'
        }}>
          <strong>Business View:</strong> Showing flow details only
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h1 className="page-title" style={{ margin: 0, paddingBottom: '0.5rem', fontSize: '1.6rem' }}>DTC Audit</h1>
        <button
          onClick={() => navigate('/dtc-audit-filter')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      <div className="summary-cards" style={{ gap: '1rem', marginBottom: '1rem' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="summary-card"
          style={{ padding: '1rem' }}
        >
          <div className="summary-icon" style={{
            background: '#f5f3ff',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img
              src={`${process.env.PUBLIC_URL}/download-removebg-preview.png`}
              alt="Total Events"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </div>
          <div className="summary-content">
            <h3 style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Total Events</h3>
            <p style={{ fontSize: '1.5rem' }}><AnimatedCounter value={flattenedAuditData.length} /></p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="summary-card"
          style={{ padding: '1rem' }}
        >
          <div className="summary-icon" style={{
            background: '#f0f9ff',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img
              src={`${process.env.PUBLIC_URL}/iteration-removebg-preview.png`}
              alt="Unique Flows"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </div>
          <div className="summary-content">
            <h3 style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Unique Flows</h3>
            <p style={{ fontSize: '1.5rem' }}><AnimatedCounter value={uniqueFlows} /></p>
          </div>
        </motion.div>
      </div>

      {hasQueried && filters && (
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
