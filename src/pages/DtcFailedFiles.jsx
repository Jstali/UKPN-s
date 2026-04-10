import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import { useApp } from '../context/AppContext';
import { parseHeader, formatFlowVersion } from '../utils/auditUtils';
import {
  DTC_SUMMARY_COLUMNS_COMBINED_FLOW,
  DTC_SUMMARY_COLUMNS_SPLIT_FLOW_VERSION,
} from '../data/dtcSummaryColumns';

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

const FlowMultiSelectDropdown = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = value === 'All' ? [] : (value ? value.split(',') : []);

  React.useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('[data-flow-multi-select-default]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleOption = (option) => {
    let nextSelected;
    if (selectedValues.includes(option)) {
      nextSelected = selectedValues.filter((v) => v !== option);
    } else {
      nextSelected = [...selectedValues, option];
    }
    onChange(nextSelected.length === 0 ? 'All' : nextSelected.join(','));
  };

  const displayText = selectedValues.length === 0
    ? 'All'
    : selectedValues.length === 1
      ? selectedValues[0]
      : `${selectedValues.length} selected`;

  return (
    <div data-flow-multi-select-default style={{ position: 'relative', minWidth: '140px' }}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: '4px 8px',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          fontSize: '12px',
          background: '#fff',
          cursor: 'pointer',
          minWidth: '120px',
        }}
      >
        {displayText}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '240px',
          overflowY: 'auto',
          zIndex: 999,
          minWidth: '160px',
        }}>
          <div
            onClick={() => onChange('All')}
            style={{
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9',
              background: selectedValues.length === 0 ? '#f8fafc' : '#fff',
              fontWeight: selectedValues.length === 0 ? 600 : 400,
            }}
          >
            <input type="checkbox" readOnly checked={selectedValues.length === 0} style={{ marginRight: '8px' }} />
            All
          </div>
          {options.map((option) => (
            <div
              key={option}
              onClick={() => toggleOption(option)}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                background: selectedValues.includes(option) ? '#eef2ff' : '#fff',
              }}
            >
              <input type="checkbox" readOnly checked={selectedValues.includes(option)} style={{ marginRight: '8px' }} />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const flattenAuditEvents = (data) => {
  const flatData = [];
  // Log first UNKNOWN-flow item so we can see what fields the API returns
  const firstUnknown = data.find(item =>
    !parseHeader(item.Header_String).flowVersion &&
    !item.Flow_Version && !item.flow_version && !item.flow && !item.Flow
  );
  if (firstUnknown) console.log('[DtcFailedFiles] Sample UNKNOWN-flow record:', firstUnknown);

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
  const { user, auditData, loading, dataComplete, fetchError } = useApp();
  const [flowFilter, setFlowFilter] = useState('All');
  const [fileNameFilter, setFileNameFilter] = useState('');
  const isBusiness = user?.role === 'Business';

  const isFailedStatus = (status) => {
    const s = (status || '').toLowerCase();
    // Exclude "duplicate checksum" - it's not a failure
    if (s === 'duplicate checksum') return false;
    return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
  };

  // Memoize flattened data once
  const flattenedData = useMemo(() => {
    if (auditData.length === 0) return [];
    return flattenAuditEvents(auditData);
  }, [auditData]);

  // Memoize failed records
  const failedRecords = useMemo(() => {
    return flattenedData.filter(row => isFailedStatus(row.status));
  }, [flattenedData]);

  // Apply filters
  const failedFiles = useMemo(() => {
    let filtered = failedRecords;

    if (flowFilter && flowFilter !== 'All') {
      const selectedFlows = flowFilter.split(',').filter(Boolean);
      filtered = filtered.filter(row => selectedFlows.includes(row.flow));
    }

    if (fileNameFilter) {
      filtered = filtered.filter(row =>
        row.fileName && row.fileName.toLowerCase().includes(fileNameFilter.toLowerCase())
      );
    }

    return filtered;
  }, [failedRecords, flowFilter, fileNameFilter]);

  const uniqueFlows = useMemo(() => {
    return [...new Set(failedRecords.map(row => row.flow).filter(v => v && v !== '-'))].sort();
  }, [failedRecords]);

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
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>DTC Failed Files</span>
          </div>
        </div>

        <div className="dtc-header-actions" style={{ marginLeft: 'auto' }}>
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
              <FlowMultiSelectDropdown
                value={flowFilter} 
                options={uniqueFlows}
                onChange={setFlowFilter}
              />
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
          {loading ? 'Loading failed files data...' : 'Fetching all data, please wait...'}
        </div>
      ) : (
        <DataTable
          tableId="dtc_failed"
          data={failedFiles}
          columns={isBusiness ? DTC_SUMMARY_COLUMNS_COMBINED_FLOW : DTC_SUMMARY_COLUMNS_SPLIT_FLOW_VERSION}
          compactColumns={isBusiness ? DTC_SUMMARY_COLUMNS_COMBINED_FLOW : DTC_SUMMARY_COLUMNS_SPLIT_FLOW_VERSION}
          exportColumns={isBusiness ? DTC_SUMMARY_COLUMNS_COMBINED_FLOW : DTC_SUMMARY_COLUMNS_SPLIT_FLOW_VERSION}
          defaultSort={{ key: 'timestamp', direction: 'desc' }}
          defaultPageSize={50}
          groupByKey="eventId"
          onDownload={true}
          onViewDetail={() => navigate('/dtc-failed-files-detail')}
          detailPagePath="/audit-details"
          exportConfig={{
            filename: 'DTC_Failed_Files_Export',
            pdfOptions: {
              orientation: 'landscape',
              pageFormat: 'a4',
              fontSize: 7,
              overflow: 'linebreak',
              horizontalPageBreak: true,
              horizontalPageBreakRepeat: [0, 1, 2],
              minCellWidth: 14,
              cellPadding: 2.2,
            },
          }}
          hideViewDetail={false}
        />
      )}
    </motion.div>
  );
};

export default DtcFailedFiles;
