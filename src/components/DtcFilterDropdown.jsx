import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, RotateCcw, ChevronDown } from 'lucide-react';
import { parseHeader, formatFlowVersion } from '../utils/auditUtils';

// Event Type mapping
const EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed'
};

const MultiSelectDropdown = ({ label, value, options, onChange, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedValues = value === 'All' ? [] : (value ? value.split(',') : []);
  const displayText = selectedValues.length === 0 ? 'All' : 
                      selectedValues.length === 1 ? selectedValues[0] :
                      `${selectedValues.length} selected`;

  const handleToggle = (option) => {
    let newSelected;
    if (selectedValues.includes(option)) {
      newSelected = selectedValues.filter(v => v !== option);
    } else {
      newSelected = [...selectedValues, option];
    }
    onChange(newSelected.length === 0 ? 'All' : newSelected.join(','));
  };

  const handleSelectAll = () => {
    onChange('All');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '250px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          <div
            onClick={handleSelectAll}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              borderBottom: '1px solid #f1f5f9',
              background: selectedValues.length === 0 ? '#f8fafc' : '#fff',
              fontWeight: selectedValues.length === 0 ? 600 : 400
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.background = selectedValues.length === 0 ? '#f8fafc' : '#fff'}
          >
            <input
              type="checkbox"
              checked={selectedValues.length === 0}
              readOnly
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            Select All
          </div>
          {options.map(option => (
            <div
              key={option}
              onClick={() => handleToggle(option)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: '1px solid #f1f5f9',
                background: selectedValues.includes(option) ? '#eef2ff' : '#fff'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = selectedValues.includes(option) ? '#eef2ff' : '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = selectedValues.includes(option) ? '#eef2ff' : '#fff'}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                readOnly
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DtcFilterDropdown = ({ filters, auditData = [], onFilterChange, onReset, onApply }) => {
  // Extract unique values dynamically from audit data
  const uniqueValues = useMemo(() => {
    if (!auditData || auditData.length === 0) {
      return {
        sourceApplication: [],
        destinationApplication: [],
        eventType: [],
        flow: [],
        version: [],
        fromRole: [],
        fromMPID: [],
        toRole: [],
        toMPID: [],
        receivingApp: [],
      };
    }

    const values = {
      sourceApplication: new Set(),
      destinationApplication: new Set(),
      eventType: new Set(),
      flow: new Set(),
      version: new Set(),
      fromRole: new Set(),
      fromMPID: new Set(),
      toRole: new Set(),
      toMPID: new Set(),
      receivingApp: new Set(),
    };

    auditData.forEach(item => {
      const parsed = parseHeader(item.Header_String);

      if (parsed.flowVersion) {
        const formatted = formatFlowVersion(parsed.flowVersion);
        values.flow.add(formatted);
        values.version.add(formatted);
      }
      if (parsed.fromRole) values.fromRole.add(parsed.fromRole);
      if (parsed.fromMPID) values.fromMPID.add(parsed.fromMPID);
      if (parsed.toRole) values.toRole.add(parsed.toRole);
      if (parsed.toMPID) values.toMPID.add(parsed.toMPID);
      if (parsed.recApp) values.receivingApp.add(parsed.recApp);

      item.events?.forEach(event => {
        const app = event.applicationName || event.Destination_Application;
        if (app) {
          values.sourceApplication.add(app);
          values.destinationApplication.add(app);
        }
        
        // Map event types to readable names
        const eventTypeKey = event.Event_Type;
        const eventTypeName = EVENT_TYPE_MAP[eventTypeKey] || eventTypeKey;
        if (event.Status === 'Failed') {
          values.eventType.add('Failed');
        } else if (eventTypeName) {
          values.eventType.add(eventTypeName);
        }
      });
    });

    // Convert sets to sorted arrays
    return Object.fromEntries(
      Object.entries(values).map(([key, set]) => [key, Array.from(set).sort()])
    );
  }, [auditData]);

  // Reordered fields based on priority
  const orderedFields = [
    { label: 'Flow', field: 'flow' },
    { label: 'Version', field: 'version' },
    { label: 'From Role', field: 'fromRole' },
    { label: 'From MPID', field: 'fromMPID' },
    { label: 'To Role', field: 'toRole' },
    { label: 'To MPID', field: 'toMPID' },
    { label: 'Source Application', field: 'sourceApplication' },
    { label: 'Destination Application', field: 'destinationApplication' },
    { label: 'Event Type', field: 'eventType' },
    { label: 'Receiving App', field: 'receivingApp' },
  ];

  const labelStyle = { fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' };
  const selectStyle = {
    width: '100%', padding: '5px 8px', border: '1.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '12px', color: '#1e293b',
    background: '#fff', cursor: 'pointer', outline: 'none'
  };
  const inputStyle = {
    width: '100%', padding: '5px 8px', border: '1.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '12px', outline: 'none'
  };
  const smallInputStyle = {
    flex: 1, padding: '5px 6px', border: '1.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '11px', outline: 'none'
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'white', borderRadius: '8px',
        border: '1px solid #e5e7eb', overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        maxHeight: '65vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Filter Fields - Compact Layout with Priority Grouping */}
      <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
        {/* Priority Group 1: Most Used Filters */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Filters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
            {orderedFields.slice(0, 6).map(({ label, field }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <MultiSelectDropdown
                  label={label}
                  value={filters[field]}
                  options={uniqueValues[field] || []}
                  onChange={(value) => onFilterChange(field, value)}
                  style={selectStyle}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Priority Group 2: Secondary Filters */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Additional Filters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
            {orderedFields.slice(6).map(({ label, field }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <MultiSelectDropdown
                  label={label}
                  value={filters[field]}
                  options={uniqueValues[field] || []}
                  onChange={(value) => onFilterChange(field, value)}
                  style={selectStyle}
                />
              </div>
            ))}

            {/* Event Timestamp From */}
            <div>
              <label style={labelStyle}>Event From</label>
              <div style={{ display: 'flex', gap: '3px' }}>
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
              <label style={labelStyle}>Event To</label>
              <div style={{ display: 'flex', gap: '3px' }}>
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
              <label style={labelStyle}>File Created</label>
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
                placeholder="File ID"
                style={inputStyle}
              />
            </div>

            {/* Message ID */}
            <div>
              <label style={labelStyle}>Message ID</label>
              <input type="text"
                value={filters.msgId}
                onChange={(e) => onFilterChange('msgId', e.target.value)}
                placeholder="Message ID"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '8px',
        padding: '8px 14px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
        flexShrink: 0
      }}>
        <button onClick={onReset} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', background: '#f1f5f9', color: '#475569',
          border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600
        }}>
          <RotateCcw size={13} />
          Reset
        </button>
        <button onClick={onApply} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', background: '#667eea', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600
        }}>
          <Search size={13} />
          Apply Filters
        </button>
      </div>
    </motion.div>
  );
};

export default DtcFilterDropdown;
