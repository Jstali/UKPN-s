// IMPORTANT (Ticket 50197): From Role, From MPID, To Role, To MPID must remain as
// four SEPARATE columns in ALL export types (Excel, PDF, CSV, Email).
// Do NOT merge them into combined columns like "From Role + From MPID".
const DTC_COL_WIDTHS = {
  flow:              58,
  version:           55,
  fileId:           120,
  timestamp:        120,
  fromRole:          65,
  fromMPID:          72,
  toRole:            60,
  toMPID:            68,
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
