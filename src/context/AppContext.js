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
import { DTC_PAGE_SIZE, NON_DTC_PAGE_SIZE } from '../constants/apiConfig';

const AppContext = createContext(null);

// DTC auto-refresh: only page 1 — avoids re-fetching large datasets every minute
const AUTO_REFRESH_INTERVAL_MS = 60_000;

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

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (!savedUser) return;
    try { setUser(JSON.parse(savedUser)); }
    catch { sessionStorage.removeItem('user'); }
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

      // Non-DTC page 1 — show immediately
      commitNonDtcData(nonDtcRecords);
      setLoading(false);

      // Background: continue paginating Non-DTC only (DTC is user-driven)
      let nonDtcToken = nonDtcFirst?.continuationToken || null;
      while (nonDtcToken && !controller.signal.aborted) {
        const page      = await api.fetchNonDtcAuditData(nonDtcToken, NON_DTC_PAGE_SIZE, { signal: controller.signal });
        if (controller.signal.aborted) break;
        const newRows   = Array.isArray(page?.data) ? page.data : [];
        nonDtcRecords.push(...newRows);
        nonDtcToken     = page?.continuationToken || null;
        if (newRows.length > 0) commitNonDtcData([...nonDtcRecords]);
      }

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

  // ── On mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
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
  }, [fetchAllData, fetchSubscriptions, fetchFlowsData, fetchFileStatus]);

  // ── Auto-refresh ────────────────────────────────────────────────────────────
  // Silently re-fetches DTC page 1 only — resets pagination state so "Load More"
  // starts fresh. Avoids re-fetching the full (potentially large) dataset.
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!autoRefresh) return undefined;

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
  }, [autoRefresh, fetchAllData, fetchFileStatus]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback((userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    if (activeControllerRef.current) activeControllerRef.current.abort();
    setUser(null);
    setAuditData([]);
    setNonDtcAuditData([]);
    setSubscriptionData([]);
    setDtcHasMore(false);
    setDtcContinuationToken(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem(DTC_CACHE_KEY);
    localStorage.removeItem(NON_DTC_CACHE_KEY);
  }, []);

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
    // Non-DTC audit data
    nonDtcAuditData,
    nonDtcFetchError,
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
