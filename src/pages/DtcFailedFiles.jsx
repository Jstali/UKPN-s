import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import api from '../utils/api';
import { parseHeader, formatDateTime, formatFlowVersion, formatFromRoleMPID, formatToRoleMPID } from '../utils/auditUtils';
import { DEFAULT_COLUMNS_FULL } from '../data/dashboardConfig';

const EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed'
};

const flattenAuditEvents = (data) => {
  const flatData = [];
  data.forEach(item => {
    const parsed = parseHeader(item.Header_String);
    if (item.events && item.events.length > 0) {
      const sourceApplication = item.events[0]?.applicationName || 'Unknown';
      const reversedEvents = [...item.events].reverse();
      
      reversedEvents.forEach(event => {
        flatData.push({
          ...item,
          id: item.id,
          flowVersion: formatFlowVersion(parsed.flowVersion || item.Flow_Version || item.flow_version || item.flow) || 'UNKNOWN',
          fileId: item.File_ID || item.fileId || item.file_id || item.id || item.correlationId || '',
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

const DtcFailedFiles = () => {
  const navigate = useNavigate();
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [flowFilter, setFlowFilter] = useState('All');
  const [fileNameFilter, setFileNameFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        let allData = [];
        let token = null;
        do {
          const response = await api.fetchDtcAuditData(token, 500);
          allData = [...allData, ...(response.data || [])];
          token = response.continuationToken || null;
        } while (token);
        if (allData.length === 0) {
          setFetchError('No data returned from API. Ensure you are connected to the AVD network.');
        }
        setAuditData(allData);
      } catch (error) {
        console.error('Failed to fetch audit data:', error);
        setFetchError(error.message || 'Failed to fetch data from API.');
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isFailedStatus = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
  };

  const failedFiles = useMemo(() => {
    if (auditData.length === 0) return [];
    const flattened = flattenAuditEvents(auditData);
    let filtered = flattened.filter(row => isFailedStatus(row.status));

    // Apply flow filter
    if (flowFilter && flowFilter !== 'All') {
      filtered = filtered.filter(row => row.flowVersion === flowFilter);
    }

    // Apply file name filter
    if (fileNameFilter) {
      filtered = filtered.filter(row =>
        row.fileName && row.fileName.toLowerCase().includes(fileNameFilter.toLowerCase())
      );
    }

    return filtered;
  }, [auditData, flowFilter, fileNameFilter]);

  const uniqueFlows = useMemo(() => {
    const flattened = flattenAuditEvents(auditData);
    const failed = flattened.filter(row => isFailedStatus(row.status));
    return ['All', ...new Set(failed.map(row => row.flowVersion).filter(Boolean))];
  }, [auditData]);

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
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>DTC Failed Files</span>
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

      {fetchError && (
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px',
          padding: '10px 16px', marginBottom: '8px', fontSize: '13px', color: '#856404'
        }}>
          ⚠️ {fetchError}
        </div>
      )}

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
              ⚠️ DTC Failed Files
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

      {loading ? (
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
          data={failedFiles}
          columns={DEFAULT_COLUMNS_FULL}
          compactColumns={[
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
          ]}
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          groupByKey="eventId"
          onDownload={true}
          exportConfig={{ filename: 'DTC_Failed_Files_Export' }}
          hideViewDetail={true}
        />
      )}
    </motion.div>
  );
};

export default DtcFailedFiles;
