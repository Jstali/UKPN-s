// Centralised API configuration.
// All endpoints point to the local proxy server (server.js).
// The proxy server holds all Azure API codes — they never reach the browser.

const PROXY = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const API_BASE = PROXY;

// All Azure communication goes through the proxy — one place to update for deployments.
export const ENDPOINTS = {
  dtcAudit:          `${PROXY}/api/proxy/dtcAudit`,
  dtcAuditCount:     `${PROXY}/api/proxy/dtcAuditCount`,
  nonDtcAudit:       `${PROXY}/api/proxy/sapAudit`,
  subscription:      `${PROXY}/api/proxy/subscriptions`,
  flows:             `${PROXY}/api/proxy/flows`,
  sourceApps:        `${PROXY}/api/proxy/sourceApps`,
  destApps:          `${PROXY}/api/proxy/destApps`,
  appStatus:         `${PROXY}/api/proxy/appStatus`,
  dropdownValues:    `${PROXY}/api/proxy/dropdown`,
  fileStatusSummary: `${PROXY}/api/proxy/fileStatusSummary`,
  auditEmailExport:  `${PROXY}/api/proxy/auditEmailExport`,
  downloadFile:      `${PROXY}/api/proxy/downloadFile`,
  viewFile:          `${PROXY}/api/proxy/viewFile`,
};

// Timeouts
export const AUDIT_TIMEOUT_MS = 60_000;

// Page sizes
export const DTC_PAGE_SIZE     = 100;
export const NON_DTC_PAGE_SIZE = 200;
export const AUDIT_PAGE_SIZE   = 200;
