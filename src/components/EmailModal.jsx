import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

const EmailModal = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (sent) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [sent, onClose]);

  const handleSend = () => {
    if (!email) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '14px', padding: '28px 32px',
        width: '420px', maxWidth: '92vw',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        animation: 'fadeIn 0.2s ease',
      }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={52} color="#10b981" style={{ marginBottom: '12px' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Email Sent!</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
              Report has been sent to {email}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b' }}>Send Report via Email</h3>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px',
              }}>
                <X size={18} />
              </button>
            </div>

            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#4c4ebd')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 20px', background: '#f1f5f9', color: '#475569',
                border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
              }}>
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!email || sending}
                style={{
                  padding: '8px 20px', background: !email ? '#94a3b8' : '#4c4ebd',
                  color: '#fff', border: 'none', borderRadius: '8px', cursor: !email ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 600, minWidth: '80px',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailModal;
