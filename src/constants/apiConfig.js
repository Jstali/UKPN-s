// Centralised API configuration — all endpoints point at the Express proxy.
// The proxy (server.js) injects Azure function codes server-side, so no
// REACT_APP_*_API_CODE vars are read here and none are bundled into the browser.

// Default behaviour:
//   npm run build (NODE_ENV=production)  → same-origin relative URLs ("/api/…").
//     SWA routes /api/* to the linked backend App Service automatically.
//   npm start      (NODE_ENV=development) → http://localhost:4000 (local proxy).
// Override with REACT_APP_API_URL at build/run time if you need something else.
const isProd = process.env.NODE_ENV === 'production';
const DEFAULT_API_BASE = isProd ? '' : 'http://localhost:4000';
export const API_BASE = process.env.REACT_APP_API_URL || DEFAULT_API_BASE;

const proxy = (path) => `${API_BASE}${path}`;

export const ENDPOINTS = {
  // Auth
  login:             proxy('/api/auth/login'),
  logout:            proxy('/api/auth/logout'),
  me:                proxy('/api/auth/me'),

  // Paginated audit
  dtcAudit:          proxy('/api/proxy/dtcAudit'),
  dtcAuditCount:     proxy('/api/proxy/dtcAuditCount'),
  nonDtcAudit:       proxy('/api/proxy/sapAudit'),

  // Reference data
  subscription:      proxy('/api/proxy/subscriptions'),
  flows:             proxy('/api/proxy/flows'),
  sourceApps:        proxy('/api/proxy/sourceApps'),
  destApps:          proxy('/api/proxy/destApps'),
  dropdownValues:    proxy('/api/proxy/dropdown'),

  // Real-time
  appStatus:         proxy('/api/proxy/appStatus'),
  fileStatusSummary: proxy('/api/proxy/fileStatusSummary'),

  // Email export
  auditEmailExport:  proxy('/api/proxy/auditEmailExport'),

  // File blob streaming
  downloadFile:      proxy('/api/proxy/downloadFile'),
  viewFile:          proxy('/api/proxy/viewFile'),
};

export const AUDIT_TIMEOUT_MS  = 60_000;
export const DTC_PAGE_SIZE     = 100;
export const NON_DTC_PAGE_SIZE = 200;
export const AUDIT_PAGE_SIZE   = 200;
