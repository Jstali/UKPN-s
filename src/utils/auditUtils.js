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
    fromMPID: parts[5] || '',
    toRole: parts[4] || '',
    toMPID: parts[3] || '',
    recApp: parts[6] || '',
  };
};

// Format flow version: D0132001 → D0132 001
export const formatFlowVersion = (flowVersion) => {
  if (!flowVersion || flowVersion === 'UNKNOWN') return '';
  // Match pattern: letters followed by digits, split at last 3 digits
  const match = flowVersion.match(/^([A-Z]+\d{4})(\d{3})$/);
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

// Format date with time (DD-MM-YYYY HH:MM:SS) - Always in UK/London timezone
export const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};
