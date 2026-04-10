const API_HOST = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';
const DTC_API_CODE = 'REDACTED_DTC_API_CODE=';
const NON_DTC_API_CODE = 'REDACTED_SAP_API_CODE=';
const SUBSCROPTION_API = 'REDACTED_SUBSCRIPTION_CODE=';
const DOWNLOAD_FILE_API = `${API_HOST}/api/fileConnectDownloadFileByID`;
const VIEW_FILE_API = `${API_HOST}/api/fileConnectViewBlobFile`;

const DTC_AUDIT_API = `${API_HOST}/api/fileconnectDtcAuditData?code=${DTC_API_CODE}`;
const NON_DTC_AUDIT_API = `${API_HOST}/api/fileconnectNonDtcAuditData?code=${NON_DTC_API_CODE}`;

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const USE_API = process.env.REACT_APP_USE_API === 'true';
const AUDIT_API_TIMEOUT_MS = 60000;
const AUDIT_PAGE_SIZE = 100; // Reduced from 200 for safer queries

// Validate filters to prevent backend 400 errors
const validateAuditFilters = (filters = {}, options = {}) => {
  const { includeCount } = options;
  const { id, fileName, fileId, fromTimestamp, toTimestamp } = filters;

  // Rule 1: includeCount requires id OR time range
  if (includeCount && !id && (!fromTimestamp || !toTimestamp)) {
    throw new Error('includeCount requires either an "id" filter or both "fromTimestamp" and "toTimestamp"');
  }

  // Rule 2: fileName/fileId text search requires time range OR exact filter
  if ((fileName || fileId) && !id && (!fromTimestamp || !toTimestamp)) {
    throw new Error('Text search on fileName/fileId requires both "fromTimestamp" and "toTimestamp"');
  }

  return true;
};

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

export const fetchDtcSubscriptions = async (continuationToken = null, pageSize = 100) => {
  try {
    const params = new URLSearchParams();
    params.append('pageSize', pageSize);
    if (continuationToken) {
      params.append('continuationToken', continuationToken);
    }

    const apiUrl = `${API_HOST}/api/dtcSubscriptionAPI?code=${SUBSCROPTION_API}&${params.toString()}`;

    const res = await fetch(apiUrl, { method: 'GET' });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Subscription API Error ${res.status}:`, errorText.substring(0, 200));
      throw new Error(`Failed to fetch subscriptions: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const subscriptions = Array.isArray(data?.data) ? data.data : [];
    console.log(`✅ Subscriptions API: Fetched ${subscriptions.length} subscriptions, hasMore: ${data.hasMore || false}`);
    
    return { 
      data: subscriptions, 
      continuationToken: data.continuationToken || null,
      hasMore: data.hasMore || false,
      pageSize: data.pageSize || pageSize,
      resultCount: data.resultCount || subscriptions.length,
      isLocal: false 
    };
  } catch (error) {
    console.error('❌ Subscription API Error:', error.message);
    return { data: [], continuationToken: null, hasMore: false, isLocal: false, error: error.message };
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
      // Use last 24 hours time range to avoid broad query
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let allAuditData = [];
      let token = null;
      do {
        const response = await this.fetchDtcAuditData(token, 100, {
          filters: {
            fromTimestamp: yesterday.toISOString(),
            toTimestamp: now.toISOString()
          },
          includeEvents: true // Need events for performance calculation
        });
        allAuditData = [...allAuditData, ...(response.data || [])];
        token = response.continuationToken || null;
      } while (token);
      const auditData = allAuditData;

      if (auditData.length === 0) {
        return [];
      }

      const appStats = new Map();
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;

      auditData.forEach((item) => {
        const events = Array.isArray(item.events) ? item.events : [];
        const event1 = events.find((e) => String(e.Event_Type) === '1' && e.timestamp);
        const event4 = events.find((e) => String(e.Event_Type) === '4' && e.timestamp);

        if (!event1 || !event4) return;

        const start = new Date(event1.timestamp).getTime();
        const end = new Date(event4.timestamp).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;

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

  // Fetch real audit data from Azure Function App with pagination and filters
  // 
  // BACKEND RESTRICTIONS (to prevent 504 timeouts):
  // 1. includeCount=true requires 'id' filter OR narrow time range
  // 2. fileName/fileId text search requires fromTimestamp/toTimestamp OR exact filter
  // 3. Broad queries without filters may timeout on large datasets (100k+ records)
  // 4. Always use pagination with reasonable pageSize (100-200)
  async fetchDtcAuditData(continuationToken = null, pageSize = 500, options = {}) {
    let cleanup = () => {};
    try {
      // Validate filters before making request
      validateAuditFilters(options.filters, options);

      const effectivePageSize = pageSize || AUDIT_PAGE_SIZE;
      const params = new URLSearchParams();
      params.append('pageSize', effectivePageSize);
      
      if (continuationToken) {
        params.append('continuationToken', continuationToken);
      }

      // Add filter parameters if provided
      const filters = options.filters || {};
      if (filters.id) params.append('id', filters.id);
      if (filters.status) params.append('status', filters.status);
      if (filters.flow) params.append('flow', filters.flow);
      if (filters.application) params.append('application', filters.application);
      if (filters.sourceApplication) params.append('sourceApplication', filters.sourceApplication);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.fileName) params.append('fileName', filters.fileName);
      if (filters.fileId) params.append('fileId', filters.fileId);
      if (filters.fromTimestamp) params.append('fromTimestamp', filters.fromTimestamp);
      if (filters.toTimestamp) params.append('toTimestamp', filters.toTimestamp);
      
      // Optional flags
      if (options.includeEvents !== undefined) params.append('includeEvents', options.includeEvents);
      if (options.includeCount) params.append('includeCount', 'true');

      const apiUrl = `${DTC_AUDIT_API}&${params.toString()}`;

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
        
        // Handle backend validation errors (400 Bad Request)
        if (res.status === 400) {
          const errorMsg = errorText || 'Invalid query parameters';
          throw new Error(errorMsg);
        }
        
        throw new Error(`Failed to fetch audit data: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const records = Array.isArray(data.data) ? data.data : [];
      
      console.log(`✅ DTC API: Fetched ${records.length} records, hasMore: ${data.hasMore || false}`);

      return {
        data: records,
        continuationToken: data.continuationToken || null,
        totalCount: data.totalCount || 0,
        pageSize: data.pageSize || effectivePageSize,
        resultCount: data.resultCount || records.length,
        hasMore: data.hasMore || false,
        requestCharge: data.requestCharge || 0,
        filters: data.filters || {},
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

  // Fetch Non-DTC audit data with filters
  // 
  // BACKEND RESTRICTIONS (to prevent 504 timeouts):
  // 1. includeCount=true requires 'id' filter OR narrow time range
  // 2. fileName/fileId text search requires fromTimestamp/toTimestamp OR exact filter
  // 3. Broad queries without filters may timeout on large datasets (100k+ records)
  // 4. Always use pagination with reasonable pageSize (100-200)
  async fetchNonDtcAuditData(continuationToken = null, pageSize = 500, options = {}) {
    let cleanup = () => {};
    try {
      // Validate filters before making request
      validateAuditFilters(options.filters, options);

      const effectivePageSize = pageSize || AUDIT_PAGE_SIZE;
      const params = new URLSearchParams();
      params.append('pageSize', effectivePageSize);
      
      if (continuationToken) {
        params.append('continuationToken', continuationToken);
      }

      // Add filter parameters if provided
      const filters = options.filters || {};
      if (filters.id) params.append('id', filters.id);
      if (filters.status) params.append('status', filters.status);
      if (filters.flow) params.append('flow', filters.flow);
      if (filters.application) params.append('application', filters.application);
      if (filters.sourceApplication) params.append('sourceApplication', filters.sourceApplication);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.fileName) params.append('fileName', filters.fileName);
      if (filters.fileId) params.append('fileId', filters.fileId);
      if (filters.fromTimestamp) params.append('fromTimestamp', filters.fromTimestamp);
      if (filters.toTimestamp) params.append('toTimestamp', filters.toTimestamp);
      
      // Optional flags
      if (options.includeEvents !== undefined) params.append('includeEvents', options.includeEvents);
      if (options.includeCount) params.append('includeCount', 'true');

      const apiUrl = `${NON_DTC_AUDIT_API}&${params.toString()}`;

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
        
        // Handle backend validation errors (400 Bad Request)
        if (res.status === 400) {
          const errorMsg = errorText || 'Invalid query parameters';
          throw new Error(errorMsg);
        }
        
        throw new Error(`Failed to fetch non-DTC audit data: ${res.status}`);
      }
      
      const data = await res.json();
      const records = Array.isArray(data.data) ? data.data : [];
      
      console.log(`✅ Non-DTC API: Fetched ${records.length} records, hasMore: ${data.hasMore || false}`);
      
      return {
        data: records,
        continuationToken: data.continuationToken || null,
        totalCount: data.totalCount || 0,
        pageSize: data.pageSize || effectivePageSize,
        resultCount: data.resultCount || records.length,
        hasMore: data.hasMore || false,
        requestCharge: data.requestCharge || 0,
        filters: data.filters || {},
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

  async downloadFileByPath(path) {
    const cleanPath = String(path || '').trim();
    if (!cleanPath) {
      throw new Error('Missing file path');
    }

    const configuredCode = process.env.REACT_APP_DTC_DOWNLOAD_API_CODE;
    const code = configuredCode || DTC_API_CODE;
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

  async viewBlobFileByPath(path) {
    const cleanPath = String(path || '').trim();
    if (!cleanPath) {
      throw new Error('Missing file path');
    }

    const configuredCode = process.env.REACT_APP_DTC_PREVIEW_API_CODE || process.env.REACT_APP_DTC_DOWNLOAD_API_CODE;
    const code = configuredCode || DTC_API_CODE;
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
};

export default api;
