import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/auditUtils';
import { DEFAULT_COLUMNS_FULL } from '../data/dashboardConfig';

const NON_DTC_DEFAULT_COLUMNS = DEFAULT_COLUMNS_FULL.filter(
  ({ key }) => !['flow', 'version', 'fromRole', 'fromMPID', 'toRole', 'toMPID'].includes(key)
);

const NON_DTC_EVENT_TYPE_MAP = {
  '1': 'File Pickup from Source',
  '2': 'File Stored To Blob',
  '3': 'File Subscribe',
  '4': 'File Delivered',
};

const mapNonDtcEventType = (event) => {
  const raw = String(event.eventType || event.event_type || event.Event_Type || event.EventType || '');
  return event.description || event.Description || NON_DTC_EVENT_TYPE_MAP[raw] || raw;
};

const DEST_PATH_FIELDS = [
  'destinationPath', 'Destination_Path', 'destination_path',
  'destinationContent', 'DestinationContent', 'destination_content',
  'destPath', 'DestPath', 'dest_path',
  'targetPath', 'TargetPath', 'target_path',
  'outputPath', 'OutputPath', 'output_path',
];

const getNonDtcDisplayDestPath = (item) => {
  const events = item.events || [];
  for (const e of [...events].reverse()) {
    for (const f of DEST_PATH_FIELDS) {
      if (e[f] && String(e[f]).trim()) return String(e[f]).trim();
    }
  }
  for (const f of DEST_PATH_FIELDS) {
    if (item[f] && String(item[f]).trim()) return String(item[f]).trim();
  }
  return '';
};

const flattenNonDtcEvents = (data) => {
  const flatData = [];
  (data || []).forEach(item => {
    const events = item.events && item.events.length > 0 ? item.events : [{}];
    const fileName = item.sourceFileName || '';
    const fileType = fileName ? fileName.split('.').pop().toUpperCase() : '-';
    const displayDestPath = getNonDtcDisplayDestPath(item);

    const itemBlobArchive = item.Blob_Archive_Link_Location || item.blobArchiveLinkLocation || item.blob_archive_link_location || '';
    const itemBlobLocation = item.Blob_Location || item.blobLocation || item.blob_location || '';
    const itemBlobFileName = item.Blob_File_Name || item.blobFileName || item.blob_file_name || '';

    const blobEvent = (item.events || []).find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '2');
    const evtBlobArchive = blobEvent ? (blobEvent.Blob_Archive_Link_Location || blobEvent.blobArchiveLinkLocation || '') : '';
    const evtBlobLocation = blobEvent ? (blobEvent.Blob_Location || blobEvent.blobLocation || blobEvent.storagePath || blobEvent.StoragePath || blobEvent.filePath || '') : '';
    const evtBlobFileName = blobEvent ? (blobEvent.Blob_File_Name || blobEvent.blobFileName || blobEvent.destinationContent || blobEvent.DestinationContent || '') : '';

    const subscriptionEvent = (item.events || []).find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '3');
    const flowValue = subscriptionEvent?.subscription || item.subscription || item.description || '-';

    events.forEach(event => {
      flatData.push({
        uniqueId: item.id || '',
        flow: flowValue,
        version: item.version || item.subscription || '-',
        fileId: item.id || '-',
        timestamp: formatDateTime(event.timestamp || item.timestamp || ''),
        fromRole: item.fromRole || '-',
        fromMPID: item.fromMPID || '-',
        toRole: item.toRole || '-',
        toMPID: item.toMPID || '-',
        sourceApplication: item.sourceAppName || '-',
        application: event.destinationApplication || event.applicationName || 'NA event',
        status: event.status || event.Status || item.status || '',
        fileType: fileType,
        fileName: fileName || '-',
        sourceApp: item.sourceAppName || item.subscription || '-',
        sourceFile: fileName || '',
        subscription: item.subscription || '',
        sourcePath: item.sourcePath || '',
        destinationPath: displayDestPath,
        Blob_Archive_Link_Location: itemBlobArchive || evtBlobArchive,
        Blob_Location: itemBlobLocation || evtBlobLocation,
        Blob_File_Name: itemBlobFileName || evtBlobFileName,
        Source_FileName: fileName,
        eventType: mapNonDtcEventType(Object.keys(event).length ? event : { eventType: item.eventType }),
        rawData: item,
      });
    });
  });
  return flatData;
};

const NON_DTC_COLUMNS = [
  ...NON_DTC_DEFAULT_COLUMNS.slice(0, -1),
  { key: 'fileType', label: 'File Type' },
  NON_DTC_DEFAULT_COLUMNS[NON_DTC_DEFAULT_COLUMNS.length - 1],
  { key: 'sourcePath', label: 'Source Path' },
  { key: 'destinationPath', label: 'Destination Path' },
];

const NonDtcFailedFiles = () => {
  const navigate = useNavigate();
  const { nonDtcAuditData, loading } = useApp();
  const [filters, setFilters] = useState({ flow: 'All', fileName: '' });

  const auditData = useMemo(() => flattenNonDtcEvents(nonDtcAuditData || []), [nonDtcAuditData]);

  const failedFiles = useMemo(() => {
    let filtered = auditData.filter(row => row.status === 'Failed');

    if (filters.flow && filters.flow !== 'All') {
      filtered = filtered.filter(row => row.flow === filters.flow);
    }

    if (filters.fileName) {
      filtered = filtered.filter(row => 
        row.fileName && row.fileName.toLowerCase().includes(filters.fileName.toLowerCase())
      );
    }

    return filtered;
  }, [auditData, filters]);

  const uniqueFlows = useMemo(() => {
    const failed = auditData.filter(row => row.status === 'Failed');
    return ['All', ...new Set(failed.map(row => row.flow).filter(Boolean))];
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
                value={filters.flow} 
                onChange={(e) => setFilters(prev => ({ ...prev, flow: e.target.value }))}
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
                value={filters.fileName}
                onChange={(e) => setFilters(prev => ({ ...prev, fileName: e.target.value }))}
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
          Loading Non-DTC failed files...
        </div>
      ) : (
        <DataTable
          tableId="non_dtc_failed"
          data={failedFiles}
          columns={NON_DTC_COLUMNS}
          exportColumns={NON_DTC_COLUMNS}
          compactColumns={[
            { key: 'flow', label: 'Flow' },
            { key: 'fileId', label: 'File ID' },
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'sourceApplication', label: 'Source' },
            { key: 'application', label: 'Destination' },
            { key: 'sourcePath', label: 'Source Path' },
            { key: 'destinationPath', label: 'Destination Path' },
            { key: 'status', label: 'Status' },
            { key: 'fileName', label: 'Source File Name' },
          ]}
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          onDownload={true}
          exportConfig={{
            filename: 'Non_DTC_Failed_Files_Export',
            pdfOptions: {
              orientation: 'landscape',
              pageFormat: 'a4',
              fontSize: 6,
              overflow: 'linebreak',
              horizontalPageBreak: true,
              horizontalPageBreakRepeat: [0, 1, 2],
              minCellWidth: 12,
              cellPadding: 2,
            },
          }}
        />
      )}
    </motion.div>
  );
};

export default NonDtcFailedFiles;
