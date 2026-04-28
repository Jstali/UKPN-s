import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ChevronRight, Eye } from 'lucide-react';
import { formatDateTime } from '../utils/auditUtils';
import { DTC_AUDIT_DETAIL_SUMMARY_FIELDS } from '../data/dtcSummaryColumns';

// Summary columns - must match DTC Audit table exactly
// Additional detail fields (exclude From Role/To Role as they're in Summary)
const DETAIL_FIELDS = [
  { key: 'Source_FileName', label: 'Source Path' },
  { key: 'destinationPath', label: 'Destination Path' },
  { key: 'destinationFileName', label: 'Destination File Name' },
  { key: 'Header_String', label: 'Header String' },
  { key: 'eventType', label: 'Event Type' },
];

const AuditDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const record = location.state?.record;
  const [showPreview, setShowPreview] = useState(false);
  const summaryFields = DTC_AUDIT_DETAIL_SUMMARY_FIELDS;

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
    const isEmpty = value === null || value === undefined || String(value).trim() === '';
    if (isEmpty) return '-';
    if (format === 'datetime') return formatDateTime(value);
    if (format === 'processed') {
      const processedVal = String(value).toLowerCase();
      return processedVal === 'true' ? 'Yes' : (processedVal === 'false' ? 'No' : String(value));
    }
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {summaryFields.map(({ key, label, format }) => (
              <div key={key} style={{
                display: 'flex',
                padding: '10px 12px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                maxWidth: ['fromRole', 'fromMPID', 'toRole', 'toMPID'].includes(key) ? '240px' : 'none',
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  color: '#64748b', 
                  fontSize: '13px',
                  minWidth: ['fromRole', 'fromMPID', 'toRole', 'toMPID'].includes(key) ? '90px' : '140px',
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
              const isEmpty = value === null || value === undefined || String(value).trim() === '';
              if (isEmpty) return null;
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
                    {formatValue(value, key === 'processed' ? 'processed' : undefined)}
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
