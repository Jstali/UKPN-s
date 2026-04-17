import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const MultiSelectDropdown = ({ label, value, options, onChange, style, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
    if (!isOpen) setSearchQuery('');
  }, [isOpen, searchable]);

  const selectedValues = value === 'All' ? [] : (value ? value.split(',') : []);
  const displayText = selectedValues.length === 0 ? 'All' :
                      selectedValues.length === 1 ? selectedValues[0] :
                      `${selectedValues.length} selected`;

  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

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
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } if (e.key === 'Escape') setIsOpen(false); }}
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
        <div
          role="listbox"
          aria-multiselectable="true"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
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
            zIndex: 1000,
            minWidth: '160px',
          }}
        >
          {searchable && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={`Search ${label}...`}
                aria-label={`Search ${label}`}
                style={{
                  width: '100%', padding: '4px 8px', border: '1px solid #e2e8f0',
                  borderRadius: '4px', fontSize: '11px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          )}
          <div
            onClick={handleSelectAll}
            role="option"
            aria-selected={selectedValues.length === 0}
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
            All
          </div>
          {searchable && searchQuery && filteredOptions.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              No matches
            </div>
          )}
          {filteredOptions.map(option => (
            <div
              key={option}
              onClick={() => handleToggle(option)}
              role="option"
              aria-selected={selectedValues.includes(option)}
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

export default MultiSelectDropdown;
