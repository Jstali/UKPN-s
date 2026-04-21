// Single source of truth for all event type mappings across DTC and Non-DTC

export const DTC_EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'NetApp Delivered',
  '21': 'Invalid Flow',
  '22': 'Delivered',
  '32': 'File Processed',
  // null = hidden: these event types are suppressed from table rows and filter options
  'File Store to Blob':   null,
  'File Stored to Blob':  null,
  'File Stored To Blob':  null,
  'file store to blob':   null,
  Failed: 'Failed',
};

export const NON_DTC_EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': null,  // File Stored To Blob — hidden
  '3': 'Published',
  '4': 'NetApp Delivered',
};

// Statuses that should suppress the destination application column
export const STATUSES_WITHOUT_DESTINATION = new Set([
  'publish',
  'published',
  'valid subscription',
]);

// Statuses remapped for cleaner display labels
export const STATUS_DISPLAY_MAP = {
  'file delivered': 'Net App Delivered',
  'file transfer': 'Delivered',
  'file transferred': 'Delivered',
};

// Resolve DTC event type label from an event object.
// Returns null for event types that should be hidden (suppressed from table and filter).
export const resolveDtcEventType = (event) => {
  const status = String(event?.Status || event?.status || '').trim();
  if (status === 'Failed') return 'Failed';
  const key = event?.Event_Type;
  if (key in DTC_EVENT_TYPE_MAP) {
    return DTC_EVENT_TYPE_MAP[key]; // may be null (hidden)
  }
  return key || 'Unknown';
};

// Resolve Non-DTC event type label.
// Returns null for event types that should be hidden (e.g. File Stored To Blob).
export const resolveNonDtcEventType = (event) => {
  const raw = String(
    event?.eventType || event?.event_type || event?.Event_Type || event?.EventType || ''
  );
  if (raw in NON_DTC_EVENT_TYPE_MAP) {
    return NON_DTC_EVENT_TYPE_MAP[raw]; // may be null (hidden)
  }
  return event?.description || event?.Description || raw;
};

// Map a raw status string to its display label
export const mapStatusDisplay = (status) => {
  const key = String(status || '').trim().toLowerCase();
  return STATUS_DISPLAY_MAP[key] || status;
};
