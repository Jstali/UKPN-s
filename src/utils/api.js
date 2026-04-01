// Local fallback subscription data
import ADMS from '../data/ADMS_DEV_V1';
import Electralink from '../data/Electralink_DEV_V1';
import MPRS from '../data/MPRS_DEV_V1';
import MSBI from '../data/application subscription';

const API_HOST = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';
const API_CODE = 'REDACTED_DTC_API_CODE_V2=';
const SAP_API_CODE = 'REDACTED_SAP_API_CODE_V2=';
const LOCAL_SUBSCRIPTIONS = [ADMS, Electralink, MPRS, MSBI];

const SUBSCRIPTION_API_CODE = 'REDACTED_SUBSCRIPTION_CODE=';
const DTC_AUDIT_API = `${API_HOST}/api/dtcAuditApi?code=${API_CODE}`;
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
    const apiUrl = `${API_HOST}/api/dtcSubscriptionApi?code=${SUBSCRIPTION_API_CODE}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(apiUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Subscription API returned ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const result = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (result.length > 0) return { data: result, isLocal: false };
    throw new Error('API returned empty data');
  } catch (error) {
    // Fall back to local data when API is unreachable or unauthorized (outside AVD)
    console.warn('[Subscriptions] API unavailable, using local data:', error.message);
    return { data: LOCAL_SUBSCRIPTIONS, isLocal: true, error: error.message };
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
        const response = await this.fetchDtcAuditData(token, 100);
        allAuditData = [...allAuditData, ...(response.data || [])];
        token = response.continuationToken || null;
      } while (token);
      const auditData = allAuditData;

      if (auditData.length === 0) {
        return [];
      }

      const appStats = new Map();

      auditData.forEach((item) => {
        const events = Array.isArray(item.events) ? item.events : [];
        const getTs = (e) => e.timestamp || e.Timestamp || e.created || e.Created || '';
        const event1 = events.find((e) => String(e.Event_Type) === '1' && getTs(e));
        const event4 = events.find((e) => String(e.Event_Type) === '4' && getTs(e));

        if (!event1 || !event4) return;

        const start = new Date(getTs(event1)).getTime();
        const end = new Date(getTs(event4)).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;

        const durationSec = (end - start) / 1000;
        // Skip anomalous durations > 1 hour (stale/mismatched event pairs)
        if (durationSec > 3600) return;

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
        const fmtTime = actual >= 60
          ? `${(actual / 60).toFixed(1)}m`
          : `${actual.toFixed(1)}s`;
        return {
          name,
          avgTime: fmtTime,
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
  async fetchDtcAuditData(continuationToken = null, pageSize = 500) {
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
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Failed to fetch audit data: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      return {
        data: Array.isArray(data.data) ? data.data : [],
        continuationToken: data.continuationToken || null,
        totalCount: data.totalCount || 0,
        pageSize: data.pageSize || pageSize,
        resultCount: data.resultCount || data.data?.length || 0,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 15s');
      }
      throw error; // propagate so callers can show error banners
    }
  },

  // Fetch Non-DTC audit data
  async fetchNonDtcAuditData(continuationToken = null, pageSize = 500) {
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
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Failed to fetch non-DTC audit data: ${res.status} ${res.statusText}`);
      const data = await res.json();

      // Handle multiple response formats
      let records = [];
      if (Array.isArray(data?.data))         records = data.data;        // { data: [] }
      else if (Array.isArray(data?.value))   records = data.value;       // OData/SAP: { value: [] }
      else if (Array.isArray(data?.records)) records = data.records;     // { records: [] }
      else if (Array.isArray(data?.items))   records = data.items;       // { items: [] }
      else if (Array.isArray(data?.results)) records = data.results;     // { results: [] }
      else if (Array.isArray(data))          records = data;             // bare array

      // Log full raw response structure on first call so we can debug field names
      console.log(`[Non-DTC API] ${records.length} records, response keys:`, Object.keys(data || {}));
      if (records.length > 0) {
        console.log('[Non-DTC API] First record fields:', Object.keys(records[0]));
        if (records[0]?.events?.length > 0) {
          console.log('[Non-DTC API] First event fields:', Object.keys(records[0].events[0]));
        }
      }

      return {
        data: records,
        continuationToken: data?.continuationToken || data?.nextLink || null,
        totalCount: data?.totalCount || data?.count || records.length,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 15s');
      }
      console.error('[Non-DTC API] Fetch failed:', error.message);
      throw error;
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
