import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const MultiCheckboxDropdown = ({
  value = 'All',
  options = [],
  onChange,
  style = {},
  portalZIndex = 999,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedValues = useMemo(() => {
    if (!value || value === 'All') return [];
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }, [value]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleOption = (option) => {
    const nextSelected = selectedValues.includes(option)
      ? selectedValues.filter(v => v !== option)
      : [...selectedValues, option];
    onChange(nextSelected.length === 0 ? 'All' : nextSelected.join(','));
  };

  const displayText = selectedValues.length === 0
    ? 'All'
    : selectedValues.length === 1
      ? selectedValues[0]
      : `${selectedValues.length} selected`;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          height: '35px',
          padding: '0 10px',
          border: '1.5px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1e293b',
          background: '#fff',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {displayText}
        </span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: portalZIndex,
          }}
        >
          <button
            type="button"
            onClick={() => onChange('All')}
            style={{
              width: '100%',
              border: 'none',
              background: selectedValues.length === 0 ? '#eef2ff' : '#fff',
              borderBottom: '1px solid #f1f5f9',
              padding: '8px 10px',
              fontSize: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: selectedValues.length === 0 ? 600 : 500,
            }}
          >
            <input type="checkbox" readOnly checked={selectedValues.length === 0} />
            All
          </button>

          {options.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              style={{
                width: '100%',
                border: 'none',
                background: selectedValues.includes(option) ? '#eef2ff' : '#fff',
                borderBottom: '1px solid #f1f5f9',
                padding: '8px 10px',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input type="checkbox" readOnly checked={selectedValues.includes(option)} />
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiCheckboxDropdown;
