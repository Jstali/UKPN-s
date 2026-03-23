import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { parseHeader } from '../../utils/auditUtils';

const FailedFilesSection = ({ dtcFailed, nonDtcFailed, dashboardUpdatedAt }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [flowFilter, setFlowFilter] = useState('All');
  const [fileNameFilter, setFileNameFilter] = useState('');

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
    setFlowFilter('All');
    setFileNameFilter('');
  };

  const getFilteredFiles = (files) => {
    return files.filter(file => {
      const parsed = parseHeader(file.Header_String);
      const matchesFlow = flowFilter === 'All' || parsed.flowVersion === flowFilter;
      const matchesFileName = !fileNameFilter || file.Source_FileName?.toLowerCase().includes(fileNameFilter.toLowerCase());
      return matchesFlow && matchesFileName;
    });
  };

  const getUniqueFlows = (files) => {
    const flows = files.map(f => parseHeader(f.Header_String).flowVersion).filter(Boolean);
    return ['All', ...new Set(flows)];
  };

  const renderFileList = (files, category) => {
    const filteredFiles = getFilteredFiles(files);
    const flows = getUniqueFlows(files);

    return (
      <AnimatePresence>
        {expandedCategory === category && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px', borderTop: '1px solid #fee2e2', background: '#fef2f2' }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Flow
                  </label>
                  <select
                    value={flowFilter}
                    onChange={(e) => setFlowFilter(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0',
                      borderRadius: '6px', fontSize: '12px', outline: 'none'
                    }}
                  >
                    {flows.map(flow => (
                      <option key={flow} value={flow}>{flow}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    File Name Pattern
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={fileNameFilter}
                      onChange={(e) => setFileNameFilter(e.target.value)}
                      placeholder="Search file name..."
                      style={{
                        width: '100%', padding: '6px 10px 6px 32px', border: '1.5px solid #e2e8f0',
                        borderRadius: '6px', fontSize: '12px', outline: 'none'
                      }}
                    />
                    {fileNameFilter && (
                      <X
                        size={14}
                        onClick={() => setFileNameFilter('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* File List */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredFiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                    No failed files found
                  </div>
                ) : (
                  filteredFiles.map((file, idx) => {
                    const parsed = parseHeader(file.Header_String);
                    const failedEvent = file.events?.find(e => e.Status === 'Failed' || e.Status === 'Invalid Subscription');
                    
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          background: '#fff',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                          {file.Source_FileName}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '11px' }}>
                          <span>Flow: {parsed.flowVersion || 'N/A'}</span>
                          <span>Status: <span style={{ color: '#dc2626', fontWeight: 600 }}>{failedEvent?.Status}</span></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const totalFailed = dtcFailed.length + nonDtcFailed.length;

  if (totalFailed === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="dashboard-section-card"
    >
      {/* Header */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-header-left">
          <div className="dashboard-pulse-dot" style={{ background: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)' }} />
          <h3 className="dashboard-section-title">Failed Files</h3>
        </div>
        <span className="dashboard-section-meta">
          Updated: {dashboardUpdatedAt}
        </span>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* DTC Failures */}
        <div
          style={{
            border: '1.5px solid #fecaca',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#fff'
          }}
        >
          <div
            onClick={() => toggleCategory('dtc')}
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: expandedCategory === 'dtc' ? '#fef2f2' : '#fff',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="#dc2626" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                DTC Failures
              </span>
              <span style={{
                padding: '2px 8px',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {dtcFailed.length}
              </span>
            </div>
            {expandedCategory === 'dtc' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {renderFileList(dtcFailed, 'dtc')}
        </div>

        {/* Non-DTC Failures */}
        <div
          style={{
            border: '1.5px solid #fecaca',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#fff'
          }}
        >
          <div
            onClick={() => toggleCategory('nonDtc')}
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: expandedCategory === 'nonDtc' ? '#fef2f2' : '#fff',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="#dc2626" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                Non-DTC Failures
              </span>
              <span style={{
                padding: '2px 8px',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {nonDtcFailed.length}
              </span>
            </div>
            {expandedCategory === 'nonDtc' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {renderFileList(nonDtcFailed, 'nonDtc')}
        </div>
      </div>
    </motion.div>
  );
};

export default FailedFilesSection;
