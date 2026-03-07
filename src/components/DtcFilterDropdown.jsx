import React from 'react';
import { motion } from 'framer-motion';
import { Search, RotateCcw } from 'lucide-react';

const DtcFilterDropdown = ({ filters, onFilterChange, onReset, onApply }) => {
  const dropdownFields = [
    { label: 'Application', field: 'application' },
    { label: 'Event Type', field: 'eventType' },
    { label: 'Flow', field: 'flow' },
    { label: 'Version', field: 'version' },
    { label: 'From Role', field: 'fromRole' },
    { label: 'From MPID', field: 'fromMPID' },
    { label: 'To Role', field: 'toRole' },
    { label: 'To MPID', field: 'toMPID' },
    { label: 'Receiving App', field: 'receivingApp' },
  ];

  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' };
  const selectStyle = {
    width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '13px', color: '#1e293b',
    background: '#fff', cursor: 'pointer', outline: 'none'
  };
  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '13px', outline: 'none'
  };
  const smallInputStyle = {
    flex: 1, padding: '8px 8px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '12px', outline: 'none'
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'white', borderRadius: '12px',
        border: '1px solid #e5e7eb', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)'
      }}
    >
      {/* Filter Fields */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {dropdownFields.map(({ label, field }) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <select
                value={filters[field]}
                onChange={(e) => onFilterChange(field, e.target.value)}
                style={selectStyle}
              >
                <option value="All">All</option>
              </select>
            </div>
          ))}

          {/* Event Timestamp From */}
          <div>
            <label style={labelStyle}>Event Timestamp From</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date"
                value={filters.eventTimestampFrom.split('T')[0] || ''}
                onChange={(e) => {
                  const time = filters.eventTimestampFrom.split('T')[1] || '00:00';
                  onFilterChange('eventTimestampFrom', e.target.value ? `${e.target.value}T${time}` : '');
                }}
                style={smallInputStyle}
              />
              <input type="time"
                value={filters.eventTimestampFrom.split('T')[1] || ''}
                onChange={(e) => {
                  const date = filters.eventTimestampFrom.split('T')[0] || new Date().toISOString().split('T')[0];
                  onFilterChange('eventTimestampFrom', `${date}T${e.target.value}`);
                }}
                style={smallInputStyle}
              />
            </div>
          </div>

          {/* Event Timestamp To */}
          <div>
            <label style={labelStyle}>Event Timestamp To</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date"
                value={filters.eventTimestampTo.split('T')[0] || ''}
                onChange={(e) => {
                  const time = filters.eventTimestampTo.split('T')[1] || '23:59';
                  onFilterChange('eventTimestampTo', e.target.value ? `${e.target.value}T${time}` : '');
                }}
                style={smallInputStyle}
              />
              <input type="time"
                value={filters.eventTimestampTo.split('T')[1] || ''}
                onChange={(e) => {
                  const date = filters.eventTimestampTo.split('T')[0] || new Date().toISOString().split('T')[0];
                  onFilterChange('eventTimestampTo', `${date}T${e.target.value}`);
                }}
                style={smallInputStyle}
              />
            </div>
          </div>

          {/* File Creation Date */}
          <div>
            <label style={labelStyle}>File Creation Date</label>
            <input type="date"
              value={filters.fileCreationDate}
              onChange={(e) => onFilterChange('fileCreationDate', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* File ID */}
          <div>
            <label style={labelStyle}>File ID</label>
            <input type="text"
              value={filters.fileId}
              onChange={(e) => onFilterChange('fileId', e.target.value)}
              placeholder="Enter File ID"
              style={inputStyle}
            />
          </div>

          {/* Msg ID */}
          <div>
            <label style={labelStyle}>Msg ID</label>
            <input type="text"
              value={filters.msgId}
              onChange={(e) => onFilterChange('msgId', e.target.value)}
              placeholder="Enter Msg ID"
              style={inputStyle}
            />
          </div>

        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '10px',
        padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc'
      }}>
        <button onClick={onReset} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', background: '#f1f5f9', color: '#475569',
          border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600
        }}>
          <RotateCcw size={14} />
          Reset
        </button>
        <button onClick={onApply} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', background: '#667eea', color: 'white',
          border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600
        }}>
          <Search size={14} />
          Apply Filters
        </button>
      </div>
    </motion.div>
  );
};

export default DtcFilterDropdown;
