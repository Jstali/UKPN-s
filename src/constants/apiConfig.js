// Centralised API configuration — all env vars and endpoint URLs in one place.
// Import from here; never read process.env inline in service files.

const HOST =
  process.env.REACT_APP_API_HOST ||
  'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';

const code = (envKey) => process.env[envKey] || '';

export const API_HOST = HOST;

// Azure function "code" keys (auth tokens appended to query strings)
export const API_CODES = {
  dtc:              code('REACT_APP_DTC_API_CODE'),
  nonDtc:           code('REACT_APP_SAP_API_CODE'),
  subscription:     code('REACT_APP_SUBSCRIPTION_CODE'),
  flows:            code('REACT_APP_FLOWS_API_CODE'),
  sourceApp:        code('REACT_APP_SOURCE_APP_API_CODE'),
  destApp:          code('REACT_APP_DEST_APP_API_CODE'),
  appStatus:        code('REACT_APP_APP_STATUS_API_CODE'),
  dropdown:         code('REACT_APP_DROPDOWN_VALUES_API_CODE'),
  dtcDownload:      code('REACT_APP_DTC_DOWNLOAD_API_CODE'),
  dtcPreview:       code('REACT_APP_DTC_PREVIEW_API_CODE') || code('REACT_APP_DTC_DOWNLOAD_API_CODE'),
  fileStatusSummary: code('REACT_APP_FILE_STATUS_SUMMARY_CODE') || 'REDACTED_FILE_STATUS_SUMMARY_CODE=',
};

// Build a full endpoint URL including its function code
const endpoint = (path, codeKey) =>
  `${HOST}${path}?code=${API_CODES[codeKey]}`;

export const ENDPOINTS = {
  dtcAudit:          endpoint('/api/fileconnectDtcAuditData',          'dtc'),
  dtcAuditCount:     endpoint('/api/fileconnectDtcAuditDocumentCount', 'dtc'),
  nonDtcAudit:       endpoint('/api/fileconnectNonDtcAuditData',       'nonDtc'),
  subscription:      endpoint('/api/dtcSubscriptionAPI',               'subscription'),
  flows:             endpoint('/api/getFlowsAPI',                      'flows'),
  sourceApps:        endpoint('/api/getSourceAppNamesAPI',             'sourceApp'),
  destApps:          endpoint('/api/getDestinationApplicationsListAPI','destApp'),
  appStatus:         endpoint('/api/fileconnectApplicationStatus',     'appStatus'),
  dropdownValues:    endpoint('/api/getDropdownValuesAPI',             'dropdown'),
  fileStatusSummary: endpoint('/api/fileconnectFileStatusSummary',     'fileStatusSummary'),
  // POST — custom-routed as audit-export/send-email (function: fileconnectAuditExportEmail)
  auditEmailExport:  endpoint('/api/audit-export/send-email',          'fileStatusSummary'),
  downloadFile:      `${HOST}/api/fileConnectDownloadFileByID`,
  viewFile:          `${HOST}/api/fileConnectViewBlobFile`,
};

// Proxy / local dev server settings
export const API_BASE      = process.env.REACT_APP_API_URL || 'http://localhost:4000';
export const USE_PROXY     = process.env.REACT_APP_USE_API === 'true';

// Timeouts
export const AUDIT_TIMEOUT_MS = 60_000;

// Page sizes — DTC reduced per backend recommendation to avoid gateway timeouts.
// The backend may cap the requested page size; always read `pageSize` from the response.
export const DTC_PAGE_SIZE     = 100;   // Requested size for DTC audit pages
export const NON_DTC_PAGE_SIZE = 200;   // Non-DTC is unaffected by the backend change
export const AUDIT_PAGE_SIZE   = 200;   // Generic fallback (non-DTC / other uses)
