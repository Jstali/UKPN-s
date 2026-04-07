import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ChevronRight, Eye } from 'lucide-react';
import { formatDateTime } from '../utils/auditUtils';
import { useApp } from '../context/AppContext';

// Summary columns - must match DTC Failed Files table exactly
const SUMMARY_FIELDS_COMBINED = [
  { key: 'flowVersion', label: 'Flow' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp', format: 'datetime' },
  { key: 'fromRoleMPID', label: 'From Role + From MPID' },
  { key: 'toRoleMPID', label: 'To Role + To MPID' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];

const SUMMARY_FIELDS_SPLIT = [
  { key: 'flowVersion', label: 'Flow' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp', format: 'datetime' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];

// Additional detail fields
const DETAIL_FIELDS = [
  { key: 'destinationPath', label: 'Destination Path' },
  { key: 'destinationFileName', label: 'Destination File Name' },
  { key: 'Header_String', label: 'Header String' },
  { key: 'Source_Path', label: 'Source Path' },
  { key: 'File_ID', label: 'Original File ID' },
  { key: 'processed', label: 'Processed' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'recApp', label: 'Receiving App' },
];

const DtcFailedFilesDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useApp();
  const record = location.state?.record;
  const [showPreview, setShowPreview] = useState(false);
  const splitRoleMpid = ['Testing Team', 'Core Support', 'Admin'].includes(user?.role);
  const summaryFields = splitRoleMpid ? SUMMARY_FIELDS_SPLIT : SUMMARY_FIELDS_COMBINED;

  useEffect(() => {
    return () => {
      sessionStorage.setItem('dtcFailedScrollPos', window.scrollY.toString());
    };
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleDownload = () => {
    const content = JSON.stringify(record, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.Source_FileName || 'failed_file_details'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (value, format) => {
    if (!value) return '-';
    if (format === 'datetime') return formatDateTime(value);
    return String(value);
  };

  if (!record) {
    return (
      <div className="page-container">
        <p>No record data available</p>
        <button onClick={handleBack}>Back to DTC Failed Files</button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
        <Link to="/" style={{ color: '#4c4ebd', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={12} />
        <Link to="/dtc-failed-files" style={{ color: '#4c4ebd', textDecoration: 'none' }}>DTC Failed Files</Link>
        <ChevronRight size={12} />
        <span style={{ color: '#1e293b', fontWeight: 600 }}>Details</span>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={() => setShowPreview(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <Eye size={16} />
          Preview
        </button>
        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <Download size={16} />
          Download
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9fafb',
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                Record Preview
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `record-${record.id || 'preview'}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#fff',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
            }}>
              <pre style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                lineHeight: '1.6',
                overflow: 'auto',
                margin: 0,
                border: '1px solid #e2e8f0',
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {JSON.stringify(record, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Detail Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '2px solid #e5e7eb',
          background: '#f9fafb',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
            Failed File Details
          </h2>
        </div>

        {/* Summary Section */}
        <div style={{ padding: '20px 24px', borderBottom: '2px solid #e5e7eb' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: '#dc2626',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Summary Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {summaryFields.map(({ key, label, format }) => (
              <div key={key} style={{
                display: 'flex',
                padding: '10px 12px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}>
                <span style={{
                  fontWeight: 600,
                  color: '#64748b',
                  fontSize: '13px',
                  minWidth: '140px',
                  flexShrink: 0,
                }}>
                  {label}:
                </span>
                <span style={{
                  color: '#1e293b',
                  fontSize: '13px',
                  wordBreak: 'break-word',
                  flex: 1,
                }}>
                  {formatValue(record[key], format)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Details Section */}
        <div style={{ padding: '20px 24px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: '#0ea5e9',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Additional Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {DETAIL_FIELDS.map(({ key, label }) => {
              const value = record[key];
              if (!value) return null;
              return (
                <div key={key} style={{
                  display: 'flex',
                  padding: '10px 12px',
                  background: '#fafafa',
                  borderRadius: '6px',
                  border: '1px solid #f1f5f9',
                }}>
                  <span style={{
                    fontWeight: 600,
                    color: '#64748b',
                    fontSize: '13px',
                    minWidth: '140px',
                    flexShrink: 0,
                  }}>
                    {label}:
                  </span>
                  <span style={{
                    color: '#475569',
                    fontSize: '13px',
                    wordBreak: 'break-word',
                    flex: 1,
                  }}>
                    {String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DtcFailedFilesDetail;
