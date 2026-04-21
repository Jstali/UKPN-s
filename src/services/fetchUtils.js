// Generic HTTP helpers shared by all service modules.

import { AUDIT_TIMEOUT_MS } from '../constants/apiConfig';

// Reads the session token and returns an Authorization header if present.
const getAuthHeaders = () => {
  try {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
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
export const fetchJson = async (url, label, transform = (d) => d, options = {}) => {
  try {
    const { headers: extraHeaders, ...restOptions } = options;
    const res = await fetch(url, {
      method: 'GET',
      ...restOptions,
      headers: { ...getAuthHeaders(), ...(extraHeaders || {}) },
    });
    if (!res.ok) {
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

// Paginated proxy fetch with timeout + abort support.
// Returns the standard { data, continuationToken, totalCount, resultCount, error, aborted } shape.
export const fetchAuditPage = async (baseUrl, label, continuationToken, pageSize, options = {}) => {
  let cleanup = () => {};
  try {
    // Use ? separator — proxy endpoints have no query string yet
    let url = `${baseUrl}?pageSize=${pageSize}`;
    if (continuationToken) url += `&continuationToken=${encodeURIComponent(continuationToken)}`;

    const tc   = withTimeoutSignal(options.signal, options.timeoutMs);
    cleanup    = tc.cleanup;

    const res  = await fetch(url, {
      method:  'GET',
      signal:  tc.signal,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`❌ ${label} API Error ${res.status}:`, text.substring(0, 200));

      if (res.status === 401) {
        throw new Error(`Session expired. Please log in again.`);
      }
      throw new Error(`${label} request failed: ${res.status}`);
    }

    const json    = await res.json();
    const records = Array.isArray(json.data) ? json.data : [];

    const actualPageSize = json.pageSize || pageSize;
    const hasMore        = json.hasMore ?? !!json.continuationToken;

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
