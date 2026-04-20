import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { EVENT_TYPE_COLORS } from '../components/ColorBar';
import MultiCheckboxDropdown from '../components/MultiCheckboxDropdown';
import AuditPageHeader from '../components/common/AuditPageHeader';
import CollapsibleSection from '../components/common/CollapsibleSection';
import SelectionCriteria from '../components/common/SelectionCriteria';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { DEFAULT_COLUMNS_FULL } from '../data/dashboardConfig';
import { flattenNonDtcAuditData } from '../utils/flattenUtils';
import { validateDateRange, combineDateTime } from '../utils/dateUtils';

// Strip DTC-specific columns that don't apply to Non-DTC
const BASE_COLUMNS = DEFAULT_COLUMNS_FULL.filter(
  ({ key }) => !['flow', 'version', 'fromRole', 'fromMPID', 'toRole', 'toMPID'].includes(key)
);

const NON_DTC_COLUMNS = [
  ...BASE_COLUMNS.slice(0, -1),
  { key: 'fileType',        label: 'File Type',        width: 72  },
  BASE_COLUMNS[BASE_COLUMNS.length - 1],
  { key: 'sourcePath',      label: 'Source Path',       width: 130 },
  { key: 'destinationPath', label: 'Destination Path',  width: 130 },
];

const COMPACT_COLUMNS = [
  { key: 'flow',              label: 'Flow',             width: 92  },
  { key: 'fileId',            label: 'File ID',          width: 120 },
  { key: 'timestamp',         label: 'Timestamp',        width: 120 },
  { key: 'sourceApplication', label: 'Source',           width: 86  },
  { key: 'application',       label: 'Destination',      width: 94  },
  { key: 'sourcePath',        label: 'Source Path',      width: 130 },
  { key: 'destinationPath',   label: 'Destination Path', width: 130 },
  { key: 'status',            label: 'Status',           width: 80  },
  { key: 'fileName',          label: 'Source File Name', width: 140 },
];

// Fields shown in the "Your Selection Criteria" summary panel
const CRITERIA_FIELDS = [
  { label: 'Flow',                   key: 'flow' },
  { label: 'Source Application',     key: 'sourceApp' },
  { label: 'Destination Application',key: 'destinationApp' },
  { label: 'Event Type',             key: 'eventType' },
  { label: 'Event From Date',        key: 'eventFrom' },
  { label: 'Event From Time',        key: 'eventFromTime' },
  { label: 'Event To Date',          key: 'eventTo' },
  { label: 'Event To Time',          key: 'eventToTime' },
  { label: 'File Creation Date',     key: 'fileCreated' },
  { label: 'File Creation Time',     key: 'fileCreatedTime' },
  { label: 'Publish Date',           key: 'publishDate' },
  { label: 'File ID',                key: 'fileId' },
];

const DEFAULT_FILTERS = {
  flow: 'All', sourceApp: 'All', destinationApp: 'All', eventType: 'All',
  eventFrom: '', eventFromTime: '', eventTo: '', eventToTime: '',
  fileCreated: '', fileCreatedTime: '', publishDate: '', fileId: 'All',
};

// Returns true when selectedValue is 'All'/empty or matches actualValue.
const matchesMultiSelect = (selectedValue, actualValue) => {
  if (!selectedValue || selectedValue === 'All') return true;
  return selectedValue.split(',').map(v => v.trim()).filter(Boolean).includes(actualValue);
};

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0',
  borderRadius: '8px', fontSize: '13px', background: '#fff', cursor: 'pointer',
};
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b',
  marginBottom: '4px', textTransform: 'uppercase',
};

const NonDtcAudit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { nonDtcAuditData, loading, dataComplete, nonDtcFetchError } = useApp();

  const [filters,        setFilters]        = useState(location.state?.filters        || DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(location.state?.appliedFilters || DEFAULT_FILTERS);
  const [hasQueried,     setHasQueried]     = useState(location.state?.hasQueried     || false);
  const [showCharts,     setShowCharts]     = useState(location.state?.showBars       || false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [dateError,      setDateError]      = useState('');

  const auditData = useMemo(() => flattenNonDtcAuditData(nonDtcAuditData || []), [nonDtcAuditData]);

  // Apply currently set filters to the flat audit data
  const filteredData = useMemo(() => {
    let result = [...auditData];
    result = result.filter(r => matchesMultiSelect(appliedFilters.flow,           r.flow));
    result = result.filter(r => matchesMultiSelect(appliedFilters.sourceApp,      r.sourceApp));
    result = result.filter(r => matchesMultiSelect(appliedFilters.destinationApp, r.application));
    result = result.filter(r => matchesMultiSelect(appliedFilters.eventType,      r.eventType));
    result = result.filter(r => matchesMultiSelect(appliedFilters.fileId,         r.fileId));
    return result;
  }, [auditData, appliedFilters]);

  // Unique values for each dropdown, derived from the full (unfiltered) dataset
  const filterOptions = useMemo(() => ({
    flow:           [...new Set(auditData.map(r => r.flow).filter(Boolean))].sort(),
    sourceApp:      [...new Set(auditData.map(r => r.sourceApp).filter(Boolean))].sort(),
    destinationApp: [...new Set(auditData.map(r => r.application).filter(Boolean))].sort(),
    eventType:      [...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort(),
    fileId:         [...new Set(auditData.map(r => r.fileId).filter(Boolean))].sort(),
  }), [auditData]);

  // Event type distribution for the Charts bar
  const eventTypeCounts = useMemo(() => {
    const counts = {};
    filteredData.forEach(({ eventType }) => {
      const et = eventType || 'Unknown';
      counts[et] = (counts[et] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const uniqueFlows = useMemo(
    () => new Set(filteredData.map(r => r.sourceApp).filter(Boolean)).size,
    [filteredData]
  );

  // Validates date fields using shared dateUtils
  const runDateValidation = useCallback((f = filters) => {
    const from = combineDateTime(f.eventFrom, f.eventFromTime);
    const to   = combineDateTime(f.eventTo,   f.eventToTime, '23:59:59');
    const { valid, error } = validateDateRange(from, to, 'Event');
    setDateError(valid ? '' : error);
    return valid;
  }, [filters]);

  const handleFilterChange = (field, value) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
    runDateValidation(updated);
  };

  const applyFilters = () => {
    if (!runDateValidation()) return;
    setAppliedFilters(filters);
    setHasQueried(true);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setHasQueried(false);
    setDateError('');
  };

  const isLoading = loading || (!dataComplete && nonDtcAuditData.length === 0 && !nonDtcFetchError);

  return (
    <motion.div
      className="page-container non-dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AuditPageHeader
        title="Non DTC Audit"
        totalEvents={auditData.length}
        uniqueCount={uniqueFlows}
        uniqueLabel="Flow"
        hasQueried={hasQueried}
        resultCount={filteredData.length}
        showCharts={showCharts}
        onToggleCharts={() => setShowCharts(v => !v)}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(v => !v)}
        onReset={resetFilters}
      />

      {/* Charts bar */}
      <CollapsibleSection isOpen={showCharts && eventTypeCounts.length > 0}>
        <div className="dtc-apps-bar">
          <ColorBar data={eventTypeCounts} label="Event Type" colors={EVENT_TYPE_COLORS} />
        </div>
      </CollapsibleSection>

      {/* Filter panel */}
      <CollapsibleSection isOpen={showFilters} style={{ marginBottom: '8px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '16px' }}>
            {/* Row 1: multi-select dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: 'Flow',                    field: 'flow',           options: filterOptions.flow },
                { label: 'Source Application',      field: 'sourceApp',      options: filterOptions.sourceApp },
                { label: 'Destination Application', field: 'destinationApp', options: filterOptions.destinationApp },
                { label: 'Event Type',              field: 'eventType',      options: filterOptions.eventType },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <MultiCheckboxDropdown
                    value={filters[field]}
                    onChange={value => handleFilterChange(field, value)}
                    options={options}
                  />
                </div>
              ))}
            </div>

            {/* Row 2: date/time inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr 0.8fr', gap: '12px' }}>
              {[
                { label: 'Event From',    dateField: 'eventFrom',    timeField: 'eventFromTime' },
                { label: 'Event To',      dateField: 'eventTo',      timeField: 'eventToTime' },
                { label: 'File Created',  dateField: 'fileCreated',  timeField: 'fileCreatedTime' },
              ].map(({ label, dateField, timeField }) => (
                <div key={dateField}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="date" value={filters[dateField]}
                      onChange={e => handleFilterChange(dateField, e.target.value)}
                      style={{ ...inputStyle, flex: 1, padding: '7px 8px', fontSize: '12px' }}
                    />
                    <input type="time" value={filters[timeField]}
                      onChange={e => handleFilterChange(timeField, e.target.value)}
                      style={{ ...inputStyle, width: '95px', padding: '7px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              ))}

              <div>
                <label style={labelStyle}>Publish Date</label>
                <input type="date" value={filters.publishDate}
                  onChange={e => handleFilterChange('publishDate', e.target.value)}
                  style={{ ...inputStyle, padding: '7px 8px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={labelStyle}>File ID</label>
                <MultiCheckboxDropdown
                  value={filters.fileId}
                  onChange={value => handleFilterChange('fileId', value)}
                  options={filterOptions.fileId}
                />
              </div>
            </div>
          </div>

          {/* Footer: error + action buttons */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            {dateError && (
              <div style={{
                marginBottom: '10px', padding: '8px 12px',
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '6px', color: '#991b1b', fontSize: '12px', fontWeight: 500,
              }}>
                ⚠️ {dateError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={resetFilters} style={{
                padding: '8px 16px', background: '#f1f5f9', color: '#475569',
                border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={applyFilters} disabled={!!dateError} style={{
                padding: '8px 16px', background: '#667eea', color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                cursor: dateError ? 'not-allowed' : 'pointer', opacity: dateError ? 0.5 : 1,
              }}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Selection criteria summary */}
      <SelectionCriteria
        appliedFilters={appliedFilters}
        criteriaFields={CRITERIA_FIELDS}
        resultCount={filteredData.length}
        entityLabel="Non-DTC audit"
      />

      {/* API error banner */}
      {nonDtcFetchError && nonDtcAuditData.length === 0 && (
        <div style={{
          marginBottom: '16px', padding: '16px 20px', background: '#fff7ed',
          border: '1px solid #fed7aa', borderRadius: '10px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <div style={{ fontSize: '22px', lineHeight: 1 }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>
              Non-DTC (SAP) API Unavailable
            </div>
            <div style={{ color: '#78350f', fontSize: '13px' }}>
              The SAP Audit API returned an error: <strong>{nonDtcFetchError}</strong>.<br />
              This API may require VPN or AVD access. Contact your administrator if this persists.
            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      {isLoading ? (
        <LoadingSpinner message="Loading Non-DTC audit data..." />
      ) : (
        <DataTable
          tableId="non_dtc_audit"
          data={filteredData}
          columns={NON_DTC_COLUMNS}
          compactColumns={COMPACT_COLUMNS}
          exportColumns={NON_DTC_COLUMNS}
          defaultSort={{ key: 'startDate', direction: 'desc' }}
          isNonDtc
          defaultPageSize={50}
          onDownload
          exportConfig={{
            filename: 'Non_DTC_Audit_Export',
            pdfOptions: {
              orientation: 'landscape', pageFormat: 'a4', fontSize: 6,
              overflow: 'linebreak', horizontalPageBreak: true,
              horizontalPageBreakRepeat: [0, 1, 2], minCellWidth: 14, cellPadding: 2,
            },
          }}
          onViewDetail={() =>
            navigate('/non-dtc-audit-detail', { state: { filters, appliedFilters, hasQueried, showBars: showCharts } })
          }
          navigationState={{ filters, appliedFilters, hasQueried, showBars: showCharts }}
          detailPagePath="/non-dtc-audit-detail"
          auditType="SAP"
          appliedFilters={appliedFilters}
          enableSelection
        />
      )}
    </motion.div>
  );
};

export default NonDtcAudit;
