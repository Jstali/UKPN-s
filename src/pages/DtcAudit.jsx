import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DtcFilterDropdown from '../components/DtcFilterDropdown';
import ColorBar, { APP_COLORS } from '../components/ColorBar';
import AuditPageHeader from '../components/common/AuditPageHeader';
import CollapsibleSection from '../components/common/CollapsibleSection';
import SelectionCriteria from '../components/common/SelectionCriteria';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuditFilters } from '../hooks/useAuditFilters';
import { useApp } from '../context/AppContext';
import { flattenDtcAuditData, buildFilteredDtcResults } from '../utils/flattenUtils';
import { DEFAULT_FILTERS, DEFAULT_COLUMNS_BUSINESS, DEFAULT_COLUMNS_FULL } from '../data/dashboardConfig';
import {
  DTC_SUMMARY_COLUMNS_COMBINED_FLOW,
  DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION,
} from '../data/dtcSummaryColumns';

// Fields shown in the "Your Selection Criteria" summary panel
const CRITERIA_FIELDS = [
  { label: 'Flow',                    key: 'flow' },
  { label: 'Version',                 key: 'version' },
  { label: 'From Role',               key: 'fromRole' },
  { label: 'From MPID',               key: 'fromMPID' },
  { label: 'To Role',                 key: 'toRole' },
  { label: 'To MPID',                 key: 'toMPID' },
  { label: 'Source Application',      key: 'sourceApplication' },
  { label: 'Destination Application', key: 'destinationApplication' },
  { label: 'Event Type',              key: 'eventType' },
  { label: 'Event Timestamp From',    key: 'eventTimestampFrom' },
  { label: 'Event Timestamp To',      key: 'eventTimestampTo' },
  { label: 'File Creation Date',      key: 'fileCreationDate' },
  { label: 'Publish Date',            key: 'publishDate' },
  { label: 'File ID',                 key: 'fileId' },
  { label: 'Message ID',              key: 'msgId' },
];

const DtcAudit = () => {
  const {
    user,
    auditData: globalAuditData,
    loading: globalLoading,
    subscriptionData,
    dtcHasMore,
    dtcLoadingMore,
    dtcPageMeta,
    loadMoreDtcData,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [showCharts,      setShowCharts]      = useState(false);
  const [showFilters,     setShowFilters]     = useState(false);
  const [currentTablePage, setCurrentTablePage] = useState(0);
  const [tablePageSize,    setTablePageSize]    = useState(50);

  // Subscription app names used for autocomplete inside the filter dropdown
  const subscriptionAppNames = useMemo(
    () => [...new Set(
      (subscriptionData || [])
        .map(app => app.Application || app.application || app.filterId || app.id)
        .filter(Boolean)
    )].sort(),
    [subscriptionData]
  );

  // applyFn passed to useAuditFilters — builds flat rows then applies filters
  const applyFilters = (f) => buildFilteredDtcResults(globalAuditData, f);

  const {
    filters,
    setFilters,
    updateFilter,
    appliedFilters,
    filteredResults,
    hasQueried,
    apply,
    reset,
  } = useAuditFilters(
    location.state?.filters || { ...DEFAULT_FILTERS },
    'dtcAudit',
    applyFilters,
    [globalAuditData]
  );

  // Apply filters immediately when navigating in from the filter page
  useEffect(() => {
    if (location.state?.filters) {
      apply(location.state.filters);
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Flatten ALL audit data for the default (unfiltered) table view
  const flattenedAuditData = useMemo(
    () => globalAuditData.length ? flattenDtcAuditData(globalAuditData) : [],
    [globalAuditData]
  );

  // File ID and Version options derived from already-flattened rows so they use
  // the same robust resolution logic as the table (deriveFlowVersion, HFile_ID, etc.)
  const fileIdOptions = useMemo(
    () => [...new Set(flattenedAuditData.map(r => r.hFileId).filter(Boolean))].sort(),
    [flattenedAuditData]
  );

  const versionOptions = useMemo(
    () => [...new Set(flattenedAuditData.map(r => r.version).filter(v => v && v !== '-'))].sort(),
    [flattenedAuditData]
  );

  // Derive flow options from flattened rows — guarantees options match the `flow` field
  // used in filtering (flattenDtcItem uses deriveFlowVersion() which has multiple fallbacks,
  // while DtcFilterDropdown only parsed Header_String — causing empty options when headers
  // are UNKNOWN but flow data exists in other fields).
  const flowOptions = useMemo(
    () => [...new Set(flattenedAuditData.map(r => r.flow).filter(v => v && v !== '-'))].sort(),
    [flattenedAuditData]
  );

  // Auto-fetch next DTC page when the user navigates to a table page that needs more rows
  useEffect(() => {
    if (hasQueried) return;
    if (!dtcHasMore || dtcLoadingMore) return;
    const requiredRows = (currentTablePage + 1) * tablePageSize;
    if (flattenedAuditData.length < requiredRows) {
      loadMoreDtcData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTablePage, tablePageSize, flattenedAuditData.length, dtcHasMore, dtcLoadingMore, hasQueried]);

  const handlePageChange = useCallback((page, size) => {
    setCurrentTablePage(page);
    setTablePageSize(size);
  }, []);

  // Validate date range before applying
  const handleApply = (filterData) => {
    const f = filterData || filters;
    if (f.eventTimestampFrom && f.eventTimestampTo) {
      if (new Date(f.eventTimestampFrom) > new Date(f.eventTimestampTo)) {
        alert('Event From date cannot be later than Event To date');
        return;
      }
    }
    apply(f);
    setShowFilters(false);
  };

  // Column set depends on role and whether a query has been run
  const isBusiness = user?.role === 'Business';
  const columns = hasQueried
    ? (isBusiness ? DTC_SUMMARY_COLUMNS_COMBINED_FLOW : DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION)
    : (isBusiness ? DEFAULT_COLUMNS_BUSINESS          : DEFAULT_COLUMNS_FULL);

  const tableData = hasQueried ? filteredResults : flattenedAuditData;

  // App distribution counts for the Charts bar
  const appCounts = useMemo(() => {
    if (!tableData.length) return [];
    const counts = {};
    tableData.forEach(({ application }) => {
      const app = application || 'Unknown';
      counts[app] = (counts[app] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tableData]);

  const uniqueFlowCount = useMemo(
    () => new Set(tableData.map(r => r.flow).filter(Boolean)).size,
    [tableData]
  );

  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AuditPageHeader
        title="DTC Audit"
        totalEvents={flattenedAuditData.length}
        uniqueCount={uniqueFlowCount}
        uniqueLabel="Flows"
        hasQueried={hasQueried}
        resultCount={filteredResults.length}
        showCharts={showCharts}
        onToggleCharts={() => setShowCharts(v => !v)}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(v => !v)}
        onReset={reset}
      />

      {/* Charts bar */}
      <CollapsibleSection isOpen={showCharts && appCounts.length > 0} style={{ marginBottom: 0 }}>
        <div className="dtc-apps-bar">
          <ColorBar data={appCounts} label="Applications" colors={APP_COLORS} />
        </div>
      </CollapsibleSection>

      {/* Filter panel */}
      <CollapsibleSection isOpen={showFilters} style={{ marginBottom: '8px' }} keepMounted>
        <DtcFilterDropdown
          filters={filters}
          auditData={globalAuditData}
          flowOptions={flowOptions}
          fileIdOptions={fileIdOptions}
          versionOptions={versionOptions}
          subscriptionAppNames={subscriptionAppNames}
          onFilterChange={updateFilter}
          onReset={reset}
          onApply={handleApply}
        />
      </CollapsibleSection>

      {/* Selection criteria summary */}
      <SelectionCriteria
        appliedFilters={appliedFilters}
        criteriaFields={CRITERIA_FIELDS}
        resultCount={filteredResults.length}
        entityLabel="DTC audit"
      />

      {/* Data table */}
      {globalLoading ? (
        <LoadingSpinner message="Loading DTC audit data..." />
      ) : (
        <>
          <DataTable
            tableId="dtc_audit"
            data={tableData}
            columns={columns}
            exportColumns={columns}
            compactColumns={columns}
            defaultSort={{ key: 'timestamp', direction: 'desc' }}
            defaultPageSize={50}
            groupByKey="eventId"
            onDownload
            exportConfig={{
              filename: 'DTC_Audit_Export',
              pdfOptions: {
                orientation: 'landscape', pageFormat: 'a4', fontSize: 6,
                overflow: 'linebreak', horizontalPageBreak: true,
                horizontalPageBreakRepeat: [0, 1, 2], minCellWidth: 12, cellPadding: 2,
              },
            }}
            onViewDetail={() =>
              navigate('/dtc-audit-filter', { state: { filters: appliedFilters || filters } })
            }
            onPageChange={handlePageChange}
            isLoadingMore={!hasQueried && dtcLoadingMore}
            auditType="DTC"
            appliedFilters={appliedFilters}
            enableSelection
          />
        </>
      )}
    </motion.div>
  );
};

export default DtcAudit;
