// API service for connecting to the Express + Redis backend
// Toggle USE_API to switch between mock data and live backend123 stat

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

  // Audit data (cached in Redis with pagination)
  async getDtcAudit(page = 1, limit = 50) {
    if (!USE_API) return null;
    const res = await fetch(`${API_BASE}/api/audit/dtc?page=${page}&limit=${limit}`, { headers: headers() });
    return handleResponse(res);
  },

  // Fetch real audit data from Azure Function App with pagination
  async fetchDtcAuditData(continuationToken = null, pageSize = 100) {
    try {
      const baseUrl = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/dtcAuditApi';
      const code = 'code=REDACTED_KEY_2=';
      
      let apiUrl = `${baseUrl}?${code}&pageSize=${pageSize}`;
      if (continuationToken) {
        apiUrl += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }
      
      console.log('🔄 Fetching DTC Audit from Azure:', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Response status:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ API Error:', res.status, errorText);
        throw new Error(`Failed to fetch audit data: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log('✅ Raw API response:', data);

      // Return full response with pagination info
      return {
        data: Array.isArray(data.data) ? data.data : [],
        continuationToken: data.continuationToken || null,
        totalCount: data.totalCount || 0,
        pageSize: data.pageSize || pageSize,
        resultCount: data.resultCount || data.data?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error fetching audit data:', error.message);
      return {
        data: [],
        continuationToken: null,
        totalCount: 0,
        pageSize: 0,
        resultCount: 0,
      };
    }
  },

  // Fetch subscription data from Azure Function App
  async fetchDtcSubscriptions() {
    try {
      const baseUrl = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/dtcSubscriptionApi';
      const code = 'code=REDACTED_SUBSCRIPTION_API_CODE=';
      const apiUrl = `${baseUrl}?${code}`;

      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

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
  },

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
