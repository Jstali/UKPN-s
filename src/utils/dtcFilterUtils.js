const normalizeFilterValue = (value) => String(value ?? '').trim().toLowerCase();

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
  let filtered = [...results];

  if (filters.sourceApplication && filters.sourceApplication !== 'All') {
    const selected = filters.sourceApplication.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r.sourceApplication)));
  }

  if (filters.destinationApplication && filters.destinationApplication !== 'All') {
    const selected = filters.destinationApplication.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r.application)));
  }

  const fieldFilters = ['eventType', 'flow', 'version', 'fromRole', 'fromMPID', 'toRole', 'toMPID'];
  fieldFilters.forEach(key => {
    if (filters[key] && filters[key] !== 'All') {
      const selected = filters[key].split(',').map(normalizeFilterValue).filter(Boolean);
      filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r[key])));
    }
  });

  if (filters.fileId && filters.fileId !== 'All') {
    const selected = filters.fileId.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => r.hFileId && selected.includes(normalizeFilterValue(r.hFileId)));
  }

  if (filters.msgId) {
    filtered = filtered.filter(r => r.eventId && r.eventId.includes(filters.msgId));
  }

  if (filters.eventTimestampFrom) {
    const from = new Date(filters.eventTimestampFrom);
    filtered = filtered.filter(r => {
      const ts = getTimestamp(r);
      return ts && new Date(ts) >= from;
    });
  }

  if (filters.eventTimestampTo) {
    const to = new Date(filters.eventTimestampTo);
    filtered = filtered.filter(r => {
      const ts = getTimestamp(r);
      return ts && new Date(ts) <= to;
    });
  }

  if (filters.fileCreationDate) {
    filtered = filtered.filter(r => {
      const ts = getTimestamp(r);
      if (!ts) return false;
      return new Date(ts).toISOString().split('T')[0] === filters.fileCreationDate;
    });
  }

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
