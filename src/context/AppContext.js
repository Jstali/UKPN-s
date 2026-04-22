import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import api, { fetchDtcSubscriptions, fetchFlows } from '../utils/api';
import { fetchFileStatusSummary } from '../services/apiService';
import { DTC_PAGE_SIZE, NON_DTC_PAGE_SIZE, ENDPOINTS } from '../constants/apiConfig';

const AppContext = createContext(null);

// DTC auto-refresh: only page 1 — avoids re-fetching large datasets every minute.
// 5 minutes is a compromise between "see new files promptly" and "don't churn
// the browser tab every minute". On 10k+ record backends a 60s interval
// combined with flattening + filter-options recompute was enough to OOM Edge.
const AUTO_REFRESH_INTERVAL_MS = 300_000;

const DTC_CACHE_KEY     = 'fc_dtc_cache';
const NON_DTC_CACHE_KEY = 'fc_nondtc_cache';

// Limit what we persist to localStorage — avoids bloating storage with large datasets.
// Only the first page (~100 records) is cached; extra pages loaded via "Load More" are memory-only.
const MAX_CACHE_RECORDS = DTC_PAGE_SIZE;

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCache = (key, records, limit = null) => {
  try {
    const data = limit ? records.slice(0, limit) : records;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
};

export const AppProvider = ({ children }) => {
  const [user,          setUser]          = useState(null);
  const [autoRefresh,   setAutoRefresh]   = useState(true);

  // Initialise from cache so the UI renders immediately on load
  const [auditData,      setAuditData]      = useState(() => readCache(DTC_CACHE_KEY));
  const [nonDtcAuditData,setNonDtcAuditData]= useState(() => readCache(NON_DTC_CACHE_KEY));

  // Loading spinner only shown when there is no cached data at all
  const [loading, setLoading] = useState(() => {
    try { return !localStorage.getItem(DTC_CACHE_KEY); } catch { return true; }
  });

  const [dataComplete,       setDataComplete]       = useState(false);
  const [fetchError,         setFetchError]         = useState(null);
  const [nonDtcFetchError,   setNonDtcFetchError]   = useState(null);

  // DTC incremental pagination state — exposed to DtcAudit page
  const [dtcHasMore,         setDtcHasMore]         = useState(false);
  const [dtcContinuationToken,setDtcContinuationToken] = useState(null);
  const [dtcLoadingMore,     setDtcLoadingMore]     = useState(false);
  const [dtcPageMeta,        setDtcPageMeta]        = useState(null);

  // Non-DTC incremental pagination state — user-driven, mirrors the DTC pattern
  const [nonDtcHasMore,           setNonDtcHasMore]           = useState(false);
  const [nonDtcContinuationToken, setNonDtcContinuationToken] = useState(null);
  const [nonDtcLoadingMore,       setNonDtcLoadingMore]       = useState(false);

  const [subscriptionData,   setSubscriptionData]   = useState([]);
  const [subscriptionLoading,setSubscriptionLoading]= useState(false);
  const [isLocalSubscription,setIsLocalSubscription]= useState(false);
  const [subscriptionError,  setSubscriptionError]  = useState(null);
  const [flowsData,          setFlowsData]          = useState([]);

  // File status summary from dedicated count API
  const [fileStatusSummary,      setFileStatusSummary]      = useState({ totalFiles: null, successFiles: null, pendingFiles: null });
  const [fileStatusSummaryError, setFileStatusSummaryError] = useState(null);

  // Strict in-flight lock — only one fetch cycle may run at a time
  const isFetchingRef         = useRef(false);
  const activeControllerRef   = useRef(null);
  const refreshTimerRef       = useRef(null);
  const mountedRef            = useRef(false);
  const queuedFetchOptionsRef = useRef(null);
  // Tracks current auditData length so auto-refresh can decide whether to preserve loaded pages
  const auditDataRef          = useRef([]);

  // Rehydrate session on mount. Two paths:
  //   1. SWA AAD: /.auth/me returns a `clientPrincipal` on deployed SWA.
  //   2. JWT fallback: if no SWA principal, verify our own token via /api/auth/me.
  // Local dev never hits (1) because /.auth/* 404s; it skips silently and
  // falls through to the JWT path.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // --- Path 1: Azure Static Web Apps AAD ---------------------------------
      try {
        const r = await fetch('/.auth/me', { headers: { Accept: 'application/json' } });
        if (!cancelled && r.ok) {
          const body = await r.json().catch(() => null);
          const principal = body?.clientPrincipal;
          if (principal && principal.userDetails) {
            const profile = {
              username: principal.userDetails,
              // Role mapping from AAD claims is a follow-up; default to Admin.
              role: 'Admin',
              authMethod: 'aad',
            };
            setUser(profile);
            sessionStorage.setItem('user', JSON.stringify(profile));
            sessionStorage.setItem('authMethod', 'aad');
            return;
          }
        }
      } catch { /* /.auth/me not reachable (local dev) — fall through */ }

      // --- Path 2: JWT issued by our Express proxy --------------------------
      const token = sessionStorage.getItem('authToken');
      if (!token) return;
      try {
        const res = await fetch(ENDPOINTS.me, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('authMethod');
          return;
        }
        const profile = await res.json();
        setUser({ ...profile, authMethod: 'jwt' });
        sessionStorage.setItem('user', JSON.stringify(profile));
        sessionStorage.setItem('authMethod', 'jwt');
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('authMethod');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cache only the first page of DTC data to keep localStorage small
  const commitAuditData = useCallback((records) => {
    const data = Array.isArray(records) ? records : [];
    auditDataRef.current = data;
    setAuditData(data);
    writeCache(DTC_CACHE_KEY, data, MAX_CACHE_RECORDS);
  }, []);

  const commitNonDtcData = useCallback((records) => {
    const data = Array.isArray(records) ? records : [];
    setNonDtcAuditData(data);
    writeCache(NON_DTC_CACHE_KEY, data);
  }, []);

  const fetchFlowsData = useCallback(async () => {
    try {
      const { data } = await fetchFlows();
      setFlowsData(Array.isArray(data) ? data : []);
    } catch {
      setFlowsData([]);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    try {
      const { data, isLocal, error } = await fetchDtcSubscriptions();
      setSubscriptionData(Array.isArray(data) ? data : []);
      setIsLocalSubscription(Boolean(isLocal));
      if (error) setSubscriptionError(error);
    } catch (err) {
      setSubscriptionError(err.message || 'Failed to load subscriptions');
      setSubscriptionData([]);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const fetchFileStatus = useCallback(async () => {
    const { data, error } = await fetchFileStatusSummary();
    if (error) {
      setFileStatusSummaryError(error);
    } else {
      setFileStatusSummary(data);
      setFileStatusSummaryError(null);
    }
  }, []);

  // ── Main fetch ──────────────────────────────────────────────────────────────
  // DTC:     fetches page 1 ONLY — additional pages are loaded via loadMoreDtcData()
  // Non-DTC: fetches page 1 then continues paginating in background (unchanged)
  const fetchAllData = useCallback(async (options = {}) => {
    const { restart = false, silent = false } = options;

    if (isFetchingRef.current) {
      if (!restart) return false;
      queuedFetchOptionsRef.current = { restart: false, silent };
      if (activeControllerRef.current) activeControllerRef.current.abort();
      return false;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    isFetchingRef.current       = true;

    if (!silent) setLoading(true);

    try {
      // Fetch page 1 of both APIs in parallel
      const [dtcFirst, nonDtcFirst] = await Promise.all([
        api.fetchDtcAuditData(null, DTC_PAGE_SIZE,     { signal: controller.signal }),
        api.fetchNonDtcAuditData(null, NON_DTC_PAGE_SIZE, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return false;

      const dtcRecords    = Array.isArray(dtcFirst?.data)    ? dtcFirst.data    : [];
      const nonDtcRecords = Array.isArray(nonDtcFirst?.data) ? nonDtcFirst.data : [];

      setFetchError(dtcFirst?.error || null);
      setNonDtcFetchError(nonDtcFirst?.error || null);

      // DTC: store page 1 only; expose pagination state for auto-triggered load more.
      // If the user has already loaded multiple pages (silent refresh), keep their
      // dataset intact and only update the continuation token + hasMore flags.
      const userHasLoadedMore = auditDataRef.current.length > dtcRecords.length;
      if (!userHasLoadedMore) {
        commitAuditData(dtcRecords);
      }
      setDtcHasMore(dtcFirst?.hasMore ?? !!dtcFirst?.continuationToken);
      setDtcContinuationToken(dtcFirst?.continuationToken || null);
      setDtcPageMeta({
        pageSize:       dtcFirst?.pageSize,
        pageSizeCapped: dtcFirst?.pageSizeCapped,
        requestCharge:  dtcFirst?.requestCharge,
        durationMs:     dtcFirst?.durationMs,
        resultCount:    dtcRecords.length,
      });

      // Non-DTC: store page 1 only and expose pagination state.
      // Extra pages are loaded on demand via loadMoreNonDtcData().
      commitNonDtcData(nonDtcRecords);
      setNonDtcHasMore(nonDtcFirst?.hasMore ?? !!nonDtcFirst?.continuationToken);
      setNonDtcContinuationToken(nonDtcFirst?.continuationToken || null);
      setLoading(false);

      setDataComplete(true);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      const message = error?.message || 'Failed to load audit data';
      setFetchError(message);
      setNonDtcFetchError((prev) => prev || message);
      setDataComplete(true);
      return false;
    } finally {
      if (activeControllerRef.current === controller) activeControllerRef.current = null;
      isFetchingRef.current = false;
      setLoading(false);
      if (queuedFetchOptionsRef.current) {
        const queued = queuedFetchOptionsRef.current;
        queuedFetchOptionsRef.current = null;
        fetchAllData(queued);
      }
    }
  }, [commitAuditData, commitNonDtcData]);

  // ── User-triggered "Load More" for DTC ─────────────────────────────────────
  // Appends the next DTC page to state.
  // Does NOT update the localStorage cache — extra pages are memory-only to keep
  // localStorage small per backend recommendation.
  const loadMoreDtcData = useCallback(async () => {
    if (!dtcHasMore || !dtcContinuationToken || dtcLoadingMore) return;

    setDtcLoadingMore(true);
    try {
      const result    = await api.fetchDtcAuditData(dtcContinuationToken, DTC_PAGE_SIZE, {});
      if (!result || result.aborted) return;

      const newRecords = Array.isArray(result.data) ? result.data : [];

      // Append without overwriting cache; dedupe by id to handle overlap between pages
      setAuditData(prev => {
        const existingIds = new Set(prev.map(r => r.id).filter(Boolean));
        const deduped = newRecords.filter(r => !r.id || !existingIds.has(r.id));
        const merged = [...prev, ...deduped];
        auditDataRef.current = merged;
        return merged;
      });
      setDtcHasMore(result.hasMore ?? !!result.continuationToken);
      setDtcContinuationToken(result.continuationToken || null);
      setDtcPageMeta(prev => ({
        ...prev,
        pageSize:      result.pageSize,
        requestCharge: result.requestCharge,
        durationMs:    result.durationMs,
        resultCount:   (prev?.resultCount ?? 0) + newRecords.length,
      }));
      if (result.error) setFetchError(result.error);
    } catch (err) {
      setFetchError(err.message || 'Failed to load more DTC data');
    } finally {
      setDtcLoadingMore(false);
    }
  }, [dtcHasMore, dtcContinuationToken, dtcLoadingMore]);

  // ── User-triggered "Load More" for Non-DTC ─────────────────────────────────
  // Mirrors the DTC pattern: appends the next page, dedupes by id, and writes
  // the merged list back to cache so reloads still see the extended dataset.
  const loadMoreNonDtcData = useCallback(async () => {
    if (!nonDtcHasMore || !nonDtcContinuationToken || nonDtcLoadingMore) return;

    setNonDtcLoadingMore(true);
    try {
      const result = await api.fetchNonDtcAuditData(nonDtcContinuationToken, NON_DTC_PAGE_SIZE, {});
      if (!result || result.aborted) return;

      const newRecords = Array.isArray(result.data) ? result.data : [];
      setNonDtcAuditData(prev => {
        const existingIds = new Set(prev.map(r => r.id).filter(Boolean));
        const deduped = newRecords.filter(r => !r.id || !existingIds.has(r.id));
        const merged = [...prev, ...deduped];
        writeCache(NON_DTC_CACHE_KEY, merged);
        return merged;
      });
      setNonDtcHasMore(result.hasMore ?? !!result.continuationToken);
      setNonDtcContinuationToken(result.continuationToken || null);
      if (result.error) setNonDtcFetchError(result.error);
    } catch (err) {
      setNonDtcFetchError(err.message || 'Failed to load more Non-DTC data');
    } finally {
      setNonDtcLoadingMore(false);
    }
  }, [nonDtcHasMore, nonDtcContinuationToken, nonDtcLoadingMore]);

  // ── On mount (after login only) ────────────────────────────────────────────
  // Wait for `user` before hitting any /api/proxy/* route — otherwise we fire
  // unauthenticated requests during the login screen, producing noisy 401s
  // and (pre-fix) tripping the auth:expired → logout loop.
  useEffect(() => {
    if (!user) return undefined;
    if (mountedRef.current) return undefined;
    mountedRef.current = true;

    const hasCachedData = readCache(DTC_CACHE_KEY).length > 0;
    fetchAllData({ silent: hasCachedData });

    fetchSubscriptions();
    fetchFlowsData();
    fetchFileStatus();

    return () => {
      if (activeControllerRef.current) activeControllerRef.current.abort();
    };
  }, [user, fetchAllData, fetchSubscriptions, fetchFlowsData, fetchFileStatus]);

  // ── Auto-refresh ────────────────────────────────────────────────────────────
  // Silently re-fetches DTC page 1 only — resets pagination state so "Load More"
  // starts fresh. Avoids re-fetching the full (potentially large) dataset.
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!autoRefresh || !user) return undefined;

    refreshTimerRef.current = setInterval(() => {
      fetchAllData({ silent: true });
      fetchFileStatus();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, user, fetchAllData, fetchFileStatus]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback((userData) => {
    // Called by Login.jsx after a successful JWT login. AAD sign-ins take
    // the full /.auth/login/aad round-trip and land back via rehydrate, so
    // they don't pass through here.
    const profile = { ...userData, authMethod: userData.authMethod || 'jwt' };
    setUser(profile);
    sessionStorage.setItem('user', JSON.stringify(profile));
    sessionStorage.setItem('authMethod', profile.authMethod);
  }, []);

  const logout = useCallback(() => {
    const authMethod = sessionStorage.getItem('authMethod');

    if (activeControllerRef.current) activeControllerRef.current.abort();

    // JWT sessions: tell the proxy to forget the token (currently a no-op
    // server-side but keeps the API shape honest).
    if (authMethod === 'jwt') {
      const token = sessionStorage.getItem('authToken');
      if (token) {
        fetch(ENDPOINTS.logout, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }

    // Common cleanup — both paths
    setUser(null);
    setAuditData([]);
    setNonDtcAuditData([]);
    setSubscriptionData([]);
    setDtcHasMore(false);
    setDtcContinuationToken(null);
    setNonDtcHasMore(false);
    setNonDtcContinuationToken(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authMethod');
    localStorage.removeItem(DTC_CACHE_KEY);
    localStorage.removeItem(NON_DTC_CACHE_KEY);
    mountedRef.current = false;

    // AAD sessions: bounce to SWA logout endpoint. This drops the session
    // cookie on the SWA side and lands the user back on /login.
    if (authMethod === 'aad') {
      window.location.href = '/.auth/logout?post_logout_redirect_uri=/login';
    }
  }, []);

  // fetchUtils emits 'auth:expired' when any proxy call returns 401
  // (stale/expired JWT). Clear local state so the app routes back to login
  // instead of hammering the API with a dead token.
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [logout]);

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    autoRefresh,
    setAutoRefresh,
    // DTC audit data
    auditData,
    loading,
    dataComplete,
    fetchError,
    fetchAllData,
    // DTC incremental pagination
    dtcHasMore,
    dtcLoadingMore,
    dtcPageMeta,
    loadMoreDtcData,
    // Non-DTC audit data + user-gated pagination
    nonDtcAuditData,
    nonDtcFetchError,
    nonDtcHasMore,
    nonDtcLoadingMore,
    loadMoreNonDtcData,
    // Flows (pre-fetched on mount — used by DtcFilterDropdown to avoid timing race)
    flowsData,
    // Subscriptions
    subscriptionData,
    subscriptionLoading,
    isLocalSubscription,
    subscriptionError,
    fetchSubscriptions,
    // File status summary (totalFiles, successFiles, pendingFiles)
    fileStatusSummary,
    fileStatusSummaryError,
  }), [
    user, login, logout,
    autoRefresh,
    auditData, loading, dataComplete, fetchError, fetchAllData,
    dtcHasMore, dtcLoadingMore, dtcPageMeta, loadMoreDtcData,
    nonDtcAuditData, nonDtcFetchError,
    nonDtcHasMore, nonDtcLoadingMore, loadMoreNonDtcData,
    flowsData,
    subscriptionData, subscriptionLoading, isLocalSubscription, subscriptionError, fetchSubscriptions,
    fileStatusSummary, fileStatusSummaryError,
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
