// Unified API service.
// All endpoints resolve to the Express proxy (server.js), which injects
// Azure function codes server-side. No codes ever reach the browser bundle.

import { ENDPOINTS, AUDIT_PAGE_SIZE, DTC_PAGE_SIZE, NON_DTC_PAGE_SIZE } from '../constants/apiConfig';
import { fetchJson, fetchAuditPage } from './fetchUtils';

// ─── Simple reference-data endpoints ────────────────────────────────────────

export const fetchDropdownValues = () =>
  fetchJson(
    ENDPOINTS.dropdownValues,
    'Dropdown Values',
    (d) => ({
      fromRole: Array.isArray(d.From_Role) ? d.From_Role : [],
      fromMPID: Array.isArray(d.From_MPID) ? d.From_MPID : [],
      toRole:   Array.isArray(d.To_Role)   ? d.To_Role   : [],
      toMPID:   Array.isArray(d.To_MPID)   ? d.To_MPID   : [],
    }),
  ).then(r => r.data || { fromRole: [], fromMPID: [], toRole: [], toMPID: [] });

export const fetchFlows = () =>
  fetchJson(
    ENDPOINTS.flows,
    'Flows',
    (d) => {
      const flows = d['DTC-flows'] || d.flows || d.data || (Array.isArray(d) ? d : []);
      console.log(`  └─ ${flows.length} flows`);
      return flows;
    },
  ).then(r => ({ data: r.data ?? [], error: r.error }));

export const fetchSourceApplications = () =>
  fetchJson(
    ENDPOINTS.sourceApps,
    'Source Applications',
    (d) => d['source-applications'] || d.applications || d.data || (Array.isArray(d) ? d : []),
  ).then(r => r.data ?? []);

export const fetchDestinationApplications = () =>
  fetchJson(
    ENDPOINTS.destApps,
    'Destination Applications',
    (d) => d['destination-applications'] || d.applications || d.data || (Array.isArray(d) ? d : []),
  ).then(r => r.data ?? []);

export const fetchApplicationStatus = () =>
  fetchJson(ENDPOINTS.appStatus, 'Application Status').then(r => r.data);

export const fetchDtcSubscriptions = () =>
  fetchJson(
    ENDPOINTS.subscription,
    'Subscriptions',
    (d) => (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []),
  ).then(r => ({ data: r.data ?? [], isLocal: false, error: r.error }));

// File status summary — totalFiles, successFiles, pendingFiles
export const fetchFileStatusSummary = () =>
  fetchJson(
    ENDPOINTS.fileStatusSummary,
    'File Status Summary',
    (d) => ({
      totalFiles:   d?.totalFiles   ?? null,
      successFiles: d?.successFiles ?? null,
      pendingFiles: d?.pendingFiles ?? null,
    }),
  ).then(r => ({ data: r.data ?? { totalFiles: null, successFiles: null, pendingFiles: null }, error: r.error }));

// POST — sends styled HTML email with Excel attachment for DTC or SAP audit data
export const sendAuditExportEmail = (payload) => {
  console.log('📧 Audit Email Export — POST to:', ENDPOINTS.auditEmailExport);
  return fetchJson(
    ENDPOINTS.auditEmailExport,
    'Audit Email Export',
    (d) => d,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
  ).then(r => ({ data: r.data, error: r.error }));
};

// ─── Paginated audit endpoints ───────────────────────────────────────────────

export const fetchDtcAuditData = (continuationToken = null, pageSize = DTC_PAGE_SIZE, options = {}) =>
  fetchAuditPage(ENDPOINTS.dtcAudit, 'DTC Audit', continuationToken, pageSize, options);

// Separate count API — use this instead of totalCount from the data endpoint
export const fetchDtcAuditCount = () =>
  fetchJson(ENDPOINTS.dtcAuditCount, 'DTC Audit Count', (d) => d?.count ?? d?.totalCount ?? null)
    .then(r => r.data);

export const fetchNonDtcAuditData = (continuationToken = null, pageSize = NON_DTC_PAGE_SIZE, options = {}) =>
  fetchAuditPage(ENDPOINTS.nonDtcAudit, 'Non-DTC Audit', continuationToken, pageSize, options);

// ─── File download / preview ─────────────────────────────────────────────────
// Calls the proxy; `type=nonDtc` lets server.js pick the correct Azure function code.

const authHeader = () => {
  try {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const fetchFileResponse = async (apiEndpoint, path, isNonDtc) => {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) throw new Error('Missing file path');

  const type = isNonDtc ? 'nonDtc' : 'dtc';
  const url  = `${apiEndpoint}?path=${encodeURIComponent(cleanPath)}&type=${type}`;

  const res = await fetch(url, { method: 'GET', headers: authHeader() });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const disposition = res.headers.get('content-disposition') || '';
  const match       = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
  const filename    = match ? decodeURIComponent(match[1].replace(/"/g, '')) : null;

  return { res, filename };
};

export const downloadFileByPath = async (path, isNonDtc = false) => {
  const { res, filename } = await fetchFileResponse(ENDPOINTS.downloadFile, path, isNonDtc);
  return { blob: await res.blob(), filename };
};

export const viewBlobFileByPath = async (path, isNonDtc = false) => {
  const { res, filename } = await fetchFileResponse(ENDPOINTS.viewFile, path, isNonDtc);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json    = await res.json();
    const content = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    return { content, filename };
  }
  return { content: await res.text(), filename };
};

// Default export keeps the same surface area as the original `api` object
const apiService = {
  fetchDtcAuditData,
  fetchNonDtcAuditData,
  fetchDtcSubscriptions,
  fetchFileStatusSummary,
  fetchFlows,
  fetchSourceApplications,
  fetchDestinationApplications,
  fetchApplicationStatus,
  fetchDropdownValues,
  downloadFileByPath,
  viewBlobFileByPath,
};

export default apiService;
