// Single source of truth for all event type mappings across DTC and Non-DTC

export const DTC_EVENT_TYPE_MAP = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  '21': 'Invalid Flow',
  '22': 'File Transferred',
  '32': 'File Processed',
  Failed: 'Failed',
};

export const NON_DTC_EVENT_TYPE_MAP = {
  '1': 'File Pickup from Source',
  '2': 'File Stored To Blob',
  '3': 'File Subscribe',
  '4': 'File Delivered',
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

// Resolve DTC event type label from an event object
export const resolveDtcEventType = (event) => {
  const status = String(event?.Status || event?.status || '').trim();
  if (status === 'Failed') return 'Failed';
  return DTC_EVENT_TYPE_MAP[event?.Event_Type] || event?.Event_Type || 'Unknown';
};

// Resolve Non-DTC event type label, preferring description field
export const resolveNonDtcEventType = (event) => {
  const raw = String(
    event?.eventType || event?.event_type || event?.Event_Type || event?.EventType || ''
  );
  return event?.description || event?.Description || NON_DTC_EVENT_TYPE_MAP[raw] || raw;
};

// Map a raw status string to its display label
export const mapStatusDisplay = (status) => {
  const key = String(status || '').trim().toLowerCase();
  return STATUS_DISPLAY_MAP[key] || status;
};
