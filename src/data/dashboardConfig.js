// Dashboard configuration data - extracted from Home.jsx for cleaner code

export const NAV_CARDS = [
  {
    label: 'DTC Audit',
    path: '/dtc-audit',
    icon: 'DTC Audit.png',
    desc: 'View and manage DTC audit records & events',
  },
  {
    label: 'Non DTC Audit',
    path: '/sap-audit',
    icon: 'DTC Audit.png',
    desc: 'Non-DTC audit monitoring and records',
  },
  {
    label: 'Subscription',
    path: '/subscriptions',
    icon: 'Subscription.png',
    desc: 'Manage subscription rules & routing',
  },
];

export const FILE_STATUS_ITEMS = (auditDataLength) => [
  {
    key: 'files',
    label: 'Files Received',
    value: auditDataLength,
    iconSrc: 'File recieved.png',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    trend: '+12%',
  },
  {
    key: 'valid',
    label: 'Valid Subscriptions',
    value: 78,
    iconSrc: 'Valid subscription.png',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    trend: '+5%',
  },
  {
    key: 'subscriptions',
    label: 'Total Files Subscribed',
    value: 105,
    iconSrc: 'Subscription.png',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    trend: null,
  },
  {
    key: 'deliveries',
    label: 'Total Deliveries',
    value: 78,
    iconSrc: 'Total deliveries.png',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    trend: '+8%',
  },
  {
    key: 'pending',
    label: 'Pending Delivery',
    value: 27,
    iconSrc: 'Pending delivery.png',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    trend: '-3%',
  },
];

export const APP_STATUS_ITEMS = [
  { name: 'ADMS', env: 'DEV_V1', healthy: true, uptime: '99.9%' },
  { name: 'Electralink', env: 'DEV_V1', healthy: true, uptime: '99.7%' },
  { name: 'MPRS', env: 'DEV_V1', healthy: true, uptime: '99.8%' },
  { name: 'MSBI', env: 'DEV_V1', healthy: false, uptime: '87.2%' },
  { name: 'SAP PI', env: 'PROD', healthy: true, uptime: '99.9%' },
  { name: 'File Connect', env: 'PROD', healthy: true, uptime: '100%' },
];

export const PERFORMANCE_ITEMS = [
  { name: 'ADMS', avgTime: '1.8s', threshold: 3, actual: 1.8, files: 42 },
  { name: 'Electralink', avgTime: '2.1s', threshold: 3, actual: 2.1, files: 38 },
  { name: 'MPRS', avgTime: '1.5s', threshold: 3, actual: 1.5, files: 29 },
  { name: 'MSBI', avgTime: '2.4s', threshold: 3, actual: 2.4, files: 18 },
  { name: 'SAP PI', avgTime: '2.8s', threshold: 4, actual: 2.8, files: 56 },
];

export const DEFAULT_FILTERS = {
  application: 'All',
  eventType: 'All',
  flow: 'All',
  version: 'All',
  fromRole: 'All',
  fromMPID: 'All',
  toRole: 'All',
  toMPID: 'All',
  receivingApp: 'All',
  eventTimestampFrom: '',
  eventTimestampTo: '',
  fileCreationDate: '',
  fileId: '',
  msgId: '',
  searchFileContents: '',
};

export const FILTERED_COLUMNS = [
  { key: 'flowVersion', label: 'Flow Vers' },
  { key: 'fileId', label: 'File Id' },
  { key: 'fromRole', label: 'From Role' },
  { key: 'fromMPID', label: 'From MPID' },
  { key: 'toRole', label: 'To Role' },
  { key: 'toMPID', label: 'To MPID' },
  { key: 'created', label: 'Created' },
  { key: 'recApp', label: 'Rec App' },
  { key: 'fileName', label: 'File Name' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'application', label: 'Application Name' },
  { key: 'timestamp', label: 'Time Stamp' },
];

export const DEFAULT_COLUMNS_BUSINESS = [
  { key: 'id', label: 'ID' },
  { key: 'Source_FileName', label: 'File Name' },
  { key: 'Header_String', label: 'Header String' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'status', label: 'Status' },
  { key: 'application', label: 'Application' },
];

export const DEFAULT_COLUMNS_FULL = [
  { key: 'id', label: 'ID' },
  { key: 'Source_FileName', label: 'File Name' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'status', label: 'Status' },
  { key: 'application', label: 'Application' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'eventId', label: 'Event ID' },
  { key: 'destinationPath', label: 'Destination Path' },
  { key: 'destinationFileName', label: 'Destination File' },
  { key: 'Source_Path', label: 'Source Path' },
  { key: 'Header_String', label: 'Header String' },
];
