import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import api from '../utils/api';

const NonDtcFailedFiles = () => {
  const navigate = useNavigate();
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.fetchNonDtcAuditData();
        setAuditData(response.data || response || []);
      } catch (error) {
        console.error('Failed to fetch non-DTC audit data:', error);
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const failedFiles = useMemo(() => {
    return auditData.filter(row => row.status === 'Failed' || row.status === 'Invalid Subscription');
  }, [auditData]);

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
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <div className="dtc-breadcrumb-inline">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Non-DTC Failed Files</span>
          </div>
        </div>

        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
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
        </div>
      </div>

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
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
          ⚠️ Non-DTC Failed Files
        </div>
        <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
          {failedFiles.length === 0 ? (
            <span>No failed files found</span>
          ) : (
            <>Found <span style={{ fontWeight: 700 }}>{failedFiles.length}</span> failed file{failedFiles.length !== 1 ? 's' : ''}</>
          )}
        </div>
      </motion.div>

      <DataTable
        data={failedFiles}
        columns={columns}
        defaultSort={{ key: 'startDate', direction: 'desc' }}
        defaultPageSize={50}
        onDownload={true}
        exportConfig={{ filename: 'Non_DTC_Failed_Files_Export' }}
        hideViewDetail={true}
      />
    </motion.div>
  );
};

export default NonDtcFailedFiles;
