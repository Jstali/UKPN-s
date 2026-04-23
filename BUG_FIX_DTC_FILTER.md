# Bug Fix: DTC Audit Filter Issue

## Issue
When user selects filter values but doesn't click "Apply Filter", those unapplied selections were incorrectly passed to the detail page.

## Fix
Changed `onViewDetail` handler in `src/pages/DtcAudit.jsx` line 242:
- Before: `filters: appliedFilters || filters`
- After: `filters: appliedFilters || DEFAULT_FILTERS`

Now only explicitly applied filters are passed to the detail page.
