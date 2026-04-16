// API Configuration from environment variables
const API_HOST = process.env.REACT_APP_API_HOST || 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';
const DTC_API_CODE = process.env.REACT_APP_DTC_API_CODE || '';
const NON_DTC_API_CODE = process.env.REACT_APP_SAP_API_CODE || '';
const SUBSCROPTION_API = process.env.REACT_APP_SUBSCRIPTION_CODE || '';
const FLOWS_API_CODE = process.env.REACT_APP_FLOWS_API_CODE || '';
const SOURCE_APP_API_CODE = process.env.REACT_APP_SOURCE_APP_API_CODE || '';
const DEST_APP_API_CODE = process.env.REACT_APP_DEST_APP_API_CODE || '';
const APP_STATUS_API_CODE = process.env.REACT_APP_APP_STATUS_API_CODE || '';
const DOWNLOAD_FILE_API = `${API_HOST}/api/fileConnectDownloadFileByID`;
const VIEW_FILE_API = `${API_HOST}/api/fileConnectViewBlobFile`;

// Build API URLs with codes
const DTC_AUDIT_API = `${API_HOST}/api/fileconnectDtcAuditData?code=${DTC_API_CODE}`;
const NON_DTC_AUDIT_API = `${API_HOST}/api/fileconnectNonDtcAuditData?code=${NON_DTC_API_CODE}`;
const FLOWS_API = `${API_HOST}/api/getFlowsAPI?code=${FLOWS_API_CODE}`;
const SOURCE_APP_API = `${API_HOST}/api/getSourceAppNamesAPI?code=${SOURCE_APP_API_CODE}`;
const DEST_APP_API = `${API_HOST}/api/getDestinationApplicationsListAPI?code=${DEST_APP_API_CODE}`;
const APP_STATUS_API = `${API_HOST}/api/fileconnectApplicationStatus?code=${APP_STATUS_API_CODE}`;

export const fetchFlows = async () => {
  try {
    const res = await fetch(FLOWS_API, { method: 'GET' });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Flows API Error ${res.status}:`, errorText.substring(0, 200));
      throw new Error(`Failed to fetch flows: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const flows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    console.log(`✅ Flows API: Fetched ${flows.length} flows`);
    return { data: flows, error: null };
  } catch (error) {
    console.error('❌ Flows API Error:', error.message);
    return { data: [], error: error.message };
  }
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const USE_API = process.env.REACT_APP_USE_API === 'true';
const AUDIT_API_TIMEOUT_MS = 60000;
const AUDIT_PAGE_SIZE = 200;

const withTimeoutSignal = (externalSignal, timeoutMs = AUDIT_API_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timeout', 'AbortError')), timeoutMs);

  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', abortFromExternal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortFromExternal);
      }
    },
  };
};

const getToken = () => sessionStorage.getItem('authToken');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed'); 
  }
  return res.json();
};

export const fetchDtcSubscriptions = async () => {
  try {
    const apiUrl = `${API_HOST}/api/dtcSubscriptionAPI?code=${SUBSCROPTION_API}`;

    const res = await fetch(apiUrl, { method: 'GET' });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Subscription API Error ${res.status}:`, errorText.substring(0, 200));
      throw new Error(`Failed to fetch subscriptions: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const subscriptions = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    console.log(`✅ Subscriptions API: Fetched ${subscriptions.length} subscriptions`);
    return { data: subscriptions, isLocal: false };
  } catch (error) {
    console.error('❌ Subscription API Error:', error.message);
    // Return empty data instead of throwing
    return { data: [], isLocal: false, error: error.message };
  }
};

const api = {
  // Auth
  async login(username, password) {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    sessionStorage.setItem('authToken', data.token);
    return data;
  },

  async logout() {
    if (!USE_API) return;
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: headers(),
    }).catch(() => {});
    sessionStorage.removeItem('authToken');
  },

  async validateSession() {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: headers() });
    return handleResponse(res);
  },

  // Dashboard info
  async getInfo() {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/dashboard/info`, { headers: headers() });
    return handleResponse(res);
  },

  async updateInfo(info) {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/dashboard/info`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ info }),
    });
    return handleResponse(res);
  },

  // Performance data (cached in Redis)
  async getPerformance() {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/performance`, { headers: headers() });
    return handleResponse(res);
  },

  // Fetch performance data from Azure or calculate from audit data
  async fetchPerformanceData() {
    try {
      let allAuditData = [];
      let token = null;
      do {
        const response = await this.fetchDtcAuditData(token, 50);
        allAuditData = [...allAuditData, ...(response.data || [])];
        token = response.continuationToken || null;
      } while (token);
      const auditData = allAuditData;

      if (auditData.length === 0) {
        return [];
      }

      const appStats = new Map();
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours

      auditData.forEach((item) => {
        const events = Array.isArray(item.events) ? item.events : [];
        const event1 = events.find((e) => String(e.Event_Type) === '1' && e.timestamp);
        const event4 = events.find((e) => String(e.Event_Type) === '4' && e.timestamp);

        if (!event1 || !event4) return;

        const start = new Date(event1.timestamp).getTime();
        const end = new Date(event4.timestamp).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;

        // Only include files received within last 24 hours
        if (start < cutoff) return;

        const durationSec = (end - start) / 1000;
        const appName = event1.applicationName || 'Unknown';
        if (!appStats.has(appName)) {
          appStats.set(appName, { totalDuration: 0, files: 0 });
        }

        const current = appStats.get(appName);
        current.totalDuration += durationSec;
        current.files += 1;
      });

      return Array.from(appStats.entries()).map(([name, stats]) => {
        const actual = stats.files > 0 ? stats.totalDuration / stats.files : 0;
        return {
          name,
          avgTime: `${actual.toFixed(1)}s`,
          actual,
          threshold: 3,
          files: stats.files,
        };
      }).sort((a, b) => b.actual - a.actual);
    } catch (error) {
      console.error('❌ Error fetching performance data:', error.message);
      return [];
    }
  },

  // Audit data (cached in Redis with pagination)
  async getDtcAudit(page = 1, limit = 50) {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/audit/dtc?page=${page}&limit=${limit}`, { headers: headers() });
    return handleResponse(res);
  },

  // Fetch real audit data from Azure Function App with pagination
  async fetchDtcAuditData(continuationToken = null, pageSize = 500, options = {}) {
    let cleanup = () => {};
    try {
      const effectivePageSize = pageSize || AUDIT_PAGE_SIZE;
      let apiUrl = `${DTC_AUDIT_API}&pageSize=${effectivePageSize}`;
      if (continuationToken) {
        apiUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }

      const timeoutControl = withTimeoutSignal(options.signal, options.timeoutMs);
      const signal = timeoutControl.signal;
      cleanup = timeoutControl.cleanup;

      const res = await fetch(apiUrl, { 
        method: 'GET',
        signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ DTC API Error ${res.status}:`, errorText.substring(0, 200));
        throw new Error(`Failed to fetch audit data: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const records = Array.isArray(data.data) ? data.data : [];
      
      console.log(`✅ DTC API: Fetched ${records.length} records, hasMore: ${!!data.continuationToken}`);

      return {
        data: records,
        continuationToken: data.continuationToken || null,
        totalCount: data.totalCount || 0,
        pageSize: data.pageSize || effectivePageSize,
        resultCount: records.length,
        error: null,
      };
    } catch (error) {
      if (error?.name === 'AbortError' && options.signal?.aborted) {
        return { data: [], continuationToken: null, totalCount: 0, pageSize: 0, resultCount: 0, error: 'Request cancelled', aborted: true };
      }
      const message = error.name === 'AbortError'
        ? `Request timeout after ${Math.round(AUDIT_API_TIMEOUT_MS / 1000)}s`
        : (error.message || 'Failed to fetch audit data');
      if (error.name === 'AbortError') {
        console.error(`❌ DTC API: ${message}`);
      } else {
        console.error('❌ DTC API Error:', error.message);
      }
      return { data: [], continuationToken: null, totalCount: 0, pageSize: 0, resultCount: 0, error: message, aborted: false };
    } finally {
      cleanup();
    }
  },

  // Fetch Non-DTC audit data
  async fetchNonDtcAuditData(continuationToken = null, pageSize = 500, options = {}) {
    let cleanup = () => {};
    try {
      const effectivePageSize = pageSize || AUDIT_PAGE_SIZE;
      let apiUrl = `${NON_DTC_AUDIT_API}&pageSize=${effectivePageSize}`;
      if (continuationToken) {
        apiUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }

      const timeoutControl = withTimeoutSignal(options.signal, options.timeoutMs);
      const signal = timeoutControl.signal;
      cleanup = timeoutControl.cleanup;

      const res = await fetch(apiUrl, { 
        method: 'GET',
        signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Non-DTC API Error ${res.status}:`, errorText.substring(0, 200));
        throw new Error(`Failed to fetch non-DTC audit data: ${res.status}`);
      }
      
      const data = await res.json();
      const records = Array.isArray(data.data) ? data.data : [];
      
      console.log(`✅ Non-DTC API: Fetched ${records.length} records, hasMore: ${!!data.continuationToken}`);
      
      return {
        data: records,
        continuationToken: data.continuationToken || null,
        totalCount: data.totalCount || 0,
        error: null,
        aborted: false,
      };
    } catch (error) {
      if (error?.name === 'AbortError' && options.signal?.aborted) {
        return { data: [], continuationToken: null, totalCount: 0, error: 'Request cancelled', aborted: true };
      }
      const message = error.name === 'AbortError'
        ? `Request timeout after ${Math.round(AUDIT_API_TIMEOUT_MS / 1000)}s`
        : (error.message || 'Failed to fetch non-DTC audit data');
      if (error.name === 'AbortError') {
        console.error(`❌ Non-DTC API: ${message}`);
      } else {
        console.error('❌ Non-DTC API Error:', error.message);
      }
      return { data: [], continuationToken: null, totalCount: 0, error: message, aborted: false };
    } finally {
      cleanup();
    }
  },

  async downloadFileByPath(path, isNonDtc = false) {
    const cleanPath = String(path || '').trim();
    if (!cleanPath) {
      throw new Error('Missing file path');
    }

    const configuredCode = process.env.REACT_APP_DTC_DOWNLOAD_API_CODE;
    const code = isNonDtc ? NON_DTC_API_CODE : (configuredCode || DTC_API_CODE);
    const url = `${DOWNLOAD_FILE_API}?path=${encodeURIComponent(cleanPath)}${code ? `&code=${encodeURIComponent(code)}` : ''}`;

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `Download failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"/g, '')) : null;

    return { blob, filename };
  },

  async viewBlobFileByPath(path, isNonDtc = false) {
    const cleanPath = String(path || '').trim();
    if (!cleanPath) {
      throw new Error('Missing file path');
    }

    const configuredCode = process.env.REACT_APP_DTC_PREVIEW_API_CODE || process.env.REACT_APP_DTC_DOWNLOAD_API_CODE;
    const code = isNonDtc ? NON_DTC_API_CODE : (configuredCode || DTC_API_CODE);
    const url = `${VIEW_FILE_API}?path=${encodeURIComponent(cleanPath)}${code ? `&code=${encodeURIComponent(code)}` : ''}`;

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `Preview failed with status ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const disposition = res.headers.get('content-disposition') || '';
    const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"/g, '')) : null;

    if (contentType.includes('application/json')) {
      const json = await res.json();
      const content = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
      return { content, filename };
    }

    const text = await res.text();
    return { content: text, filename };
  },

  // Fetch subscription data from Azure Function App
  fetchDtcSubscriptions,

  // App status (cached in Redis)
  async getAppStatus() {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/status/apps`, { headers: headers() });
    return handleResponse(res);
  },

  // Admin
  async clearCache() {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/admin/cache/clear`, {
      method: 'POST',
      headers: headers(),
    });
    return handleResponse(res);
  },

  // Health check
  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse(res);
  },

  // Application status from Azure
  async fetchApplicationStatus() {
    try {
      const res = await fetch(APP_STATUS_API, { method: 'GET' });
      if (!res.ok) throw new Error(`Application status API error: ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error('❌ Application Status API Error:', error.message);
      return null;
    }
  },

  // Fetch flows from Azure
  async fetchFlows() {
    try {
      const res = await fetch(FLOWS_API, { method: 'GET' });
      if (!res.ok) {
        console.error(`❌ Flows API Error ${res.status}`);
        return [];
      }
      const data = await res.json();
      console.log('🔍 Flows API raw response:', data);
      
      // API returns { "DTC-flows": [...], "count": 48 }
      const flows = data['DTC-flows'] || data.flows || data.data || [];
      
      console.log(`✅ Flows API: Fetched ${flows.length} flows`, flows);
      return flows;
    } catch (error) {
      console.error('❌ Flows API Error:', error.message);
      return [];
    }
  },

  // Fetch source applications from Azure
  async fetchSourceApplications() {
    try {
      const res = await fetch(SOURCE_APP_API, { method: 'GET' });
      if (!res.ok) {
        console.error(`❌ Source App API Error ${res.status}`);
        return [];
      }
      const data = await res.json();
      console.log('🔍 Source App API raw response:', data);
      
      // Extract source apps from response (adjust based on actual structure)
      const apps = data['source-applications'] || data.applications || data.data || data || [];
      
      console.log(`✅ Source App API: Fetched ${apps.length} applications`, apps);
      return apps;
    } catch (error) {
      console.error('❌ Source App API Error:', error.message);
      return [];
    }
  },

  // Fetch destination applications from Azure
  async fetchDestinationApplications() {
    try {
      const res = await fetch(DEST_APP_API, { method: 'GET' });
      if (!res.ok) {
        console.error(`❌ Destination App API Error ${res.status}`);
        return [];
      }
      const data = await res.json();
      console.log('🔍 Destination App API raw response:', data);
      
      // Extract destination apps from response
      const apps = data['destination-applications'] || data.applications || data.data || data || [];
      
      console.log(`✅ Destination App API: Fetched ${apps.length} applications`, apps);
      return apps;
    } catch (error) {
      console.error('❌ Destination App API Error:', error.message);
      return [];
    }
  },
};

export default api;
