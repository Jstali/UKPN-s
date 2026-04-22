// Generic HTTP helpers shared by all service modules.
// Eliminates the repeated try/catch/status-check pattern that appeared 6+ times in api.js.

import { AUDIT_TIMEOUT_MS } from '../constants/apiConfig';

// Reads the session token from sessionStorage and returns headers for it.
// Returns {} when no token is present so the request can still be made (e.g. /api/auth/login).
const authHeaders = () => {
  try {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

// Called whenever a proxy call returns 401. Wipes the stale token and emits
// a single window event so AppContext can log out cleanly and the user is
// sent back to the login screen instead of staring at a red error banner.
// Debounced via a module flag so parallel 401s only produce one dispatch.
let _authExpiredNotified = false;
const notifyAuthExpired = () => {
  if (_authExpiredNotified) return;
  _authExpiredNotified = true;
  // Reset on the next tick so future expirations (e.g. after re-login) still fire.
  setTimeout(() => { _authExpiredNotified = false; }, 1000);
  try {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new Event('auth:expired'));
  } catch { /* non-browser environments */ }
};

// Appends a query parameter to a URL, picking ? or & based on existing query string.
const appendParam = (url, key, value) => {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
};

// Creates an AbortController that times out after `timeoutMs` and optionally
// chains an external abort signal. Returns { signal, cleanup }.
export const withTimeoutSignal = (externalSignal, timeoutMs = AUDIT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId  = setTimeout(
    () => controller.abort(new DOMException('Request timeout', 'AbortError')),
    timeoutMs
  );

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  return {
    signal:  controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
};

// Simple JSON fetch with unified error handling.
// Returns { data, error } — never throws.
// `label`      → used in console logs ("Flows", "Subscriptions", …)
// `transform`  → optional fn(rawData) → normalised value
export const fetchJson = async (url, label, transform = (d) => d, options = {}) => {
  try {
    const res = await fetch(url, {
      method: 'GET',
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    if (!res.ok) {
      if (res.status === 401 && url.includes('/api/proxy/')) notifyAuthExpired();
      const text = await res.text().catch(() => '');
      console.error(`❌ ${label} API Error ${res.status}:`, text.substring(0, 200));
      throw new Error(`${label} request failed: ${res.status} ${res.statusText}`);
    }
    const raw  = await res.json();
    const data = transform(raw);
    console.log(`✅ ${label}: fetched successfully`);
    return { data, error: null };
  } catch (err) {
    console.error(`❌ ${label}:`, err.message);
    return { data: null, error: err.message };
  }
};

// Paginated Azure audit fetch with timeout + abort support.
// Returns the standard { data, continuationToken, totalCount, resultCount, error, aborted } shape.
export const fetchAuditPage = async (baseUrl, label, continuationToken, pageSize, options = {}) => {
  let cleanup = () => {};
  try {
    let url = appendParam(baseUrl, 'pageSize', pageSize);
    if (continuationToken) url = appendParam(url, 'continuationToken', continuationToken);

    const tc   = withTimeoutSignal(options.signal, options.timeoutMs);
    cleanup    = tc.cleanup;

    const res  = await fetch(url, {
      method:  'GET',
      signal:  tc.signal,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        ...authHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`❌ ${label} API Error ${res.status}:`, text.substring(0, 200));

      if (res.status === 401) {
        if (url.includes('/api/proxy/')) notifyAuthExpired();
        throw new Error(`Authentication failed for ${label}. Sign in again.`);
      }
      throw new Error(`${label} request failed: ${res.status}`);
    }

    const json    = await res.json();
    const records = Array.isArray(json.data) ? json.data : [];

    // Backend may cap the requested page size — always read from response
    const actualPageSize = json.pageSize || pageSize;
    // hasMore is the authoritative flag; fall back to presence of continuationToken
    const hasMore = json.hasMore ?? !!json.continuationToken;

    console.log(`✅ ${label}: ${records.length} records, hasMore: ${hasMore}, pageSize: ${actualPageSize}${json.pageSizeCapped ? ' (capped)' : ''}`);

    return {
      data:              records,
      continuationToken: json.continuationToken  || null,
      hasMore,
      pageSize:          actualPageSize,
      requestedPageSize: json.requestedPageSize  || pageSize,
      resultCount:       json.resultCount        ?? records.length,
      pageSizeCapped:    json.pageSizeCapped      || false,
      requestCharge:     json.requestCharge       ?? null,
      durationMs:        json.durationMs          ?? null,
      totalCount:        json.totalCount          ?? null,
      error:             null,
      aborted:           false,
    };
  } catch (err) {
    if (err?.name === 'AbortError' && options.signal?.aborted) {
      return { data: [], continuationToken: null, hasMore: false, totalCount: null, pageSize: 0, resultCount: 0, error: 'Request cancelled', aborted: true };
    }
    const message = err.name === 'AbortError'
      ? `${label} timed out after ${Math.round(AUDIT_TIMEOUT_MS / 1000)}s`
      : (err.message || `${label} request failed`);
    console.error(`❌ ${label}:`, message);
    return { data: [], continuationToken: null, hasMore: false, totalCount: null, pageSize: 0, resultCount: 0, error: message, aborted: false };
  } finally {
    cleanup();
  }
};
