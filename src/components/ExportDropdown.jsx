import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileDown, Mail } from 'lucide-react';

const ExportDropdown = ({ onExportPDF, onExportExcel, onExportCSV, onSendEmail }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = [
    { label: 'PDF', icon: <FileText size={15} />, action: onExportPDF },
    { label: 'Excel', icon: <FileSpreadsheet size={15} />, action: onExportExcel },
    { label: 'CSV', icon: <FileDown size={15} />, action: onExportCSV },
    { label: 'Send to Email', icon: <Mail size={15} />, action: onSendEmail },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 18px', background: '#4c4ebd', color: '#fff',
          border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: '600', transition: 'all 0.2s ease',
        }}
      >
        <Download size={15} /> Export
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 999,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '180px',
          overflow: 'hidden', animation: 'fadeIn 0.15s ease',
        }}>
          {items.map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '10px 16px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: '13px', color: '#334155',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
