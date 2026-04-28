// Generic filter-state hook shared by DTC and Non-DTC audit pages.
// Responsibilities:
//   1. Manages the filter form state (what the user is typing)
//   2. Applies filters to produce a results array
//   3. Persists filter state to sessionStorage so returning from a detail page
//      restores the previous query automatically
//   4. Restores scroll position after navigating back from a detail page

import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionGet, sessionSet, sessionDel } from '../utils/storageUtils';

/**
 * @param {object}   defaultFilters  – shape of the empty/default filter object (used for reset)
 * @param {string}   storageKey      – sessionStorage key prefix (e.g. 'dtcAudit')
 *                                     Actual keys become: 'dtcAudit_filters', 'dtcAudit_queried', 'dtcAudit_scroll'
 * @param {function} applyFn         – (filters) => filteredResults array; called on apply and on restore
 * @param {any[]}    dataDeps         – dependency values that must be truthy/non-empty before restoring
 *                                     saved filters (e.g. [auditData] — don't restore until data has loaded)
 */
export const useAuditFilters = (defaultFilters, storageKey, applyFn, dataDeps = []) => {
  const [filters,         setFilters]         = useState(defaultFilters);
  const [appliedFilters,  setAppliedFilters]  = useState(null);     // null = no query run yet
  const [filteredResults, setFilteredResults] = useState([]);
  const [hasQueried,      setHasQueried]      = useState(false);    // controls column set and "results" messaging

  // Always keep the latest applyFn in a ref to avoid stale closures.
  // If we used applyFn directly in useEffect deps, the closure would capture
  // an old version of globalAuditData before data finished loading.
  const applyFnRef = useRef(applyFn);
  useEffect(() => { applyFnRef.current = applyFn; });  // update ref on every render

  // ── Session restore ──────────────────────────────────────────────────────
  // When the user navigates back from a detail page, re-apply their last filters
  // automatically so they see the same results without re-entering criteria.
  useEffect(() => {
    const saved       = sessionGet(`${storageKey}_filters`);   // previously applied filter object
    const wasQueried  = sessionGet(`${storageKey}_queried`);   // whether a query was active

    if (saved && wasQueried) {
      setFilters(saved);
      // Only restore results if all data dependencies have loaded.
      // dataDeps is typically [globalAuditData] — wait for data before filtering.
      if (dataDeps.every(d => Array.isArray(d) ? d.length > 0 : !!d)) {
        setFilteredResults(applyFnRef.current(saved));
        setAppliedFilters(saved);
        setHasQueried(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dataDeps);  // re-run when data loads (dataDeps changes)

  // ── Scroll restore ───────────────────────────────────────────────────────
  // After navigating back, scroll the page to where the user was before
  useEffect(() => {
    const pos = sessionGet(`${storageKey}_scroll`);
    if (pos) {
      setTimeout(() => {
        window.scrollTo(0, pos);
        sessionDel(`${storageKey}_scroll`);  // clear after use — one-time restore
      }, 100);  // small delay ensures DOM has rendered before scrolling
    }
  }, [storageKey]);

  // Updates a single filter field without affecting others
  const updateFilter = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  // Runs the filter query and saves state to sessionStorage
  const apply = useCallback((overrideFilters) => {
    const f = overrideFilters || filters;      // allow passing filters directly (e.g. from filter page navigation)
    const results = applyFnRef.current(f);     // call the latest applyFn (avoids stale closure)
    setFilteredResults(results);
    setAppliedFilters({ ...f });               // snapshot the applied state for the SelectionCriteria panel
    setHasQueried(true);
    sessionSet(`${storageKey}_filters`, f);    // persist for session restore
    sessionSet(`${storageKey}_queried`, true);
    return results;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, storageKey]);

  // Clears all filters and results, removes session state
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
    filters,          // current (unapplied) form values
    setFilters,       // direct setter for bulk updates (e.g. navigating in with pre-set filters)
    updateFilter,     // setter for a single field
    appliedFilters,   // last-applied snapshot (shown in SelectionCriteria panel)
    filteredResults,  // rows matching the applied filters
    hasQueried,       // true after first Apply — controls column set and empty-state messaging
    apply,            // run the query
    reset,            // clear everything
  };
};
