import React from 'react';

// Full-page centred loading spinner with an optional message.
// Replaces the identical inline spinner block in DtcAudit and NonDtcAudit.
const LoadingSpinner = ({ message = 'Loading data...' }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '300px', flexDirection: 'column', gap: '14px',
    color: '#64748b', fontSize: '14px', fontWeight: 500,
  }}>
    <div style={{
      width: '36px', height: '36px',
      border: '3px solid #e2e8f0', borderTopColor: '#667eea',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
    {message}
  </div>
);

export default LoadingSpinner;
