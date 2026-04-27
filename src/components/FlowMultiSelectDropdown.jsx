import React, { useState, useEffect, useRef } from 'react';

// Compact multi-select dropdown used by the failed-files pages for the Flow filter.
// `dataAttrKey` is the unique data-attribute name used to scope outside-click
// detection so multiple instances on the same page don't collide.
const FlowMultiSelectDropdown = ({
  value,
  options,
  onChange,
  dataAttrKey = 'data-flow-multi-select',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedValues = value === 'All' ? [] : (value ? value.split(',') : []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleOption = (option) => {
    const next = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option];
    onChange(next.length === 0 ? 'All' : next.join(','));
  };

  const displayText = selectedValues.length === 0
    ? 'All'
    : selectedValues.length === 1
      ? selectedValues[0]
      : `${selectedValues.length} selected`;

  const containerProps = { [dataAttrKey]: '', ref: containerRef };

  return (
    <div {...containerProps} style={{ position: 'relative', minWidth: '140px' }}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: '4px 8px',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          fontSize: '12px',
          background: '#fff',
          cursor: 'pointer',
          minWidth: '120px',
        }}
      >
        {displayText}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '240px',
          overflowY: 'auto',
          zIndex: 999,
          minWidth: '160px',
        }}>
          <div
            onClick={() => onChange('All')}
            style={{
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9',
              background: selectedValues.length === 0 ? '#f8fafc' : '#fff',
              fontWeight: selectedValues.length === 0 ? 600 : 400,
            }}
          >
            <input type="checkbox" readOnly checked={selectedValues.length === 0} style={{ marginRight: '8px' }} />
            All
          </div>
          {options.map((option) => (
            <div
              key={option}
              onClick={() => toggleOption(option)}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                background: selectedValues.includes(option) ? '#eef2ff' : '#fff',
              }}
            >
              <input type="checkbox" readOnly checked={selectedValues.includes(option)} style={{ marginRight: '8px' }} />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlowMultiSelectDropdown;
