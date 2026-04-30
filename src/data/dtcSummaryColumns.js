// IMPORTANT (Ticket 50197): From Role, From MPID, To Role, To MPID must remain as
// four SEPARATE columns in ALL export types (Excel, PDF, CSV, Email).
// Do NOT merge them into combined columns like "From Role + From MPID".
// Business-role IN-APP display uses the *_BUSINESS_COMBINED variants below; exports
// continue to use the four-column variants for compliance with Ticket 50197.
const DTC_COL_WIDTHS = {
  flow:              58,
  version:           55,
  fileId:           120,
  timestamp:        120,
  fromRole:          65,
  fromMPID:          72,
  toRole:            60,
  toMPID:            68,
  flowVersion:      120,
  fromRoleMPID:     130,
  toRoleMPID:       130,
  sourceApplication: 86,
  application:       94,
  eventType:         88,
  fileName:         140,
  sourcePath:       150,
  destinationPath:  150,
  eventId:          112,
};

const w = (key, label, extra = {}) => ({ key, label, width: DTC_COL_WIDTHS[key], ...extra });

export const DTC_SUMMARY_COLUMNS_COMBINED_FLOW = [
  w('flow', 'Flow'),
  w('version', 'Version'),
  w('fileId', 'File ID'),
  w('timestamp', 'Event Timestamp'),
  w('fromRole', 'From Role'),       // separate — do not merge
  w('fromMPID', 'From MPID'),       // separate — do not merge
  w('toRole', 'To Role'),           // separate — do not merge
  w('toMPID', 'To MPID'),           // separate — do not merge
  w('sourceApplication', 'Source'),
  w('application', 'Destination'),
  w('eventType', 'Event Type'),
  w('fileName', 'Source File Name'),
  w('sourcePath', 'Source Path'),
  w('destinationPath', 'Destination Path'),
];

export const DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION = [...DTC_SUMMARY_COLUMNS_COMBINED_FLOW];

export const DTC_SUMMARY_COLUMNS_SPLIT_FLOW = [...DTC_SUMMARY_COLUMNS_COMBINED_FLOW];

export const DTC_SUMMARY_COLUMNS_SPLIT_FLOW_VERSION = [...DTC_SUMMARY_COLUMNS_COMBINED_FLOW];

export const DTC_AUDIT_DETAIL_SUMMARY_FIELDS = [
  w('flow', 'Flow'),
  w('version', 'Version'),
  w('fileId', 'File ID'),
  { ...w('timestamp', 'Event Timestamp'), format: 'datetime' },
  w('fromRole', 'From Role'),
  w('fromMPID', 'From MPID'),
  w('toRole', 'To Role'),
  w('toMPID', 'To MPID'),
  w('sourceApplication', 'Source'),
  w('application', 'Destination'),
  w('eventType', 'Event Type'),
  w('fileName', 'Source File Name'),
  w('sourcePath', 'Source Path'),
  w('destinationPath', 'Destination Path'),
];

// Business-role view: Flow+Version, From Role+MPID, To Role+MPID are merged into
// single columns/cells to match the simplified DTC Audit table for that role.
// Display only — exports continue to use the four-column variants above.
export const DTC_SUMMARY_COLUMNS_BUSINESS_COMBINED = [
  w('flowVersion', 'Flow + Version'),
  w('fileId', 'File ID'),
  w('timestamp', 'Event Timestamp'),
  w('fromRoleMPID', 'From Role + From MPID'),
  w('toRoleMPID', 'To Role + To MPID'),
  w('sourceApplication', 'Source'),
  w('application', 'Destination'),
  w('eventType', 'Event Type'),
  w('fileName', 'Source File Name'),
  w('sourcePath', 'Source Path'),
  w('destinationPath', 'Destination Path'),
];

export const DTC_AUDIT_DETAIL_SUMMARY_FIELDS_BUSINESS = [
  w('flowVersion', 'Flow + Version'),
  w('fileId', 'File ID'),
  { ...w('timestamp', 'Event Timestamp'), format: 'datetime' },
  w('fromRoleMPID', 'From Role + From MPID'),
  w('toRoleMPID', 'To Role + To MPID'),
  w('sourceApplication', 'Source'),
  w('application', 'Destination'),
  w('eventType', 'Event Type'),
  w('fileName', 'Source File Name'),
  w('sourcePath', 'Source Path'),
  w('destinationPath', 'Destination Path'),
];
