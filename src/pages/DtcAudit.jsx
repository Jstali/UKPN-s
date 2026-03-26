import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Filter, RotateCcw, ChevronDown, ChevronRight, BarChart3, Activity, RefreshCw } from 'lucide-react';
import DataTable from '../components/DataTable';
import DtcFilterDropdown from '../components/DtcFilterDropdown';
import api from '../utils/api';
import ColorBar, { FLOW_COLORS, APP_COLORS } from '../components/ColorBar';
import {
  DEFAULT_FILTERS,
  FILTERED_COLUMNS,
  DEFAULT_COLUMNS_BUSINESS,
  DEFAULT_COLUMNS_FULL
} from '../data/dashboardConfig';
import { parseHeader, formatDateTime, formatFlowVersion, formatFromRoleMPID, formatToRoleMPID } from '../utils/auditUtils';
import { useApp } from '../context/AppContext';

// Event Type mapping
const EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed'
};

// Flatten audit data to create one row per event
const flattenAuditEvents = (data) => {
  const flatData = [];
  data.forEach(item => {
    const parsed = parseHeader(item.Header_String);
    if (item.events && item.events.length > 0) {
      // Get source application from first event
      const sourceApplication = item.events[0]?.applicationName || 'Unknown';
      
      // Reverse events array to show Event Type 4 → 1 (descending order)
      const reversedEvents = [...item.events].reverse();
      
      reversedEvents.forEach(event => {
        flatData.push({
          ...item,
          id: item.id,
          flowVersion: formatFlowVersion(parsed.flowVersion) || 'UNKNOWN',
          fileId: item.File_ID || '',
          fromRoleMPID: formatFromRoleMPID(parsed.fromRole, parsed.fromMPID),
          toRoleMPID: formatToRoleMPID(parsed.toRole, parsed.toMPID),
          fromRole: parsed.fromRole,
          fromMPID: parsed.fromMPID,
          toRole: parsed.toRole,
          toMPID: parsed.toMPID,
          recApp: parsed.recApp,
          fileName: item.Source_FileName,
          sourceApplication: sourceApplication,
          application: event.applicationName || event.Destination_Application || 'Unknown',
          eventType: event.Status === 'Failed' ? 'Failed' : (EVENT_TYPE_MAP[event.Event_Type] || event.Event_Type || 'Unknown'),
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
      // Get source application from first event
      const sourceApplication = item.events[0]?.applicationName || 'Unknown';
      
      // Reverse events array to show Event Type 4 → 1 (descending order)
      const reversedEvents = [...item.events].reverse();
      
      reversedEvents.forEach(event => {
        const ts = event.timestamp ? new Date(event.timestamp) : null;
        results.push({
          ...item, // Include all original fields
          id: item.id,
          flowVersion: formatFlowVersion(parsed.flowVersion),
          fileId: item.File_ID,
          fromRoleMPID: formatFromRoleMPID(parsed.fromRole, parsed.fromMPID),
          toRoleMPID: formatToRoleMPID(parsed.toRole, parsed.toMPID),
          fromRole: parsed.fromRole,
          fromMPID: parsed.fromMPID,
          toRole: parsed.toRole,
          toMPID: parsed.toMPID,
          created: formatDateTime(event.timestamp),
          recApp: parsed.recApp,
          fileName: item.Source_FileName,
          sourceApplication: sourceApplication,
          eventType: event.Status === 'Failed' ? 'Failed' : (EVENT_TYPE_MAP[event.Event_Type] || event.Event_Type || 'Unknown'),
          application: event.applicationName || event.Destination_Application || 'Unknown',
          timestamp: event.timestamp || '',
          status: event.Status || 'Unknown',
          eventId: event.id || '',
          destinationPath: event.Destination_Path || '',
          destinationFileName: event.Destination_fileName || '',
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

  // Handle multi-select for source and destination applications
  if (filtersToUse.sourceApplication && filtersToUse.sourceApplication !== 'All') {
    const selectedApps = filtersToUse.sourceApplication.split(',');
    results = results.filter(item => selectedApps.includes(item.sourceApplication));
  }

  if (filtersToUse.destinationApplication && filtersToUse.destinationApplication !== 'All') {
    const selectedApps = filtersToUse.destinationApplication.split(',');
    results = results.filter(item => selectedApps.includes(item.application));
  }

  // Handle other filters (support comma-separated multi-select values)
  Object.entries(filterMap).forEach(([filterKey, dataKey]) => {
    if (filtersToUse[filterKey] && filtersToUse[filterKey] !== 'All') {
      const selectedValues = filtersToUse[filterKey].split(',');
      results = results.filter(item => selectedValues.includes(item[dataKey]));
    }
  });

  if (filtersToUse.fileId) {
    results = results.filter(item => item.fileId && item.fileId.includes(filtersToUse.fileId));
  }
  if (filtersToUse.msgId) {
    results = results.filter(item => item.eventId && item.eventId.includes(filtersToUse.msgId));
  }

  // Timestamp filtering
  if (filtersToUse.eventTimestampFrom) {
    const from = new Date(filtersToUse.eventTimestampFrom);
    results = results.filter(item => {
      const ts = item.timestamp ? new Date(item.timestamp) : null;
      return ts && ts >= from;
    });
  }
  if (filtersToUse.eventTimestampTo) {
    const to = new Date(filtersToUse.eventTimestampTo);
    results = results.filter(item => {
      const ts = item.timestamp ? new Date(item.timestamp) : null;
      return ts && ts <= to;
    });
  }
  if (filtersToUse.fileCreationDate) {
    results = results.filter(item => {
      const ts = item.timestamp ? new Date(item.timestamp) : null;
      if (!ts) return false;
      const dateStr = ts.toISOString().split('T')[0];
      return dateStr === filtersToUse.fileCreationDate;
    });
  }

  return results;
};

// Selection criteria display config - Reordered to match filter order
const CRITERIA_FIELDS = [
  { label: 'Flow', key: 'flow' },
  { label: 'Version', key: 'version' },
  { label: 'From Role', key: 'fromRole' },
  { label: 'From MPID', key: 'fromMPID' },
  { label: 'To Role', key: 'toRole' },
  { label: 'To MPID', key: 'toMPID' },
  { label: 'Source Application', key: 'sourceApplication' },
  { label: 'Destination Application', key: 'destinationApplication' },
  { label: 'Event Type', key: 'eventType' },
  { label: 'Receiving App', key: 'receivingApp' },
  { label: 'Event Timestamp From', key: 'eventTimestampFrom' },
  { label: 'Event Timestamp To', key: 'eventTimestampTo' },
  { label: 'File Creation Date', key: 'fileCreationDate' },
  { label: 'File ID', key: 'fileId' },
  { label: 'Message ID', key: 'msgId' },
];

const DtcAudit = () => {
  const { user, autoRefresh, setAutoRefresh, auditData: globalAuditData, loading: globalLoading, fetchAllData } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasQueried, setHasQueried] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [filters, setFilters] = useState(location.state?.filters || { ...DEFAULT_FILTERS });
  const [exceptionCount, setExceptionCount] = useState(0);
  
  // Pagination state
  const [totalCount, setTotalCount] = useState(0);

  // Use global data
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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

  const handleQuery = useCallback((filterData) => {
    const filtersToUse = filterData || filters;
    if (!filtersToUse) return;
    
    const results = buildFilteredResults(globalAuditData, filtersToUse);
    setFilteredResults(results);
    setAppliedFilters({ ...filtersToUse });
    setExceptionCount(0);
    setHasQueried(true);
    setShowFilters(false);
  }, [globalAuditData, filters]);

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
  }, [fetchAllData]);

  const flattenedAuditData = useMemo(() => {
    if (globalAuditData.length === 0) return [];
    return flattenAuditEvents(globalAuditData);
  }, [globalAuditData]);
  
  const isBusiness = user?.role === 'Business';
  const defaultColumns = isBusiness ? DEFAULT_COLUMNS_BUSINESS : DEFAULT_COLUMNS_FULL;
  const columns = hasQueried ? FILTERED_COLUMNS : defaultColumns;

  const tableData = hasQueried ? filteredResults : flattenedAuditData;

  const appCounts = useMemo(() => {
    if (tableData.length === 0) return [];
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
    if (tableData.length === 0) return 0;
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

        {/* Action buttons - moved to right */}
        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <BarChart3 size={13} color="#6366f1" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Events</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{flattenedAuditData.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <Activity size={13} color="#0ea5e9" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Flows</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{uniqueFlowCount}</span>
          </div>
          {hasQueried && (
            <div className="dtc-kpi-chip dtc-kpi-results" style={{ padding: '6px 12px', fontSize: '13px' }}>
              <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Results</span>
              <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{filteredResults.length.toLocaleString()}</span>
            </div>
          )}
          <button
            className={`dtc-apps-toggle ${showApps ? 'active' : ''}`}
            onClick={() => setShowApps(!showApps)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            Charts
            <ChevronDown size={11} style={{
              transform: showApps ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
          {hasQueried && (
            <button onClick={handleReset} className="dtc-reset-btn" style={{ padding: '6px 14px', fontSize: '13px' }}>
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`dtc-filter-btn ${showFilters ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            <Filter size={13} /> Filters
            <ChevronDown size={11} style={{
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
              auditData={auditData}
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
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px',
            marginBottom: '8px', overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid #f1f5f9',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Your Selection Criteria is</h3>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px 16px', padding: '10px 16px'
          }}>
            {CRITERIA_FIELDS.filter(({ key }) => {
              const value = appliedFilters[key];
              return value && value !== 'All' && value !== '';
            }).map(({ label, key }) => {
              let displayValue = appliedFilters[key];
              
              // Format timestamp fields
              if (key === 'eventTimestampFrom' || key === 'eventTimestampTo') {
                displayValue = displayValue.replace('T', ' ');
              }
              
              return (
                <div key={key} style={{ fontSize: '12px', color: '#475569', padding: '2px 0' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{label}:</span>{' '}
                  {displayValue}
                </div>
              );
            })}
          </div>

          <div style={{
            padding: '8px 16px', borderTop: '1px solid #f1f5f9',
            textAlign: 'center', fontSize: '12px', color: '#475569'
          }}>
            {filteredResults.length === 0 ? (
              <span>No DTC audit records found matching your criteria</span>
            ) : (
              <>Found <span style={{ fontWeight: 700, color: '#10b981' }}>{filteredResults.length}</span> DTC audit record{filteredResults.length !== 1 ? 's' : ''} matching your criteria</>
            )}
          </div>
        </motion.div>
      )}

      {/* Data Table — flush, no extra wrapper */}
      {globalLoading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px', flexDirection: 'column', gap: '14px',
          color: '#64748b', fontSize: '14px', fontWeight: 500,
        }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid #e2e8f0',
            borderTopColor: '#667eea', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading DTC audit data...
        </div>
      ) : (
        <DataTable
          data={hasQueried ? filteredResults : flattenedAuditData}
          columns={columns}
          compactColumns={[
            { key: 'flowVersion', label: 'Flow' },
            { key: 'fileId', label: 'File ID' },
            { key: 'timestamp', label: 'Event Timestamp' },
            { key: 'fromRoleMPID', label: 'From Role + From MPID' },
            { key: 'toRoleMPID', label: 'To Role + To MPID' },
            { key: 'sourceApplication', label: 'Source' },
            { key: 'application', label: 'Destination' },
            { key: 'status', label: 'Status' },
            { key: 'fileName', label: 'Source File Name' },
            { key: 'eventId', label: 'Message ID' },
          ]}
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          groupByKey="eventId"
          onDownload={true}
          exportConfig={{ filename: 'DTC_Audit_Export' }}
          onViewDetail={() => navigate('/dtc-audit-filter', { state: { filters } })}
        />
      )}
    </motion.div>
  );
};

export default DtcAudit;
