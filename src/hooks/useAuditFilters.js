// Generic filter-state hook shared by DTC and Non-DTC audit pages.
// Handles: state, apply, reset, sessionStorage persistence, and scroll restoration.

import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionGet, sessionSet, sessionDel } from '../utils/storageUtils';

/**
 * @param {object} defaultFilters  – shape of the empty/default filter object
 * @param {string} storageKey      – sessionStorage key used for persistence (e.g. 'dtcAuditFilters')
 * @param {function} applyFn      – (filters) => filteredResults array
 * @param {any[]} dataDeps        – dependency values that trigger re-applying saved filters (e.g. [auditData])
 */
export const useAuditFilters = (defaultFilters, storageKey, applyFn, dataDeps = []) => {
  const [filters,         setFilters]         = useState(defaultFilters);
  const [appliedFilters,  setAppliedFilters]  = useState(null);
  const [filteredResults, setFilteredResults] = useState([]);
  const [hasQueried,      setHasQueried]      = useState(false);

  // Always keep the latest applyFn available without putting it in dep arrays.
  // This prevents stale closures when globalAuditData loads after hook initialization.
  const applyFnRef = useRef(applyFn);
  useEffect(() => { applyFnRef.current = applyFn; });

  // Restore persisted filter state when data loads (e.g. returning from a detail page)
  useEffect(() => {
    const saved       = sessionGet(`${storageKey}_filters`);
    const wasQueried  = sessionGet(`${storageKey}_queried`);

    if (saved && wasQueried) {
      setFilters(saved);
      if (dataDeps.every(d => Array.isArray(d) ? d.length > 0 : !!d)) {
        setFilteredResults(applyFnRef.current(saved));
        setAppliedFilters(saved);
        setHasQueried(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dataDeps);

  // Restore scroll position after returning from detail
  useEffect(() => {
    const pos = sessionGet(`${storageKey}_scroll`);
    if (pos) {
      setTimeout(() => {
        window.scrollTo(0, pos);
        sessionDel(`${storageKey}_scroll`);
      }, 100);
    }
  }, [storageKey]);

  const updateFilter = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const apply = useCallback((overrideFilters) => {
    const f = overrideFilters || filters;
    const results = applyFnRef.current(f);
    setFilteredResults(results);
    setAppliedFilters({ ...f });
    setHasQueried(true);
    sessionSet(`${storageKey}_filters`, f);
    sessionSet(`${storageKey}_queried`, true);
    return results;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, storageKey]);

  const reset = useCallback(() => {
    setFilters(defaultFilters);
    setAppliedFilters(null);
    setFilteredResults([]);
    setHasQueried(false);
    sessionDel(`${storageKey}_filters`);
    sessionDel(`${storageKey}_queried`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return {
    filters,
    setFilters,
    updateFilter,
    appliedFilters,
    filteredResults,
    hasQueried,
    apply,
    reset,
  };
};
