// Shared utility functions — extracted from duplicate code across pages

// Parse header string: ZHV|D0132001|X|%|R|EELC|%|TR01
export const parseHeader = (headerStr) => {
  if (!headerStr || headerStr === 'UNKNOWN') {
    return { flowVersion: '', fileId: '', fromRole: '', fromMPID: '', toRole: '', toMPID: '', recApp: '' };
  }
  const parts = headerStr.split('|');
  return {
    flowVersion: parts[1] || '',
    fromRole: parts[2] || '',
    fromMPID: parts[3] || '',
    toRole: parts[4] || '',
    toMPID: parts[5] || '',
    recApp: parts[6] || '',
  };
};

// Format flow version: FDB01002 → FDB01 002 (split at last 3 digits)
export const formatFlowVersion = (flowVersion) => {
  if (!flowVersion || flowVersion === 'UNKNOWN') return '';
  // Match pattern: letters/digits followed by last 3 digits (version)
  // Examples: FDB01002 → FDB01 002, D0132001 → D0132 001
  const match = flowVersion.match(/^(.+)(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return flowVersion;
};

// Format From Role and From MPID with space: X + EELC → X EELC
export const formatFromRoleMPID = (fromRole, fromMPID) => {
  if (!fromRole && !fromMPID) return '';
  return `${fromRole || ''} ${fromMPID || ''}`.trim();
};

// Format To Role and To MPID with space: R + % → R %
export const formatToRoleMPID = (toRole, toMPID) => {
  if (!toRole && !toMPID) return '';
  return `${toRole || ''} ${toMPID || ''}`.trim();
};

// Pads a numeric version string to 3 digits (e.g. "1" → "001"); leaves
// non-numeric values unchanged.
export const normalizeVersion = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  return /^\d+$/.test(str) ? str.padStart(3, '0') : str;
};

// Resolves the flow+version string from an audit item by walking known
// field-name variants. `flowFromFilename` is an optional last-resort fallback
// used by DTC Audit filter where the flow code can be parsed from the file name.
export const deriveFlowVersion = (item, parsedFlowVersion, flowFromFilename) => {
  const direct =
    parsedFlowVersion ||
    item.Flow_Version || item.flow_version || item.flowVersion ||
    item.flow || item.FlowVersion || flowFromFilename || '';
  if (direct) return direct;

  const flowOnly = item.Flow || item.flow || '';
  const versionOnly = normalizeVersion(item.Version || item.version || '');
  if (flowOnly && versionOnly) return `${flowOnly} ${versionOnly}`;
  return flowOnly;
};

// Returns the first non-empty, non-"UNKNOWN" value from a list of candidates.
export const pick = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';

// Wildcard matching: cos* = startsWith, *cos = endsWith, *cos* = contains, plain = contains
export const wildcardMatch = (value, pattern) => {
  const val = value.toLowerCase();
  const pat = pattern.toLowerCase();
  const startsWithStar = pat.startsWith('*');
  const endsWithStar = pat.endsWith('*');
  const core = pat.replace(/^\*|\*$/g, '');
  if (!core) return true;
  if (startsWithStar && endsWithStar) return val.includes(core);
  if (startsWithStar) return val.endsWith(core);
  if (endsWithStar) return val.startsWith(core);
  return val.includes(core);
};

// Event type number-to-word mapping
export const EVENT_TYPE_LABELS = {
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
};

export const formatEventType = (value) => {
  const str = String(value);
  return EVENT_TYPE_LABELS[str] || str;
};

// Format timestamp to show only HH:MM:SS (no milliseconds or timezone)
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp; // Return original if invalid
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

// Format date with time (DD-MM-YYYY HH:MM:SS)
export const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  
  // Try parsing as UK format first (DD/MM/YYYY or DD-MM-YYYY)
  const ukMatch = String(timestamp).match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s*(\d{2}):(\d{2}):(\d{2})/);
  if (ukMatch) {
    const [, day, month, year, hours, minutes, seconds] = ukMatch;
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }
  
  // Otherwise parse as standard date
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  
  // Get date parts directly in UK timezone
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  
  const getValue = (type) => parts.find(p => p.type === type)?.value || '';
  
  const day = getValue('day');
  const month = getValue('month');
  const year = getValue('year');
  const hours = getValue('hour');
  const minutes = getValue('minute');
  const seconds = getValue('second');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};
