const API_HOST = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';
const DTC_API_CODE = 'REDACTED_DTC_API_CODE_V2=';
const SAP_API_CODE = 'REDACTED_SAP_API_CODE_V2=';

const DTC_AUDIT_API = `${API_HOST}/api/dtcAuditApi?code=${DTC_API_CODE}`;
const SAP_AUDIT_API = `${API_HOST}/api/sapAuditApi?code=${SAP_API_CODE}`;

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const USE_API = process.env.REACT_APP_USE_API === 'true';

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
    const apiUrl = `${API_HOST}/api/dtcSubscriptionApi?code=${DTC_API_CODE}`;

    const res = await fetch(apiUrl, { method: 'GET' });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch subscriptions: ${res.status} ${res.statusText} ${errorText}`);
    }

    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.error('Error fetching subscriptions:', error.message);
    throw error;
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
  async fetchDtcAuditData(continuationToken = null, pageSize = 100) {
    try {
      let apiUrl = `${DTC_AUDIT_API}&pageSize=${pageSize}`;
      if (continuationToken) {
        apiUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(apiUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      clearTimeout(timeout);

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
        pageSize: data.pageSize || pageSize,
        resultCount: records.length,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ DTC API: Request timeout after 15s');
      } else {
        console.error('❌ DTC API Error:', error.message);
      }
      return { data: [], continuationToken: null, totalCount: 0, pageSize: 0, resultCount: 0 };
    }
  },

  // Fetch Non-DTC audit data
  async fetchNonDtcAuditData(continuationToken = null, pageSize = 100) {
    try {
      let apiUrl = `${SAP_AUDIT_API}&pageSize=${pageSize}`;
      if (continuationToken) {
        apiUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(apiUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      clearTimeout(timeout);

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
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Non-DTC API: Request timeout after 15s');
      } else {
        console.error('❌ Non-DTC API Error:', error.message);
      }
      return { data: [], continuationToken: null, totalCount: 0 };
    }
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
