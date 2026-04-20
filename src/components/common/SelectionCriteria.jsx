import React from 'react';
import { motion } from 'framer-motion';

/**
 * Displays applied filter criteria and a result count summary.
 * Replaces the 50-line identical block copy-pasted in DtcAudit.jsx and NonDtcAudit.jsx.
 *
 * Props:
 *   appliedFilters  – the active filter object
 *   criteriaFields  – [{ label, key }] defining which fields to show
 *   resultCount     – number of matched records
 *   entityLabel     – e.g. "DTC audit" | "Non-DTC audit"
 */
const SelectionCriteria = ({ appliedFilters, criteriaFields, resultCount, entityLabel = 'audit' }) => {
  const activeCriteria = criteriaFields.filter(({ key }) => {
    const v = appliedFilters?.[key];
    return v && v !== 'All' && v !== '';
  });

  if (!activeCriteria.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px',
        marginBottom: '8px', overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
          Your Selection Criteria is
        </h3>
      </div>

      {/* Criteria grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6px 16px', padding: '10px 16px',
      }}>
        {activeCriteria.map(({ label, key }) => {
          const value = String(appliedFilters[key]).replace('T', ' ');
          return (
            <div key={key} style={{ fontSize: '12px', color: '#475569', padding: '2px 0' }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{label}:</span>{' '}{value}
            </div>
          );
        })}
      </div>

      {/* Result count footer */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid #f1f5f9',
        textAlign: 'center', fontSize: '12px', color: '#475569',
      }}>
        {resultCount === 0
          ? `No ${entityLabel} records found matching your criteria`
          : <>Found <span style={{ fontWeight: 700, color: '#10b981' }}>{resultCount}</span>{' '}
              {entityLabel} record{resultCount !== 1 ? 's' : ''} matching your criteria</>
        }
      </div>
    </motion.div>
  );
};

export default SelectionCriteria;
