import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Loader } from 'lucide-react';

const MAX_PREVIEW_LINES = 1000;

const FileViewModal = ({ fileName, fileContent, onClose, onDownload, loading, error }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = fileContent ? fileContent.split('\n') : [];
  const isTruncated = lines.length > MAX_PREVIEW_LINES;
  const displayContent = isTruncated ? lines.slice(0, MAX_PREVIEW_LINES).join('\n') : fileContent;

  return (
    <div
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
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName}
            </h3>
            {isTruncated && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Showing first {MAX_PREVIEW_LINES.toLocaleString()} lines of {lines.length.toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: '#64748b',
              marginLeft: '12px',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            background: '#f8fafc',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#64748b' }}>
              <Loader size={20} className="spinner" />
              <span>Loading file content...</span>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Failed to load file</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>{error}</p>
            </div>
          ) : (
            <pre
              style={{
                margin: 0,
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '12px',
                lineHeight: '1.6',
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {displayContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                background: copied ? '#10b981' : '#f1f5f9',
                color: copied ? '#fff' : '#475569',
                border: '1px solid',
                borderColor: copied ? '#10b981' : '#e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <Copy size={14} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={onDownload}
              style={{
                padding: '8px 16px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewModal;
