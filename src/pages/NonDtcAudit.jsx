import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, BarChart3, Activity } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { FLOW_COLORS, EVENT_TYPE_COLORS } from '../components/ColorBar';
import { nonDtcAuditData } from '../data/mockData';
import { exportToCSV } from '../utils/exportUtils';

const NonDtcAudit = () => {
  const [showBars, setShowBars] = useState(false);

  const uniqueFlows = [...new Set(nonDtcAuditData.map(item => item.flow))].length;

  const flowCounts = useMemo(() => {
    const counts = {};
    nonDtcAuditData.forEach(row => {
      const flow = row.flow || 'UNKNOWN';
      counts[flow] = (counts[flow] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const eventTypeCounts = useMemo(() => {
    const counts = {};
    nonDtcAuditData.forEach(row => {
      const et = row.eventType || 'Unknown';
      counts[et] = (counts[et] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const columns = [
    { key: 'uniqueId', label: 'Unique ID' },
    { key: 'flow', label: 'Flow' },
    { key: 'sourceFile', label: 'Source File' },
    { key: 'fileId', label: 'File ID' },
    { key: 'sourcePath', label: 'Source Path' },
    { key: 'eventType', label: 'Event Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <motion.div
      className="page-container non-dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Compact Header: Breadcrumb + KPIs + Actions — all in one row */}
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <div className="dtc-breadcrumb-inline">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Non DTC Audit</span>
          </div>
        </div>

        {/* Inline KPI chips */}
        <div className="dtc-kpi-row">
          <div className="dtc-kpi-chip">
            <BarChart3 size={14} color="#6366f1" />
            <span className="dtc-kpi-label">Files</span>
            <span className="dtc-kpi-value">{nonDtcAuditData.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip">
            <Activity size={14} color="#0ea5e9" />
            <span className="dtc-kpi-label">Flows</span>
            <span className="dtc-kpi-value">{uniqueFlows}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="dtc-header-actions">
          <button
            className={`dtc-apps-toggle ${showBars ? 'active' : ''}`}
            onClick={() => setShowBars(!showBars)}
          >
            Charts
            <ChevronDown size={12} style={{
              transform: showBars ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {/* Collapsible Color Bars */}
      <AnimatePresence>
        {showBars && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="dtc-apps-bar"
          >
            {eventTypeCounts.length > 0 && (
              <ColorBar data={eventTypeCounts} label="Event Type" colors={EVENT_TYPE_COLORS} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <DataTable
        data={nonDtcAuditData}
        columns={columns}
        compactColumns={[
          { key: 'uniqueId', label: 'Unique ID' },
          { key: 'flow', label: 'Flow' },
          { key: 'sourceFile', label: 'Source File' },
          { key: 'eventType', label: 'Event Type' },
          { key: 'status', label: 'Status' },
        ]}
        onDownload={(row) => exportToCSV([row], columns, `non_dtc_audit_${row.uniqueId}`)}
        exportConfig={{ filename: 'non_dtc_audit_report' }}
      />
    </motion.div>
  );
};

export default NonDtcAudit;
