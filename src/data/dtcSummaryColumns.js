// IMPORTANT (Ticket 50197): From Role, From MPID, To Role, To MPID must remain as
// four SEPARATE columns in ALL export types (Excel, PDF, CSV, Email).
// Do NOT merge them into combined columns like "From Role + From MPID".
const DTC_COL_WIDTHS = {
  flow:              52,
  version:           50,
  fileId:           110,
  timestamp:        112,
  fromRole:          58,
  fromMPID:          65,
  toRole:            54,
  toMPID:            62,
  sourceApplication: 78,
  application:       85,
  status:            72,
  fileName:         130,
  eventId:          105,
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
  w('status', 'Status'),
  w('fileName', 'Source File Name'),
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
  w('status', 'Status'),
  w('fileName', 'Source File Name'),
];
