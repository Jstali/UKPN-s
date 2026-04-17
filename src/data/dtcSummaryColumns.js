// IMPORTANT (Ticket 50197): From Role, From MPID, To Role, To MPID must remain as
// four SEPARATE columns in ALL export types (Excel, PDF, CSV, Email).
// Do NOT merge them into combined columns like "From Role + From MPID".
const DTC_COL_WIDTHS = {
  flow:              65,
  version:           62,
  fileId:           130,
  timestamp:        130,
  fromRole:          72,
  fromMPID:          82,
  toRole:            68,
  toMPID:            78,
  sourceApplication: 95,
  application:      105,
  status:            88,
  fileName:         155,
  eventId:          125,
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
  w('eventId', 'Message ID'),
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
  w('eventId', 'Message ID'),
];
