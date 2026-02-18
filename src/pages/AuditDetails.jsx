import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

const AuditDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const record = location.state?.record;

  useEffect(() => {
    // Save scroll position before leaving
    return () => {
      sessionStorage.setItem('dtcAuditScrollPos', window.scrollY.toString());
    };
  }, []);

  const handleBack = () => {
    navigate('/dtc-audit');
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

  if (!record) {
    return (
      <div className="page-container">
        <p>No record data available</p>
        <button onClick={handleBack}>Back to DTC Audit</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/">Home</Link> → <Link to="/dtc-audit">DTC Audit</Link> → Details
      </div>
      
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
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} />
          Back to Audit
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
            fontSize: '14px'
          }}
        >
          <Download size={16} />
          Download
        </button>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', color: '#1f2937' }}>Audit Record Details</h2>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          {Object.entries(record).map(([key, value]) => {
            if (key === 'events' && Array.isArray(value)) {
              return (
                <div key={key} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                  <strong style={{ fontSize: '16px', color: '#374151' }}>Events:</strong>
                  {value.map((event, idx) => (
                    <div key={idx} style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: '#f9fafb', 
                      borderRadius: '6px' 
                    }}>
                      {Object.entries(event).map(([eKey, eValue]) => (
                        <div key={eKey} style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#6b7280' }}>{eKey}:</strong> {String(eValue)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={key} style={{ 
                display: 'grid', 
                gridTemplateColumns: '200px 1fr', 
                gap: '12px',
                padding: '12px',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <strong style={{ color: '#6b7280' }}>{key}:</strong>
                <span style={{ wordBreak: 'break-all' }}>{String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AuditDetails;
