// IMPORTANT (Ticket 50197): From Role, From MPID, To Role, To MPID must remain as
// four SEPARATE columns in ALL export types (Excel, PDF, CSV, Email).
// Do NOT merge them into combined columns like "From Role + From MPID".
export const DTC_SUMMARY_COLUMNS_COMBINED_FLOW = [
  { key: 'flow', label: 'Flow' },
  { key: 'version', label: 'Version' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp' },
  { key: 'fromRole', label: 'From Role' },       // separate — do not merge
  { key: 'fromMPID', label: 'From MPID' },       // separate — do not merge
  { key: 'toRole', label: 'To Role' },           // separate — do not merge
  { key: 'toMPID', label: 'To MPID' },           // separate — do not merge
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];

export const DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION = [
  { key: 'flow', label: 'Flow' },
  { key: 'version', label: 'Version' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];

export const DTC_SUMMARY_COLUMNS_SPLIT_FLOW = [
  { key: 'flow', label: 'Flow' },
  { key: 'version', label: 'Version' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];

export const DTC_SUMMARY_COLUMNS_SPLIT_FLOW_VERSION = [
  { key: 'flow', label: 'Flow' },
  { key: 'version', label: 'Version' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];

export const DTC_AUDIT_DETAIL_SUMMARY_FIELDS = [
  { key: 'flow', label: 'Flow' },
  { key: 'version', label: 'Version' },
  { key: 'fileId', label: 'File ID' },
  { key: 'timestamp', label: 'Event Timestamp', format: 'datetime' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'sourceApplication', label: 'Source' },
  { key: 'application', label: 'Destination' },
  { key: 'status', label: 'Status' },
  { key: 'fileName', label: 'Source File Name' },
  { key: 'eventId', label: 'Message ID' },
];
