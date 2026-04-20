import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const MultiCheckboxDropdown = ({
  value = 'All',
  options = [],
  onChange,
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState({});
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedValues = useMemo(() => {
    if (!value || value === 'All') return [];
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }, [value]);

  const updatePopupPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopupStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 180),
      minWidth: '180px',
      zIndex: 9999,
    });
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePopupPosition();
    window.addEventListener('scroll', updatePopupPosition, true);
    window.addEventListener('resize', updatePopupPosition);
    return () => {
      window.removeEventListener('scroll', updatePopupPosition, true);
      window.removeEventListener('resize', updatePopupPosition);
    };
  }, [isOpen]);

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
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(prev => !prev)}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(prev => !prev); }
          if (e.key === 'Escape') setIsOpen(false);
        }}
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
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {displayText}
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        />
      </div>

      {isOpen && (
        <div
          role="listbox"
          style={{
            ...popupStyle,
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {/* Select All */}
          <div
            onClick={() => onChange('All')}
            role="option"
            aria-selected={selectedValues.length === 0}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              borderBottom: '1px solid #f1f5f9',
              background: selectedValues.length === 0 ? '#eef2ff' : '#fff',
              fontWeight: selectedValues.length === 0 ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = selectedValues.length === 0 ? '#eef2ff' : '#fff'}
          >
            <input type="checkbox" readOnly checked={selectedValues.length === 0} style={{ cursor: 'pointer' }} />
            All
          </div>

          {options.map(option => {
            // When "All" is selected every option is considered checked
            const isAllSelected = value === 'All' || selectedValues.length === 0;
            const isChecked = isAllSelected || selectedValues.includes(option);
            return (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                role="option"
                aria-selected={isChecked}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderBottom: '1px solid #f1f5f9',
                  background: isChecked ? '#eef2ff' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isChecked ? '#eef2ff' : '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = isChecked ? '#eef2ff' : '#fff'}
              >
                <input type="checkbox" readOnly checked={isChecked} style={{ cursor: 'pointer' }} />
                {option}
              </div>
            );
          })}

          {options.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiCheckboxDropdown;
