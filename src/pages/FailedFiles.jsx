import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { dtcAuditData, nonDtcAuditData } from '../data/mockData';

const FailedFiles = () => {
  const location = useLocation();
  const type = location.state?.type || 'dtc'; // 'dtc' or 'nondtc'

  const isDtc = type === 'dtc';
  const title = isDtc ? 'DTC Failed Files' : 'Non DTC Failed Files';

  const dtcFailed = dtcAuditData.filter(item => item.status === 'Failed');
  const nonDtcFailed = nonDtcAuditData.filter(item => item.status === 'Failed');
  const failedRecords = isDtc ? dtcFailed : nonDtcFailed;

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → {title}
      </div>

      <h1 className="page-title" style={{ fontSize: '1.6rem', marginBottom: '18px' }}>
        {title}
      </h1>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 16px', background: '#fef2f2', borderRadius: '10px',
        marginBottom: '16px', border: '1px solid #fecaca'
      }}>
        <AlertTriangle size={16} color="#dc2626" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
          {failedRecords.length} failed file{failedRecords.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div style={{
        background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)'
      }}>
        {/* Table Header */}
        {isDtc ? (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
            padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
            fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Flow Version</span>
            <span>File ID</span>
            <span>From MPID</span>
            <span>To MPID</span>
            <span>Event Type</span>
            <span>Status</span>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
            padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
            fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Unique ID</span>
            <span>Flow</span>
            <span>File ID</span>
            <span>Event Type</span>
            <span>Start Date</span>
            <span>Status</span>
          </div>
        )}

        {/* Table Rows */}
        {failedRecords.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No failed files found.
          </div>
        ) : (
          failedRecords.map((record, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < failedRecords.length - 1 ? '1px solid #f1f5f9' : 'none',
                transition: 'background 0.15s ease',
              }}
            >
              {isDtc ? (
                <>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{record.flowVersion}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.fileId}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.fromMPID}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.toMPID}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.eventType}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '10px',
                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    display: 'inline-block', width: 'fit-content'
                  }}>Failed</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{record.uniqueId}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.flow}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.fileId}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.eventType}</span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{record.startDate}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '10px',
                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    display: 'inline-block', width: 'fit-content'
                  }}>Failed</span>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default FailedFiles;
