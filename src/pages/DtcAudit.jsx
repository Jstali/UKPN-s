import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Filter, RotateCcw, ChevronDown, ChevronRight, BarChart3, Activity } from 'lucide-react';
import DataTable from '../components/DataTable';
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

  const [showApps, setShowApps] = useState(false);

  const uniqueFlowCount = useMemo(() => {
    const flows = new Set(tableData.map(r => r.flowVersion).filter(Boolean));
    return flows.size;
  }, [tableData]);

  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Compact Header: Breadcrumb + Title + KPIs + Actions — all in one row */}
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <div className="dtc-breadcrumb-inline">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>DTC Audit</span>
          </div>
        </div>

        {/* Inline KPI chips */}
        <div className="dtc-kpi-row">
          <div className="dtc-kpi-chip">
            <BarChart3 size={14} color="#6366f1" />
            <span className="dtc-kpi-label">Events</span>
            <span className="dtc-kpi-value">{flattenedAuditData.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip">
            <Activity size={14} color="#0ea5e9" />
            <span className="dtc-kpi-label">Flows</span>
            <span className="dtc-kpi-value">{uniqueFlowCount}</span>
          </div>
          {hasQueried && (
            <div className="dtc-kpi-chip dtc-kpi-results">
              <span className="dtc-kpi-label">Results</span>
              <span className="dtc-kpi-value">{filteredResults.length.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="dtc-header-actions">
          {isBusiness && (
            <span className="dtc-business-badge">Business View</span>
          )}
          <button
            className={`dtc-apps-toggle ${showApps ? 'active' : ''}`}
            onClick={() => setShowApps(!showApps)}
          >
            Charts
            <ChevronDown size={12} style={{
              transform: showApps ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
          {hasQueried && (
            <button onClick={handleReset} className="dtc-reset-btn">
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`dtc-filter-btn ${showFilters ? 'active' : ''}`}
          >
            <Filter size={14} /> Filters
            <ChevronDown size={12} style={{
              transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {/* Collapsible Applications bar */}
      <AnimatePresence>
        {showApps && appCounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="dtc-apps-bar"
          >
            <ColorBar data={appCounts} label="Applications" colors={APP_COLORS} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Filter Section */}
      <AnimatePresence>
        {showFilters && (
          <div style={{ marginBottom: '8px' }}>
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
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px',
            marginBottom: '12px', overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{
            padding: '10px 20px', borderBottom: '1px solid #f1f5f9',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Your Selection Criteria is</h3>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px 20px', padding: '12px 20px'
          }}>
            {CRITERIA_FIELDS.map(({ label, key }) => (
              <div key={key} style={{ fontSize: '13px', color: '#475569', padding: '3px 0' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{label}:</span>{' '}
                {appliedFilters[key] || 'All'}
              </div>
            ))}
          </div>

          <div style={{
            padding: '10px 20px', borderTop: '1px solid #f1f5f9',
            textAlign: 'center', fontSize: '13px', color: '#475569'
          }}>
            There have been <span style={{ fontWeight: 700, color: '#ef4444' }}>{exceptionCount} DTC exception messages</span> since N/A relating to your applications
          </div>
        </motion.div>
      )}

      {/* Data Table — flush, no extra wrapper */}
      <DataTable
        data={hasQueried ? filteredResults : flattenedAuditData}
        columns={columns}
        compactColumns={[
          { key: 'recApp', label: 'Source App' },
          { key: 'fileName', label: 'File Name' },
          { key: 'eventType', label: 'Event Type' },
          { key: 'status', label: 'Status' },
          { key: 'application', label: 'Dest App' },
          { key: 'flowVersion', label: 'Flows' },
        ]}
        onDownload={(row) => exportToCSV([row], columns, `dtc_audit_${row.id}`)}
        exportConfig={{ filename: 'dtc_audit_report' }}
      />
    </motion.div>
  );
};

export default DtcAudit;
