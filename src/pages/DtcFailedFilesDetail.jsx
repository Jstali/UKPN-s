import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Activity, ChevronDown } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { APP_COLORS } from '../components/ColorBar';
import { useApp } from '../context/AppContext';
import { parseHeader, formatFlowVersion, formatFromRoleMPID, formatToRoleMPID } from '../utils/auditUtils';

const pickId = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';

const EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed'
};

const normalizeVersion = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  return /^\d+$/.test(str) ? str.padStart(3, '0') : str;
};

const deriveFlowVersion = (item, parsedFlowVersion, event) => {
  const direct =
    parsedFlowVersion ||
    item.Flow_Version ||
    item.flow_version ||
    item.flowVersion ||
    item.flow ||
    '';
  if (direct) return direct;

  const flowOnly = item.Flow || item.flow || '';
  const versionOnly = normalizeVersion(item.Version || item.version || '');
  if (flowOnly && versionOnly) return `${flowOnly} ${versionOnly}`;
  if (flowOnly) return flowOnly;

  return '';
};

const isFailedStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'duplicate checksum') return false;
  return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
};

const flattenAuditEvents = (data) => {
  const flatData = [];
  data.forEach(item => {
    const parsed = parseHeader(item.Header_String);
    if (item.events && item.events.length > 0) {
      const sourceApplication = item.events[0]?.applicationName || 'Unknown';
      const reversedEvents = [...item.events].reverse();

      reversedEvents.forEach(event => {
        const rawFlowVersion = deriveFlowVersion(item, parsed.flowVersion, event);
        const formattedFlowVersion = formatFlowVersion(rawFlowVersion) || '-';
        const flowVersionParts = formattedFlowVersion.split(' ');

        flatData.push({
          ...item,
          id: item.id,
          flowVersion: formattedFlowVersion,
          flow: flowVersionParts[0] || '-',
          version: flowVersionParts[1] || '-',
          fileId: pickId(item.File_ID, item.fileId, item.file_id, item.correlationId, item.id),
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

const DtcFailedFilesDetail = () => {
  const navigate = useNavigate();
  const { user, auditData, loading, dataComplete, fetchError } = useApp();
  const [showApps, setShowApps] = useState(false);

  const isBusiness = user?.role === 'Business';
  const splitRoleColumns = ['Testing Team', 'Core Support', 'Admin', 'Business'].includes(user?.role);

  // Memoize flattened data
  const flattenedData = useMemo(() => {
    if (auditData.length === 0) return [];
    return flattenAuditEvents(auditData);
  }, [auditData]);

  // Memoize failed records
  const failedRecords = useMemo(() => {
    return flattenedData.filter(row => isFailedStatus(row.status));
  }, [flattenedData]);

  const uniqueFlowCount = useMemo(() => {
    if (failedRecords.length === 0) return 0;
    const flows = new Set(failedRecords.map(r => r.flowVersion).filter(Boolean));
    return flows.size;
  }, [failedRecords]);

  const appCounts = useMemo(() => {
    if (failedRecords.length === 0) return [];
    const counts = {};
    failedRecords.forEach(row => {
      const app = row.application || 'Unknown';
      counts[app] = (counts[app] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [failedRecords]);

  // Define columns matching DTC Audit structure
  const columns = splitRoleColumns ? [
    { key: 'flow', label: 'Flow' },
    { key: 'version', label: 'Version' },
    { key: 'fileId', label: 'File ID' },
    { key: 'timestamp', label: 'Event Timestamp' },
    { key: 'fromRole', label: 'From Role' },
    { key: 'fromMPID', label: 'From MPID' },
    { key: 'toRole', label: 'To Role' },
    { key: 'toMPID', label: 'To MPID' },
    { key: 'sourceApplication', label: 'Source' },
    { key: 'application', label: 'Destination' },
    { key: 'status', label: 'Status' },
    { key: 'fileName', label: 'Source File Name' },
    { key: 'eventId', label: 'Message ID' },
  ] : [
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
  ];

  const compactColumns = splitRoleColumns ? [
    { key: 'flow', label: 'Flow' },
    { key: 'version', label: 'Version' },
    { key: 'fileId', label: 'File ID' },
    { key: 'timestamp', label: 'Event Timestamp' },
    { key: 'fromRole', label: 'From Role' },
    { key: 'fromMPID', label: 'From MPID' },
    { key: 'toRole', label: 'To Role' },
    { key: 'toMPID', label: 'To MPID' },
    { key: 'sourceApplication', label: 'Source' },
    { key: 'application', label: 'Destination' },
    { key: 'status', label: 'Status' },
    { key: 'fileName', label: 'Source File Name' },
    { key: 'eventId', label: 'Message ID' },
  ] : [
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
  ];

  return (
    <motion.div
      className="page-container dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Compact Header: Breadcrumb + Title + KPIs + Actions — all in one row */}
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <button
            onClick={() => navigate('/dtc-failed-files')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', background: '#667eea', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Back to Failed Files
          </button>
          <div className="dtc-breadcrumb-inline">
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>DTC Failed Files - Detail View</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <BarChart3 size={13} color="#dc2626" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Failed Events</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{failedRecords.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <Activity size={13} color="#0ea5e9" />
            <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>Flows</span>
            <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>{uniqueFlowCount}</span>
          </div>
          <button
            className={`dtc-apps-toggle ${showApps ? 'active' : ''}`}
            onClick={() => setShowApps(!showApps)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            Charts
            <ChevronDown size={11} style={{
              transform: showApps ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {/* Collapsible Applications bar */}
      <AnimatePresence>
        {showApps && appCounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="dtc-apps-bar"
          >
            <ColorBar data={appCounts} label="Applications" colors={APP_COLORS} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failed Files Info Banner */}
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
        <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
          Showing <span style={{ fontWeight: 700 }}>{failedRecords.length}</span> failed file{failedRecords.length !== 1 ? 's' : ''}
        </div>
      </motion.div>

      {fetchError && (
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px',
          padding: '10px 16px', marginBottom: '8px', fontSize: '13px', color: '#856404'
        }}>
          ⚠️ {fetchError}
        </div>
      )}

      {/* Data Table */}
      {loading || !dataComplete ? (
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
          data={failedRecords}
          columns={columns}
          compactColumns={compactColumns}
          detailPagePath="/dtc-failed-files-detail"
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          groupByKey="eventId"
          onDownload={true}
          exportConfig={{ filename: 'DTC_Failed_Files_Detail_Export' }}
          hideViewDetail={true}
        />
      )}
    </motion.div>
  );
};

export default DtcFailedFilesDetail;
