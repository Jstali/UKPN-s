import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Filter, RotateCcw, ChevronDown, ChevronRight, BarChart3, Activity, RefreshCw, ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import DtcFilterDropdown from '../components/DtcFilterDropdown';
import api from '../utils/api';
import ColorBar, { FLOW_COLORS, APP_COLORS } from '../components/ColorBar';
import {
  DEFAULT_FILTERS,
  DEFAULT_COLUMNS_BUSINESS,
  DEFAULT_COLUMNS_FULL
} from '../data/dashboardConfig';
import { parseHeader, formatDateTime, formatFlowVersion } from '../utils/auditUtils';
import { useApp } from '../context/AppContext';
import {
  DTC_SUMMARY_COLUMNS_COMBINED_FLOW,
  DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION,
} from '../data/dtcSummaryColumns';

// Event Type mapping
const EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  '21': 'Invalid Flow',
  '22': 'File Transferred',
  '32': 'File Processed',
  'Failed': 'Failed'
};

const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase();

// Pick the first non-empty, non-"UNKNOWN" value from a list of candidates
const pickId = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';

const normalizeVersion = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  return /^\d+$/.test(str) ? str.padStart(3, '0') : str;
};

const deriveFlowVersion = (item, parsedFlowVersion) => {
  const direct =
    parsedFlowVersion ||
    item.Flow_Version ||
    item.flow_version ||
    item.flowVersion ||
    item.flow ||
    '';
  if (direct) return direct;

  const flowOnly = item.Flow || item.flow || '';
  const versionOnly = normalizeVersion(item.Version || item.version || '');
  if (flowOnly && versionOnly) return `${flowOnly} ${versionOnly}`;
  if (flowOnly) return flowOnly;

  return '';
};

const resolveProcessedValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === true || candidate === false) {
      return String(candidate);
    }
    if (candidate === null || candidate === undefined) {
      continue;
    }
    const normalized = String(candidate).trim();
    if (normalized && normalized.toLowerCase() !== 'unknown') {
      return normalized;
    }
  }
  return '';
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
        const rawFlowVersion = deriveFlowVersion(item, parsed.flowVersion);
        const formattedFlowVersion = formatFlowVersion(rawFlowVersion) || '-';
        const flowVersionParts = formattedFlowVersion.split(' ');
        const resolvedFromRole = parsed.fromRole || item.From_Role || item.from_role || item.fromRole || event.fromRole || event.From_Role || '';
        const resolvedFromMPID = parsed.fromMPID || item.From_MPID || item.from_mpid || item.fromMPID || event.fromMPID || event.From_MPID || '';
        const resolvedToRole = parsed.toRole || item.To_Role || item.to_role || item.toRole || event.toRole || event.To_Role || '';
        const resolvedToMPID = parsed.toMPID || item.To_MPID || item.to_mpid || item.toMPID || event.toMPID || event.To_MPID || '';
        
        const eventTypeValue = event.Status === 'Failed' ? 'Failed' : (EVENT_TYPE_MAP[event.Event_Type] || event.Event_Type || 'Unknown');
        const applicationValue = event.applicationName || event.Destination_Application || 'NA';
        
        flatData.push({
          ...item,
          id: item.id,
          flowVersion: formattedFlowVersion,
          flow: flowVersionParts[0] || '-',
          version: flowVersionParts[1] || '-',
          fileId: item.id || pickId(item.File_ID, item.fileId, item.file_id, item.correlationId),
          fromRole: resolvedFromRole,
          fromMPID: resolvedFromMPID,
          toRole: resolvedToRole,
          toMPID: resolvedToMPID,
          recApp: parsed.recApp,
          fileName: item.Source_FileName,
          sourceApplication: sourceApplication,
          application: applicationValue,
          eventType: eventTypeValue,
          status: event.Status || 'Unknown',
          processed: resolveProcessedValue(event.processed, event.Processed, item.processed, item.Processed),
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
        const rawFlowVersion = deriveFlowVersion(item, parsed.flowVersion);
        const formattedFlowVersion = formatFlowVersion(rawFlowVersion) || '-';
        const flowVersionParts = formattedFlowVersion.split(' ');
        const resolvedFromRole = parsed.fromRole || item.From_Role || item.from_role || item.fromRole || event.fromRole || event.From_Role || '';
        const resolvedFromMPID = parsed.fromMPID || item.From_MPID || item.from_mpid || item.fromMPID || event.fromMPID || event.From_MPID || '';
        const resolvedToRole = parsed.toRole || item.To_Role || item.to_role || item.toRole || event.toRole || event.To_Role || '';
        const resolvedToMPID = parsed.toMPID || item.To_MPID || item.to_mpid || item.toMPID || event.toMPID || event.To_MPID || '';
        
        const eventTypeValue = event.Status === 'Failed' ? 'Failed' : (EVENT_TYPE_MAP[event.Event_Type] || event.Event_Type || 'Unknown');
        const applicationValue = event.applicationName || event.Destination_Application || 'NA';
        
        results.push({
          ...item, // Include all original fields
          id: item.id,
          flowVersion: formattedFlowVersion,
          flow: flowVersionParts[0] || '-',
          version: flowVersionParts[1] || '-',
          fileId: item.id || pickId(item.File_ID, item.fileId, item.file_id, item.correlationId),
          fromRole: resolvedFromRole,
          fromMPID: resolvedFromMPID,
          toRole: resolvedToRole,
          toMPID: resolvedToMPID,
          created: formatDateTime(event.timestamp),
          recApp: parsed.recApp,
          fileName: item.Source_FileName,
          sourceApplication: sourceApplication,
          eventType: eventTypeValue,
          application: applicationValue,
          timestamp: event.timestamp || '',
          status: event.Status || 'Unknown',
          processed: resolveProcessedValue(event.processed, event.Processed, item.processed, item.Processed),
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
    flow: 'flow',
    version: 'version',
    fromRole: 'fromRole',
    fromMPID: 'fromMPID',
    toRole: 'toRole',
    toMPID: 'toMPID',
  };

  // Handle multi-select for source and destination applications
  if (filtersToUse.sourceApplication && filtersToUse.sourceApplication !== 'All') {
    const selectedApps = filtersToUse.sourceApplication
      .split(',')
      .map(normalizeFilterValue)
      .filter(Boolean);
    results = results.filter(item => selectedApps.includes(normalizeFilterValue(item.sourceApplication)));
  }

  if (filtersToUse.destinationApplication && filtersToUse.destinationApplication !== 'All') {
    const selectedApps = filtersToUse.destinationApplication
      .split(',')
      .map(normalizeFilterValue)
      .filter(Boolean);
    results = results.filter(item => selectedApps.includes(normalizeFilterValue(item.application)));
  }

  // Handle other filters (support comma-separated multi-select values)
  Object.entries(filterMap).forEach(([filterKey, dataKey]) => {
    if (filtersToUse[filterKey] && filtersToUse[filterKey] !== 'All') {
      const selectedValues = filtersToUse[filterKey]
        .split(',')
        .map(normalizeFilterValue)
        .filter(Boolean);
      results = results.filter(item => selectedValues.includes(normalizeFilterValue(item[dataKey])));
    }
  });

  if (filtersToUse.fileId && filtersToUse.fileId !== 'All') {
    const selectedValues = filtersToUse.fileId
      .split(',')
      .map(normalizeFilterValue)
      .filter(Boolean);
    results = results.filter(item => item.fileId && selectedValues.includes(normalizeFilterValue(item.fileId)));
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

  // Publish Date filtering (Event Type 3 - Published)
  if (filtersToUse.publishDate) {
    results = results.filter(item => {
      // Check if this event is a "Published" event (Event Type 3)
      if (item.eventType === 'Published') {
        const ts = item.timestamp ? new Date(item.timestamp) : null;
        if (!ts) return false;
        const dateStr = ts.toISOString().split('T')[0];
        return dateStr === filtersToUse.publishDate;
      }
      return false;
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
  { label: 'Event Timestamp From', key: 'eventTimestampFrom' },
  { label: 'Event Timestamp To', key: 'eventTimestampTo' },
  { label: 'File Creation Date', key: 'fileCreationDate' },
  { label: 'Publish Date', key: 'publishDate' },
  { label: 'File ID', key: 'fileId' },
  { label: 'Message ID', key: 'msgId' },
];

const DtcAudit = () => {
  const { user, autoRefresh, setAutoRefresh, auditData: globalAuditData, loading: globalLoading, subscriptionData } = useApp();
  const subscriptionAppNames = useMemo(
    () => [...new Set((subscriptionData || []).map(app => app.Application || app.application || app.filterId || app.id).filter(Boolean))].sort(),
    [subscriptionData]
  );
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

  // Data fetching handled by AppContext

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setHasQueried(false);
    setFilteredResults([]);
    setAppliedFilters(null);
    setExceptionCount(0);
    
    // Clear saved filter state
    sessionStorage.removeItem('dtcAuditFilters');
    sessionStorage.removeItem('dtcAuditHasQueried');
  };

  const handleQuery = useCallback((filterData) => {
    const filtersToUse = filterData || filters;
    if (!filtersToUse) return;

    if (filtersToUse.eventTimestampFrom && filtersToUse.eventTimestampTo) {
      const fromDate = new Date(filtersToUse.eventTimestampFrom);
      const toDate = new Date(filtersToUse.eventTimestampTo);
      if (fromDate > toDate) {
        alert('Event From date cannot be later than Event To date');
        return;
      }
    }
    
    const results = buildFilteredResults(globalAuditData, filtersToUse);
    setFilteredResults(results);
    setAppliedFilters({ ...filtersToUse });
    setExceptionCount(0);
    setHasQueried(true);
    setShowFilters(false);
    
    // Save filter state to sessionStorage
    sessionStorage.setItem('dtcAuditFilters', JSON.stringify(filtersToUse));
    sessionStorage.setItem('dtcAuditHasQueried', 'true');
  }, [globalAuditData, filters]);

  // Handle incoming filters from filter page
  useEffect(() => {
    if (location.state?.filters) {
      setFilters(location.state.filters);
      handleQuery(location.state.filters);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Restore filter state and scroll position when returning from details page
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('dtcAuditFilters');
    const savedHasQueried = sessionStorage.getItem('dtcAuditHasQueried');
    const savedScrollPos = sessionStorage.getItem('dtcAuditScrollPos');
    
    if (savedFilters && savedHasQueried === 'true' && !location.state?.filters) {
      const parsedFilters = JSON.parse(savedFilters);
      setFilters(parsedFilters);
      
      // Wait for data to load before applying filters
      if (globalAuditData.length > 0) {
        const results = buildFilteredResults(globalAuditData, parsedFilters);
        setFilteredResults(results);
        setAppliedFilters({ ...parsedFilters });
        setHasQueried(true);
      }
    }
    
    if (savedScrollPos) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos));
        sessionStorage.removeItem('dtcAuditScrollPos');
      }, 100);
    }
  }, [globalAuditData, location.state]);

  const flattenedAuditData = useMemo(() => {
    if (globalAuditData.length === 0) return [];
    return flattenAuditEvents(globalAuditData);
  }, [globalAuditData]);
  
  const isBusiness = user?.role === 'Business';
  const defaultColumns = isBusiness ? DEFAULT_COLUMNS_BUSINESS : DEFAULT_COLUMNS_FULL;
  const filteredColumns = isBusiness ? DTC_SUMMARY_COLUMNS_COMBINED_FLOW : DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION;
  const columns = hasQueried ? filteredColumns : defaultColumns;
  const compactColumns = columns;
  const exportColumns = columns;

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

  const appliedCriteria = useMemo(() => {
    if (!appliedFilters) return [];

    return CRITERIA_FIELDS.filter(({ key }) => {
      const value = appliedFilters[key];
      return value && value !== 'All' && value !== '';
    });
  }, [appliedFilters]);

  const uniqueFlowCount = useMemo(() => {
    if (tableData.length === 0) return 0;
    const flows = new Set(tableData.map(r => r.flow).filter(Boolean));
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
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', background: '#667eea', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div className="dtc-breadcrumb-inline">
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ marginBottom: '8px', overflow: 'hidden' }}
          >
            <DtcFilterDropdown
              filters={filters}
              auditData={globalAuditData}
              subscriptionAppNames={subscriptionAppNames}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              onApply={() => handleQuery()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Criteria Summary — shown after Apply Filter */}
      {hasQueried && appliedCriteria.length > 0 && (
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
            {appliedCriteria.map(({ label, key }) => {
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
          tableId="dtc_audit"
          data={hasQueried ? filteredResults : flattenedAuditData}
          columns={columns}
          exportColumns={exportColumns}
          compactColumns={compactColumns}
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          groupByKey="eventId"
          onDownload={true}
          exportConfig={{
            filename: 'DTC_Audit_Export',
            pdfOptions: {
              orientation: 'landscape',
              pageFormat: 'a4',
              fontSize: 6,
              overflow: 'linebreak',
              horizontalPageBreak: true,
              horizontalPageBreakRepeat: [0, 1, 2],
              minCellWidth: 12,
              cellPadding: 2,
            },
          }}
          onViewDetail={() => navigate('/dtc-audit-filter', { state: { filters: appliedFilters || filters } })}
        />
      )}
    </motion.div>
  );
};

export default DtcAudit;
