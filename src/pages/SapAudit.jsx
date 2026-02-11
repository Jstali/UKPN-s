import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, GitBranch } from 'lucide-react';
import DataTable from '../components/DataTable';
import AnimatedCounter from '../components/AnimatedCounter';
import { sapAuditData } from '../data/mockData';

const SapAudit = () => {
  const uniqueFlows = [...new Set(sapAuditData.map(item => item.flow))].length;

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
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb">
        <Link to="/">Home</Link> → SAP Audit
      </div>
      <h1 className="page-title">SAP Audit</h1>

      <div className="summary-cards">
        <motion.div
          className="summary-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="summary-icon">
            <FileText />
          </div>
          <div className="summary-content">
            <h3>Total Files</h3>
            <p><AnimatedCounter value={sapAuditData.length} /></p>
          </div>
        </motion.div>

        <motion.div
          className="summary-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="summary-icon">
            <GitBranch />
          </div>
          <div className="summary-content">
            <h3>Unique Flows</h3>
            <p><AnimatedCounter value={uniqueFlows} /></p>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <DataTable data={sapAuditData} columns={columns} />
      </motion.div>
    </motion.div>
  );
};

export default SapAudit;
