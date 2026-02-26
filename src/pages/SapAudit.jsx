import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import DataTable from '../components/DataTable';
import AnimatedCounter from '../components/AnimatedCounter';
import ColorBar, { FLOW_COLORS, EVENT_TYPE_COLORS } from '../components/ColorBar';
import { sapAuditData } from '../data/mockData';
import { exportToCSV } from '../utils/exportUtils';

const SapAudit = () => {
  const uniqueFlows = [...new Set(sapAuditData.map(item => item.flow))].length;

  const flowCounts = useMemo(() => {
    const counts = {};
    sapAuditData.forEach(row => {
      const flow = row.flow || 'UNKNOWN';
      counts[flow] = (counts[flow] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const eventTypeCounts = useMemo(() => {
    const counts = {};
    sapAuditData.forEach(row => {
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
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → Non DTC Audit
      </div>
      <h1 className="page-title" style={{ margin: 0, paddingBottom: '0.5rem', fontSize: '1.6rem', marginBottom: '12px' }}>Non DTC Audit</h1>

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
              src={`${process.env.PUBLIC_URL}/Total files.png`}
              alt="Total Files"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </div>
          <div className="summary-content">
            <h3 style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Total Files</h3>
            <p style={{ fontSize: '1.5rem' }}><AnimatedCounter value={sapAuditData.length} /></p>
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
              src={`${process.env.PUBLIC_URL}/unique flows.jpg`}
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

      {/* Color Bars */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
          padding: '18px 24px', marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)',
        }}
      >
        {flowCounts.length > 0 && (
          <ColorBar data={flowCounts} label="Flows" colors={FLOW_COLORS} />
        )}
        {eventTypeCounts.length > 0 && (
          <ColorBar data={eventTypeCounts} label="Event Type" colors={EVENT_TYPE_COLORS} />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <DataTable
          data={sapAuditData}
          columns={columns}
          onDownload={(row) => exportToCSV([row], columns, `sap_audit_${row.uniqueId}`)}
        />
      </motion.div>
    </motion.div>
  );
};

export default SapAudit;
