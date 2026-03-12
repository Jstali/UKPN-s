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
