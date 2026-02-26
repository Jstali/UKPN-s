import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import DataTable from '../components/DataTable';
import AnimatedCounter from '../components/AnimatedCounter';
import DtcFilterDropdown from '../components/DtcFilterDropdown';
import auditData from '../data/Audit_Data_Dumy';
import { exportToCSV } from '../utils/exportUtils';
import ColorBar, { FLOW_COLORS, APP_COLORS } from '../components/ColorBar';
import {
  DEFAULT_FILTERS,
  FILTERED_COLUMNS,
  DEFAULT_COLUMNS_BUSINESS,
  DEFAULT_COLUMNS_FULL
} from '../data/dashboardConfig';

// Parse header string: ZHV|D0132001|X|%|R|EELC|%|TR01
const parseHeader = (headerStr) => {
  if (!headerStr || headerStr === 'UNKNOWN') {
    return { flowVersion: '', fileId: '', fromRole: '', fromMPID: '', toRole: '', toMPID: '', recApp: '' };
  }
  const parts = headerStr.split('|');
  return {
    flowVersion: parts[1] || '',
    fromRole: parts[2] || '',
    fromMPID: parts[5] || '',
    toRole: parts[4] || '',
    toMPID: parts[3] || '',
    recApp: parts[6] || '',
  };
};

// Flatten audit data to create one row per event
const flattenAuditEvents = (data) => {
  const flatData = [];
  data.forEach(item => {
    const parsed = parseHeader(item.Header_String);
    if (item.events && item.events.length > 0) {
      item.events.forEach(event => {
        flatData.push({
          ...item,
          flowVersion: parsed.flowVersion || 'UNKNOWN',
          fileId: item.File_ID || '',
          fromRole: parsed.fromRole,
          fromMPID: parsed.fromMPID,
          toRole: parsed.toRole,
          toMPID: parsed.toMPID,
          recApp: parsed.recApp,
          fileName: item.Source_FileName,
          application: event.applicationName || event.Destination_Application || 'Unknown',
          eventType: event.Event_Type || 'Unknown',
          status: event.Status || 'Unknown',
          processed: event.processed || 'false',
          timestamp: event.timestamp || '',
          eventId: event.id || '',
          destinationPath: event.Destination_Path || '',
          destinationFileName: event.Destination_fileName || '',
        });
      });
    }
  });
  return flatData;
};

// Build filtered results with parsed header fields
const buildFilteredResults = (data, filtersToUse) => {
  let results = [];
  data.forEach(item => {
    const parsed = parseHeader(item.Header_String);
    if (item.events && item.events.length > 0) {
      item.events.forEach(event => {
        const ts = event.timestamp ? new Date(event.timestamp) : null;
        const formatDate = (d) => d ? d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        results.push({
          flowVersion: parsed.flowVersion,
          fileId: item.File_ID,
          fromRole: parsed.fromRole,
          fromMPID: parsed.fromMPID,
          toRole: parsed.toRole,
          toMPID: parsed.toMPID,
          created: formatDate(ts),
          recApp: parsed.recApp,
          fileName: item.Source_FileName,
          eventType: event.Event_Type || 'Unknown',
          application: event.applicationName || event.Destination_Application || 'Unknown',
          timestamp: formatDate(ts),
          status: event.Status || 'Unknown',
          id: item.id,
          sourcePath: item.Source_Path,
          headerString: item.Header_String,
          destinationPath: event.Destination_Path || '',
          destinationFileName: event.Destination_fileName || '',
          _rid: item._rid,
          _ts: item._ts,
        });
      });
    }
  });

  const filterMap = {
    application: 'application',
    eventType: 'eventType',
    flow: 'flowVersion',
    version: 'flowVersion',
    fromRole: 'fromRole',
    fromMPID: 'fromMPID',
    toRole: 'toRole',
    toMPID: 'toMPID',
    receivingApp: 'recApp',
  };

  Object.entries(filterMap).forEach(([filterKey, dataKey]) => {
    if (filtersToUse[filterKey] !== 'All') {
      results = results.filter(item => item[dataKey] === filtersToUse[filterKey]);
    }
  });

  if (filtersToUse.fileId) {
    results = results.filter(item => item.fileId && item.fileId.includes(filtersToUse.fileId));
  }
  if (filtersToUse.msgId) {
    results = results.filter(item => item.msgId && item.msgId.includes(filtersToUse.msgId));
  }

  return results;
};

// Selection criteria display config
const CRITERIA_FIELDS = [
  { label: 'Application', key: 'application' },
  { label: 'Event Type', key: 'eventType' },
  { label: 'Flow', key: 'flow' },
  { label: 'Version', key: 'version' },
  { label: 'From Role', key: 'fromRole' },
  { label: 'From MPID', key: 'fromMPID' },
  { label: 'To Role', key: 'toRole' },
  { label: 'To MPID', key: 'toMPID' },
  { label: 'Receiving App', key: 'receivingApp' },
  { label: 'Event Timestamp From', key: 'eventTimestampFrom' },
  { label: 'Event Timestamp To', key: 'eventTimestampTo' },
  { label: 'Created Date', key: 'fileCreationDate' },
  { label: 'File ID', key: 'fileId' },
  { label: 'Msg ID', key: 'msgId' },
  { label: 'Search File Contents', key: 'searchFileContents' },
];

const DtcAudit = ({ user }) => {
  const location = useLocation();

  const [hasQueried, setHasQueried] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [filters, setFilters] = useState(location.state?.filters || { ...DEFAULT_FILTERS });
  const [exceptionCount, setExceptionCount] = useState(0);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setHasQueried(false);
    setFilteredResults([]);
    setAppliedFilters(null);
    setExceptionCount(0);
  };

  const handleQuery = (filterData) => {
    const filtersToUse = filterData || filters;
    if (!filtersToUse) return;
    const results = buildFilteredResults(auditData, filtersToUse);
    setFilteredResults(results);
    setAppliedFilters({ ...filtersToUse });
    setExceptionCount(0);
    setHasQueried(true);
    setShowFilters(false);
  };

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

  const flattenedAuditData = useMemo(() => flattenAuditEvents(auditData), []);
  const isBusiness = user?.role === 'Business';
  const defaultColumns = isBusiness ? DEFAULT_COLUMNS_BUSINESS : DEFAULT_COLUMNS_FULL;
  const columns = hasQueried ? FILTERED_COLUMNS : defaultColumns;

  const tableData = hasQueried ? filteredResults : flattenedAuditData;

  const flowCounts = useMemo(() => {
    const counts = {};
    tableData.forEach(row => {
      const flow = row.flowVersion || 'UNKNOWN';
      counts[flow] = (counts[flow] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tableData]);

  const appCounts = useMemo(() => {
    const counts = {};
    tableData.forEach(row => {
      const app = row.application || 'Unknown';
      counts[app] = (counts[app] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tableData]);

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
          background: '#dbeafe', border: '1px solid #93c5fd', padding: '8px 14px',
          borderRadius: '8px', marginBottom: '10px', color: '#1e40af', fontSize: '13px'
        }}>
          <strong>Business View:</strong> Showing flow details only
        </div>
      )}

      {/* Title + Filter Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h1 className="page-title" style={{ margin: 0, paddingBottom: '0.5rem', fontSize: '1.6rem' }}>DTC Audit</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasQueried && (
            <button onClick={handleReset} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', background: '#f1f5f9', color: '#475569',
              border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s ease'
            }}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 18px', background: showFilters ? '#4f46e5' : '#667eea',
              color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s ease'
            }}
          >
            <Filter size={16} /> Filters
            <ChevronDown size={14} style={{
              transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards" style={{ gap: '1rem', marginBottom: '1rem' }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="summary-card" style={{ padding: '1rem' }}>
          <div className="summary-icon" style={{ background: '#f5f3ff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={`${process.env.PUBLIC_URL}/Total files.png`} alt="Total Events" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <div className="summary-content">
            <h3 style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Total Events</h3>
            <p style={{ fontSize: '1.5rem' }}><AnimatedCounter value={flattenedAuditData.length} /></p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="summary-card" style={{ padding: '1rem' }}>
          <div className="summary-icon" style={{ background: '#f0f9ff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={`${process.env.PUBLIC_URL}/unique flows.jpg`} alt="Unique Flows" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <div className="summary-content">
            <h3 style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Unique Flows</h3>
            <p style={{ fontSize: '1.5rem' }}><AnimatedCounter value={0} /></p>
          </div>
        </motion.div>
      </div>

      {/* Inline Filter Section — between cards and table */}
      <AnimatePresence>
        {showFilters && (
          <div style={{ marginBottom: '16px' }}>
            <DtcFilterDropdown
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              onApply={() => handleQuery()}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Selection Criteria Summary — shown after Apply Filter */}
      {hasQueried && appliedFilters && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
            marginBottom: '16px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)'
          }}
        >
          <div style={{
            padding: '14px 24px', borderBottom: '1px solid #f1f5f9',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Your Selection Criteria is</h3>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px 24px', padding: '16px 24px'
          }}>
            {CRITERIA_FIELDS.map(({ label, key }) => (
              <div key={key} style={{ fontSize: '13px', color: '#475569', padding: '4px 0' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{label}:</span>{' '}
                {appliedFilters[key] || 'All'}
              </div>
            ))}
          </div>

          <div style={{
            padding: '12px 24px', borderTop: '1px solid #f1f5f9',
            textAlign: 'center', fontSize: '14px', color: '#475569'
          }}>
            There have been <span style={{ fontWeight: 700, color: '#ef4444' }}>{exceptionCount} DTC exception messages</span> since N/A relating to your applications
          </div>
        </motion.div>
      )}

      {/* Color Bars */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
          padding: '18px 24px', marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)',
        }}
      >
        {flowCounts.length > 0 && (
          <ColorBar data={flowCounts} label="Flows" colors={FLOW_COLORS} />
        )}
        {appCounts.length > 0 && (
          <ColorBar data={appCounts} label="Applications" colors={APP_COLORS} />
        )}
      </motion.div>

      {/* Data Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <DataTable
          data={hasQueried ? filteredResults : flattenedAuditData}
          columns={columns}
          onDownload={(row) => exportToCSV([row], columns, `dtc_audit_${row.id}`)}
          exportConfig={{ filename: 'dtc_audit_report' }}
        />
      </motion.div>
    </motion.div>
  );
};

export default DtcAudit;
