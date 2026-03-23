import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ChevronRight } from 'lucide-react';
import { formatDateTime } from '../utils/auditUtils';

// Summary columns - must match DTC Audit table exactly
const SUMMARY_FIELDS = [
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

const AuditDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const record = location.state?.record;

  useEffect(() => {
    return () => {
      sessionStorage.setItem('dtcAuditScrollPos', window.scrollY.toString());
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
    a.download = `${record.Source_FileName || 'audit_details'}.txt`;
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
        <button onClick={handleBack}>Back to DTC Audit</button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
        <Link to="/" style={{ color: '#4c4ebd', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={12} />
        <Link to="/dtc-audit" style={{ color: '#4c4ebd', textDecoration: 'none' }}>DTC Audit</Link>
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
            background: '#4c4ebd',
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
            Audit Record Details
          </h2>
        </div>

        {/* Summary Section */}
        <div style={{ padding: '20px 24px', borderBottom: '2px solid #e5e7eb' }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '14px', 
            fontWeight: 700, 
            color: '#6366f1',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Summary Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {SUMMARY_FIELDS.map(({ key, label, format }) => (
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

export default AuditDetails;
