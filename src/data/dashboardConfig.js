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
    path: '/non-dtc-audit',
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

export const FILE_STATUS_ITEMS = ({ filesReceived = 0, totalToBeDelivered = 0, totalDelivered = 0, pendingDelivery = 0, duplicateChecksum = 0 }) => {
  const hasPending = pendingDelivery > 0;
  
  return [
    {
      key: 'subscriptions',
      label: 'Total Files to be Delivered',
      value: totalToBeDelivered,
      iconSrc: 'Subscription.png',
      color: hasPending ? '#f59e0b' : '#16a34a',
      bgColor: hasPending ? '#fffbeb' : '#f0fdf4',
      borderColor: hasPending ? '#fcd34d' : '#bbf7d0',
      trend: null,
    },
    {
      key: 'deliveries',
      label: 'Total Files Delivered',
      value: totalDelivered,
      iconSrc: 'Total deliveries.png',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      trend: '+8%',
    },
    {
      key: 'pending',
      label: 'Total Files Pending for Delivery',
      value: pendingDelivery,
      iconSrc: 'Pending delivery.png',
      color: hasPending ? '#f59e0b' : '#16a34a',
      bgColor: hasPending ? '#fffbeb' : '#f0fdf4',
      borderColor: hasPending ? '#fcd34d' : '#bbf7d0',
      trend: '-3%',
    },
    {
      key: 'duplicate',
      label: 'Duplicate Checksum',
      value: duplicateChecksum,
      iconSrc: 'DTC Audit.png',
      color: '#8b5cf6',
      bgColor: '#faf5ff',
      borderColor: '#d8b4fe',
      trend: null,
    },
  ];
};

export const APP_STATUS_ITEMS = [
  { name: 'ADMS', env: 'DEV_V1', healthy: true },
  { name: 'Electralink', env: 'DEV_V1', healthy: true },
  { name: 'MPRS', env: 'DEV_V1', healthy: true },
  { name: 'MSBI', env: 'DEV_V1', healthy: false },
  { name: 'SAP PI', env: 'PROD', healthy: true },
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
  sourceApplication: 'All',
  destinationApplication: 'All',
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
  publishDate: '',
  fileId: 'All',
  msgId: '',
  searchFileContents: '',
};

export const FILTERED_COLUMNS = [
  { key: 'flowVersion', label: 'Flow' },
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

export const DEFAULT_COLUMNS_BUSINESS = [
  { key: 'flowVersion', label: 'Flow' },
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

export const DEFAULT_COLUMNS_FULL = [
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
