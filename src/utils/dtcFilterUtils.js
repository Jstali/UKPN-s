// DTC audit filter logic.
// Applies user-selected filter criteria to the flat array of DTC event rows
// produced by flattenUtils.js. Each filter is optional — skipped when value
// is falsy or 'All'. Multi-select filters use comma-separated strings.

// Normalise a filter value for case-insensitive comparison
const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase();

// Prefer rawTimestamp (original ISO string from API) over the formatted display
// timestamp for accurate date comparisons — formatted strings like "28/04/2026 10:00:00"
// don't parse reliably with new Date()
const getTimestamp = (row) => row.rawTimestamp || row.timestamp || '';

/**
 * Applies DTC audit filters to a flat array of event rows.
 *
 * Expects filters with keys: sourceApplication, destinationApplication,
 * eventType, flow, version, fromRole, fromMPID, toRole, toMPID,
 * fileId, msgId, eventTimestampFrom, eventTimestampTo,
 * fileCreationDate, publishDate.
 *
 * Rows must have: sourceApplication, application, eventType, flow,
 * version, fromRole, fromMPID, toRole, toMPID, fileId, eventId,
 * and either rawTimestamp or timestamp for date-based filters.
 */
export const applyDtcFilters = (results, filters) => {
  let filtered = [...results];  // copy — do not mutate the original array

  // ── Source Application ──────────────────────────────────────────────────
  // Multi-select: comma-separated list of selected application names
  if (filters.sourceApplication && filters.sourceApplication !== 'All') {
    const selected = filters.sourceApplication.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r.sourceApplication)));
  }

  // ── Destination Application ─────────────────────────────────────────────
  if (filters.destinationApplication && filters.destinationApplication !== 'All') {
    const selected = filters.destinationApplication.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r.application)));
  }

  // ── Generic multi-select fields ─────────────────────────────────────────
  // All of these follow the same pattern: comma-separated values, case-insensitive match.
  // The *combined* keys (flowVersion, fromRoleMPID, toRoleMPID) drive the Business-role
  // merged-column view; they're additive — non-business filters keep the split keys.
  const fieldFilters = [
    'eventType', 'flow', 'version', 'fromRole', 'fromMPID', 'toRole', 'toMPID',
    'flowVersion', 'fromRoleMPID', 'toRoleMPID',
  ];
  fieldFilters.forEach(key => {
    if (filters[key] && filters[key] !== 'All') {
      const selected = filters[key].split(',').map(normalizeFilterValue).filter(Boolean);
      filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r[key])));
    }
  });

  // ── File ID ─────────────────────────────────────────────────────────────
  // Uses hFileId (human-readable File ID) rather than the internal `fileId`
  if (filters.fileId && filters.fileId !== 'All') {
    const selected = filters.fileId.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => r.hFileId && selected.includes(normalizeFilterValue(r.hFileId)));
  }

  // ── Message / Event ID ──────────────────────────────────────────────────
  // Substring match — the user may type a partial event ID
  if (filters.msgId) {
    filtered = filtered.filter(r => r.eventId && r.eventId.includes(filters.msgId));
  }

  // ── Event Timestamp From ────────────────────────────────────────────────
  // Filters to rows where the event occurred ON OR AFTER the selected date/time
  if (filters.eventTimestampFrom) {
    const from = new Date(filters.eventTimestampFrom);
    filtered = filtered.filter(r => {
      const ts = getTimestamp(r);
      return ts && new Date(ts) >= from;
    });
  }

  // ── Event Timestamp To ──────────────────────────────────────────────────
  // Filters to rows where the event occurred ON OR BEFORE the selected date/time
  if (filters.eventTimestampTo) {
    const to = new Date(filters.eventTimestampTo);
    filtered = filtered.filter(r => {
      const ts = getTimestamp(r);
      return ts && new Date(ts) <= to;
    });
  }

  // ── File Creation Date ───────────────────────────────────────────────────
  // Matches rows where the event date equals the selected calendar date (YYYY-MM-DD)
  if (filters.fileCreationDate) {
    filtered = filtered.filter(r => {
      const ts = getTimestamp(r);
      if (!ts) return false;
      return new Date(ts).toISOString().split('T')[0] === filters.fileCreationDate;
    });
  }

  // ── Publish Date ─────────────────────────────────────────────────────────
  // Special: only applies to rows whose eventType is "Published".
  // Filters to Published events that occurred on the selected calendar date.
  if (filters.publishDate) {
    filtered = filtered.filter(r => {
      if (r.eventType !== 'Published') return false;
      const ts = getTimestamp(r);
      if (!ts) return false;
      return new Date(ts).toISOString().split('T')[0] === filters.publishDate;
    });
  }

  return filtered;
};
