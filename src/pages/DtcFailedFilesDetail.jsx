import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Activity, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import DataTable from '../components/DataTable';
import DtcFilterDropdown from '../components/DtcFilterDropdown';
import ColorBar, { APP_COLORS } from '../components/ColorBar';
import { useApp } from '../context/AppContext';
import { parseHeader, formatFlowVersion, formatFromRoleMPID, formatToRoleMPID } from '../utils/auditUtils';
import { DEFAULT_FILTERS } from '../data/dashboardConfig';

const pickId = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';

const EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed'
};

const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase();

const normalizeVersion = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  return /^\d+$/.test(str) ? str.padStart(3, '0') : str;
};

const deriveFlowVersion = (item, parsedFlowVersion, event) => {
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

const isFailedStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'duplicate checksum') return false;
  return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
};

const flattenAuditEvents = (data) => {
  const flatData = [];
  data.forEach(item => {
    const parsed = parseHeader(item.Header_String);
    if (item.events && item.events.length > 0) {
      const sourceApplication = item.events[0]?.applicationName || 'Unknown';
      const reversedEvents = [...item.events].reverse();

      reversedEvents.forEach(event => {
        const rawFlowVersion = deriveFlowVersion(item, parsed.flowVersion, event);
        const formattedFlowVersion = formatFlowVersion(rawFlowVersion) || '-';
        const flowVersionParts = formattedFlowVersion.split(' ');

        flatData.push({
          ...item,
          id: item.id,
          flowVersion: formattedFlowVersion,
          flow: flowVersionParts[0] || '-',
          version: flowVersionParts[1] || '-',
          fileId: pickId(item.File_ID, item.fileId, item.file_id, item.correlationId, item.id),
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
      const sourceApplication = item.events[0]?.applicationName || 'Unknown';
      const reversedEvents = [...item.events].reverse();

      reversedEvents.forEach(event => {
        const rawFlowVersion = deriveFlowVersion(item, parsed.flowVersion);
        const resolvedFromRole = parsed.fromRole || item.From_Role || item.from_role || item.fromRole || event.fromRole || event.From_Role || '';
        const resolvedFromMPID = parsed.fromMPID || item.From_MPID || item.from_mpid || item.fromMPID || event.fromMPID || event.From_MPID || '';
        const resolvedToRole = parsed.toRole || item.To_Role || item.to_role || item.toRole || event.toRole || event.To_Role || '';
        const resolvedToMPID = parsed.toMPID || item.To_MPID || item.to_mpid || item.toMPID || event.toMPID || event.To_MPID || '';
        results.push({
          ...item,
          id: item.id,
          flowVersion: formatFlowVersion(rawFlowVersion) || '-',
          fileId: pickId(item.File_ID, item.fileId, item.file_id, item.correlationId, item.id),
          fromRoleMPID: formatFromRoleMPID(resolvedFromRole, resolvedFromMPID),
          toRoleMPID: formatToRoleMPID(resolvedToRole, resolvedToMPID),
          fromRole: resolvedFromRole,
          fromMPID: resolvedFromMPID,
          toRole: resolvedToRole,
          toMPID: resolvedToMPID,
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

// Selection criteria display config
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
  { label: 'Publish Date', key: 'publishDate' },
  { label: 'File ID', key: 'fileId' },
  { label: 'Message ID', key: 'msgId' },
];

const DtcFailedFilesDetail = () => {
  const navigate = useNavigate();
  const { user, auditData, loading, dataComplete, fetchError } = useApp();
  const [showApps, setShowApps] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [hasQueried, setHasQueried] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(null);

  const isBusiness = user?.role === 'Business';
  const splitRoleColumns = ['Testing Team', 'Core Support', 'Admin', 'Business'].includes(user?.role);

  // Memoize flattened data
  const flattenedData = useMemo(() => {
    if (auditData.length === 0) return [];
    return flattenAuditEvents(auditData);
  }, [auditData]);

  // Memoize failed records
  const failedRecords = useMemo(() => {
    return flattenedData.filter(row => isFailedStatus(row.status));
  }, [flattenedData]);

  // Apply filters
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setHasQueried(false);
    setFilteredResults([]);
    setAppliedFilters(null);
  };

  const handleQuery = () => {
    const results = buildFilteredResults(failedRecords, filters);
    setFilteredResults(results);
    setAppliedFilters({ ...filters });
    setHasQueried(true);
    setShowFilters(false);
  };

  const tableData = hasQueried ? filteredResults : failedRecords;

  const uniqueFlowCount = useMemo(() => {
    if (tableData.length === 0) return 0;
    const flows = new Set(tableData.map(r => r.flowVersion).filter(Boolean));
    return flows.size;
  }, [tableData]);

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

  // Define columns matching DTC Audit structure
  const columns = splitRoleColumns ? [
    { key: 'flow', label: 'Flow' },
    { key: 'version', label: 'Version' },
    { key: 'fileId', label: 'File ID' },
    { key: 'timestamp', label: 'Event Timestamp' },
    { key: 'fromRole', label: 'From Role' },
    { key: 'fromMPID', label: 'From MPID' },
    { key: 'toRole', label: 'To Role' },
    { key: 'toMPID', label: 'To MPID' },
    { key: 'sourceApplication', label: 'Source' },
    { key: 'application', label: 'Destination' },
    { key: 'status', label: 'Status' },
    { key: 'fileName', label: 'Source File Name' },
    { key: 'eventId', label: 'Message ID' },
  ] : [
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
  ];

  const compactColumns = splitRoleColumns ? [
    { key: 'flow', label: 'Flow' },
    { key: 'version', label: 'Version' },
    { key: 'fileId', label: 'File ID' },
    { key: 'timestamp', label: 'Event Timestamp' },
    { key: 'fromRole', label: 'From Role' },
    { key: 'fromMPID', label: 'From MPID' },
    { key: 'toRole', label: 'To Role' },
    { key: 'toMPID', label: 'To MPID' },
    { key: 'sourceApplication', label: 'Source' },
    { key: 'application', label: 'Destination' },
    { key: 'status', label: 'Status' },
    { key: 'fileName', label: 'Source File Name' },
    { key: 'eventId', label: 'Message ID' },
  ] : [
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
  ];

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
            onClick={() => navigate('/dtc-failed-files')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', background: '#667eea', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Back to Failed Files
          </button>
          <div className="dtc-breadcrumb-inline">
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>DTC Failed Files - Detail View</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <BarChart3 size={13} color="#dc2626" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Failed Events</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{tableData.length.toLocaleString()}</span>
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
              auditData={failedRecords}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              onApply={handleQuery}
            />
          </motion.div>
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
              <span>No failed files found matching your criteria</span>
            ) : (
              <>Found <span style={{ fontWeight: 700, color: '#10b981' }}>{filteredResults.length}</span> failed file{filteredResults.length !== 1 ? 's' : ''} matching your criteria</>
            )}
          </div>
        </motion.div>
      )}

      {/* Failed Files Info Banner */}
      {!hasQueried && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
            marginBottom: '8px', padding: '12px 20px',
            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.04)'
          }}
        >
          <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
            Showing <span style={{ fontWeight: 700 }}>{failedRecords.length}</span> failed file{failedRecords.length !== 1 ? 's' : ''}
          </div>
        </motion.div>
      )}

      {fetchError && (
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px',
          padding: '10px 16px', marginBottom: '8px', fontSize: '13px', color: '#856404'
        }}>
          ⚠️ {fetchError}
        </div>
      )}

      {/* Data Table */}
      {loading || !dataComplete ? (
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
          Loading failed files data...
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          compactColumns={compactColumns}
          detailPagePath="/dtc-failed-files-detail"
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          groupByKey="eventId"
          onDownload={true}
          exportConfig={{ filename: 'DTC_Failed_Files_Detail_Export' }}
          hideViewDetail={true}
        />
      )}
    </motion.div>
  );
};

export default DtcFailedFilesDetail;
