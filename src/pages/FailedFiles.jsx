import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Filter, X } from 'lucide-react';

import api from '../utils/api';
import { parseHeader, EVENT_TYPE_LABELS } from '../utils/auditUtils';

const FailedFiles = () => {
  const location = useLocation();
  const type = location.state?.type || 'dtc'; // 'dtc' or 'nondtc'

  const isDtc = type === 'dtc';
  const title = isDtc ? 'DTC Failed Files' : 'Non DTC Failed Files';

  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch audit data (DTC or Non-DTC)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let allData = [];
        let token = null;
        if (isDtc) {
          do {
            const response = await api.fetchDtcAuditData(token, 500);
            allData = [...allData, ...(response.data || [])];
            token = response.continuationToken || null;
          } while (token);
        } else {
          do {
            const response = await api.fetchNonDtcAuditData(token, 500);
            allData = [...allData, ...(response.data || [])];
            token = response.continuationToken || null;
          } while (token);
        }
        setAuditData(allData);
      } catch (error) {
        console.error('Failed to fetch audit data:', error);
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isDtc]);

  const isFailedStatus = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
  };

  // Extract failed records from audit data
  const dtcFailed = useMemo(() => {
    const failed = [];
    auditData.forEach(item => {
      const parsed = parseHeader(item.Header_String);
      const sourceApp = item.events?.[0]?.applicationName || 'Unknown';

      item.events?.forEach(event => {
        if (isFailedStatus(event.Status) || isFailedStatus(event.status)) {
          failed.push({
            flowVersion: parsed.flowVersion || 'UNKNOWN',
            fileId: item.File_ID || '',
            fromMPID: parsed.fromMPID || '',
            toMPID: parsed.toMPID || '',
            eventType: EVENT_TYPE_LABELS[event.Event_Type] || event.Event_Type || 'Unknown',
            status: event.Status || event.status,
            fileName: item.Source_FileName,
            sourceApplication: sourceApp,
          });
        }
      });
    });
    return failed;
  }, [auditData]);

  const nonDtcFailed = useMemo(() => {
    return auditData.filter(item =>
      isFailedStatus(item.status) || isFailedStatus(item.Status)
    );
  }, [auditData]);
  const allFailedRecords = isDtc ? dtcFailed : nonDtcFailed;

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique event types
  const eventTypes = useMemo(() => {
    const types = [...new Set(allFailedRecords.map(r => r.eventType))].filter(Boolean);
    return ['All', ...types];
  }, [allFailedRecords]);

  // Apply filters
  const failedRecords = useMemo(() => {
    return allFailedRecords.filter(record => {
      const matchesSearch = searchTerm === '' || 
        Object.values(record).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesEventType = eventTypeFilter === 'All' || record.eventType === eventTypeFilter;
      return matchesSearch && matchesEventType;
    });
  }, [allFailedRecords, searchTerm, eventTypeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setEventTypeFilter('All');
  };

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h1 className="page-title" style={{ fontSize: '1.6rem', margin: 0 }}>
          {title}
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s ease',
            border: showFilters ? '1.5px solid #c4b5fd' : '1.5px solid #e2e8f0',
            background: showFilters ? '#f5f3ff' : '#ffffff',
            color: showFilters ? '#7c3aed' : '#475569',
          }}
        >
          <Filter size={14} />
          Filters
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #e2e8f0',
            borderTopColor: '#667eea', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          Loading failed files...
        </div>
      ) : (
        <>

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
            padding: '16px 20px', marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search all fields..."
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '13px',
                  outline: 'none', transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Event Type Filter */}
            <div style={{ flex: '0 1 200px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Event Type
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '13px',
                  outline: 'none', cursor: 'pointer', background: '#fff'
                }}
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Clear Button */}
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.target.style.background = '#f8fafc'; }}
            >
              <X size={14} />
              Clear
            </button>
          </div>
        </motion.div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 16px', background: '#fef2f2', borderRadius: '10px',
        marginBottom: '16px', border: '1px solid #fecaca'
      }}>
        <AlertTriangle size={16} color="#dc2626" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
          {failedRecords.length} failed file{failedRecords.length !== 1 ? 's' : ''} found
          {failedRecords.length !== allFailedRecords.length && ` (filtered from ${allFailedRecords.length})`}
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
      </>
      )}
    </motion.div>
  );
};

export default FailedFiles;
