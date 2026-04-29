// Single source of truth for all event type mappings across DTC and Non-DTC

export const DTC_EVENT_TYPE_MAP = {
  '0':  'Invalid Structure',
  '1':  'Archived',
  '2':  'Valid Subscription',
  '3':  'Subscribed',
  '4':  'NetApp Delivered',
  '5':  'Invalid Path',
  '6':  'App Inactive',
  '7':  'Invalid Subscription',
  '8':  'Checksum Mismatch',
  '9':  'Delivery Failed to NetApp',
  '21': 'Duplicate',
  '22': 'Delivered',
  '23': 'ACK Received',
  '31': 'Published',
  '32': 'ACK Generate Inbound',
  '33': 'ACK Received Inbound',
  // null = hidden: these event types are suppressed from table rows and filter options
  'File Store to Blob':   null,
  'File Stored to Blob':  null,
  'File Stored To Blob':  null,
  'file store to blob':   null,
  Failed: 'Failed',
};

export const NON_DTC_EVENT_TYPE_MAP = {
  '0':  'Invalid Structure',
  '1':  'Archived',
  '2':  'Valid Subscription',
  '3':  'Subscribed',
  '4':  'NetApp Delivered',
  '5':  'Invalid Path',
  '6':  'App Inactive',
  '7':  'Invalid Subscription',
  '8':  'Checksum Mismatch',
  '9':  'Delivery Failed to NetApp',
  '21': 'Duplicate',
  '22': 'Delivered',
  '23': 'ACK Received',
  '31': 'Published',
  '32': 'ACK Generate Inbound',
  '33': 'ACK Received Inbound',
};

// Compact label set used by the failed-files pages and DTC Audit filter dropdown.
// Diverges from DTC_EVENT_TYPE_MAP intentionally — these labels are shorter and
// match the historical UI text on those screens. Use this when you want the
// shorter "Received / Subscribed / Published / Delivered / Failed" naming.
export const FAILED_FILES_EVENT_LABELS = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed',
};

// Audit-filter variant — adds a few extra labels used only by DtcAuditFilter.
export const AUDIT_FILTER_EVENT_LABELS = {
  ...FAILED_FILES_EVENT_LABELS,
  '21': 'Invalid Flow',
  '22': 'File Transferred',
  '32': 'File Processed',
};

// Statuses that should suppress the destination application column (legacy — kept for reference)
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

// Read the descriptive Status text directly from an event object.
// Used by both DTC and Non-DTC flatteners so the Event Type column shows
// the same field source (event.Status) for every event row in either table.
// Falls back through case variants; returns '' when no status is present so
// the column simply renders empty rather than 'Unknown'.
export const getEventStatusValue = (event) => {
  if (!event || typeof event !== 'object') return '';
  const raw = event.Status ?? event.status ?? '';
  return String(raw).trim();
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

export const NON_DTC_STATUS_MAP = {
  '0': 'Pending',
  '1': 'Success',
  '2': 'Failed',
  '3': 'Duplicate',
};

// Resolve a Non-DTC status value — handles both numeric codes and pre-existing strings.
export const mapNonDtcStatus = (status) => {
  const raw = String(status ?? '').trim();
  if (raw === '') return '';
  if (raw in NON_DTC_STATUS_MAP) return NON_DTC_STATUS_MAP[raw];
  if (isNaN(Number(raw))) return raw; // already a descriptive string
  return `Unknown (code: ${raw})`;
};
