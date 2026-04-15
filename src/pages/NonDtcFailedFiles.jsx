import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import { useApp } from '../context/AppContext';
import { isNonDtcFailedRecord } from '../utils/statusUtils';

const NonDtcFailedFiles = () => {
  const navigate = useNavigate();
  const { nonDtcAuditData, loading, dataComplete, nonDtcFetchError } = useApp();
  const [flowFilter, setFlowFilter] = useState('All');
  const [fileNameFilter, setFileNameFilter] = useState('');

  const auditData = useMemo(() => (nonDtcAuditData || []).map(item => ({
    uniqueId: item.id || '',
    flow: item.sourceAppName || item.subscription || '-',
    sourceFile: item.sourceFileName || '',
    fileId: item.id || '',
    sourcePath: item.sourcePath || '',
    eventType: item.events?.[0]?.eventType || '',
    startDate: item.events?.[0]?.timestamp ? new Date(item.events[0].timestamp).toLocaleString() : '',
    endDate: item.events?.[item.events.length - 1]?.timestamp ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString() : '',
    status: item.status || '',
    rawData: item
  })), [nonDtcAuditData]);

  const failedFiles = useMemo(() => {
    let filtered = auditData.filter(row => isNonDtcFailedRecord(row.rawData));

    // Apply flow filter
    if (flowFilter && flowFilter !== 'All') {
      filtered = filtered.filter(row => row.flow === flowFilter);
    }

    // Apply file name filter
    if (fileNameFilter) {
      console.log('[NonDtcFailedFiles] Filtering by fileName:', fileNameFilter, 'Filter length:', fileNameFilter.length);
      console.log('[NonDtcFailedFiles] Sample row.sourceFile:', filtered[0]?.sourceFile, 'Type:', typeof filtered[0]?.sourceFile);
      
      const beforeFilter = filtered.length;
      filtered = filtered.filter(row => {
        const sourceFile = row.sourceFile;
        const matches = sourceFile && sourceFile.toLowerCase().includes(fileNameFilter.toLowerCase());
        if (!matches && sourceFile) {
          console.log('[NonDtcFailedFiles] No match - sourceFile:', sourceFile, 'Filter:', fileNameFilter);
        }
        return matches;
      });
      console.log('[NonDtcFailedFiles] Before filter:', beforeFilter, 'After filter:', filtered.length);
    }

    return filtered;
  }, [auditData, flowFilter, fileNameFilter]);

  const uniqueFlows = useMemo(() => {
    const failed = auditData.filter(row => isNonDtcFailedRecord(row.rawData));
    return ['All', ...new Set(failed.map(row => row.flow).filter(Boolean))];
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

  const hasUsableData = auditData.length > 0;
  const showLoadingState = !hasUsableData && (loading || !dataComplete) && !nonDtcFetchError;

  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
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
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Non-DTC Failed Files</span>
          </div>
        </div>

        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
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
          </div>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#7f1d1d', marginRight: '4px' }}>Flow:</label>
              <select 
                value={flowFilter} 
                onChange={(e) => setFlowFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                {uniqueFlows.map(flow => (
                  <option key={flow} value={flow}>{flow}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#7f1d1d', marginRight: '4px' }}>File Name:</label>
              <input
                type="text"
                value={fileNameFilter}
                onChange={(e) => setFileNameFilter(e.target.value)}
                placeholder="Search file name..."
                style={{
                  padding: '4px 8px',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  width: '200px'
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {nonDtcFetchError && !hasUsableData && (
        <div style={{
          marginBottom: '12px',
          padding: '12px 16px',
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          color: '#9a3412',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          Non-DTC API error: {nonDtcFetchError}
        </div>
      )}

      {showLoadingState ? (
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
        <>
          {(loading || !dataComplete) && hasUsableData && (
            <div style={{
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid #e2e8f0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Refreshing Non-DTC failed files...
            </div>
          )}
          <DataTable
            tableId="non_dtc_failed"
            data={failedFiles}
            columns={columns}
            defaultSort={{ key: 'startDate', direction: 'desc' }}
            defaultPageSize={50}
            onDownload={true}
            exportConfig={{ filename: 'Non_DTC_Failed_Files_Export' }}
            hideViewDetail={true}
          />
        </>
      )}
    </motion.div>
  );
};

export default NonDtcFailedFiles;
