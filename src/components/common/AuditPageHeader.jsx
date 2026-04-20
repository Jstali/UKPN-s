import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Activity, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import KpiChip from './KpiChip';

/**
 * Shared header bar for DTC Audit and Non-DTC Audit pages.
 * Renders: Back button, page title, KPI chips, Charts toggle, Reset, Filters toggle.
 *
 * Props:
 *   title         – page title string
 *   totalEvents   – total event count (before filtering)
 *   uniqueCount   – unique flow/app count
 *   uniqueLabel   – label for unique count chip (default "Flows")
 *   hasQueried    – whether a filter query is active
 *   resultCount   – filtered result count (shown when hasQueried)
 *   showCharts    – controlled state for charts visibility
 *   onToggleCharts
 *   showFilters   – controlled state for filter panel visibility
 *   onToggleFilters
 *   onReset       – called when Reset is clicked
 */
const AuditPageHeader = ({
  title,
  totalEvents,
  uniqueCount,
  uniqueLabel = 'Flows',
  hasQueried,
  resultCount,
  showCharts,
  onToggleCharts,
  showFilters,
  onToggleFilters,
  onReset,
}) => {
  const navigate = useNavigate();

  return (
    <div className="dtc-header-bar">
      {/* Left: back button + title */}
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
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>{title}</span>
        </div>
      </div>

      {/* Right: KPIs + action buttons */}
      <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
        <KpiChip icon={BarChart3} iconColor="#6366f1" label="Events" value={totalEvents} />
        <KpiChip icon={Activity}  iconColor="#0ea5e9" label={uniqueLabel} value={uniqueCount} />

        {hasQueried && (
          <KpiChip label="Results" value={resultCount} />
        )}

        <button
          className={`dtc-apps-toggle ${showCharts ? 'active' : ''}`}
          onClick={onToggleCharts}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          Charts
          <ChevronDown
            size={11}
            style={{ transform: showCharts ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          />
        </button>

        {hasQueried && (
          <button onClick={onReset} className="dtc-reset-btn" style={{ padding: '6px 14px', fontSize: '13px' }}>
            <RotateCcw size={12} /> Reset
          </button>
        )}

        <button
          className={`dtc-filter-btn ${showFilters ? 'active' : ''}`}
          onClick={onToggleFilters}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          <Filter size={13} /> Filters
          <ChevronDown
            size={11}
            style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          />
        </button>
      </div>
    </div>
  );
};

export default AuditPageHeader;
