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

const AppContext = createContext(null);

const AUDIT_PAGE_SIZE = 500;
const AUTO_REFRESH_INTERVAL_MS = 60000;
const DTC_CACHE_KEY = 'fc_dtc_cache';
const NON_DTC_CACHE_KEY = 'fc_nondtc_cache';

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCache = (key, records) => {
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // Storage quota exceeded — clear and skip
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
};

// Fetch one page from a given API endpoint
const fetchOnePage = async (fetchFn, token, signal) =>
  fetchFn(token, AUDIT_PAGE_SIZE, { signal });

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialise from cache for instant display — fresh data loads in background
  const [auditData, setAuditData] = useState(() => readCache(DTC_CACHE_KEY));
  const [nonDtcAuditData, setNonDtcAuditData] = useState(() => readCache(NON_DTC_CACHE_KEY));

  // Only show loading spinner when there is no cached data to display
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(DTC_CACHE_KEY);
    } catch {
      return true;
    }
  });

  const [dataComplete, setDataComplete] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [nonDtcFetchError, setNonDtcFetchError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isLocalSubscription, setIsLocalSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [flowsData, setFlowsData] = useState([]);

  // Strict in-flight lock. Only one refresh cycle may run at a time.
  const isFetchingRef = useRef(false);
  const activeControllerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const queuedFetchOptionsRef = useRef(null);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (!savedUser) return;
    try {
      setUser(JSON.parse(savedUser));
    } catch {
      sessionStorage.removeItem('user');
    }
  }, []);

  const commitAuditData = useCallback((records) => {
    const data = Array.isArray(records) ? records : [];
    setAuditData(data);
    writeCache(DTC_CACHE_KEY, data);
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
      if (error) {
        setSubscriptionError(error);
      }
    } catch (err) {
      setSubscriptionError(err.message || 'Failed to load subscriptions');
      setSubscriptionData([]);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

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
    isFetchingRef.current = true;

    if (!silent) setLoading(true);

    try {
      // ── Step 1: Fetch first page of both APIs in parallel ──────────────────
      const [dtcFirst, nonDtcFirst] = await Promise.all([
        fetchOnePage(api.fetchDtcAuditData.bind(api), null, controller.signal),
        fetchOnePage(api.fetchNonDtcAuditData.bind(api), null, controller.signal),
      ]);

      if (controller.signal.aborted) return false;

      const dtcRecords = Array.isArray(dtcFirst?.data) ? [...dtcFirst.data] : [];
      const nonDtcRecords = Array.isArray(nonDtcFirst?.data) ? [...nonDtcFirst.data] : [];

      setFetchError(dtcFirst?.error || null);
      setNonDtcFetchError(nonDtcFirst?.error || null);

      // Show first page immediately and cache it — clears the loading spinner
      commitAuditData(dtcRecords);
      commitNonDtcData(nonDtcRecords);
      setLoading(false);

      // ── Step 2: Fetch remaining pages in background (both in parallel) ──────
      let dtcToken = dtcFirst?.continuationToken || null;
      let nonDtcToken = nonDtcFirst?.continuationToken || null;

      while ((dtcToken || nonDtcToken) && !controller.signal.aborted) {
        const pageFetches = [];

        if (dtcToken) {
          pageFetches.push(
            fetchOnePage(api.fetchDtcAuditData.bind(api), dtcToken, controller.signal)
              .then(r => ({ kind: 'dtc', ...r }))
          );
        }
        if (nonDtcToken) {
          pageFetches.push(
            fetchOnePage(api.fetchNonDtcAuditData.bind(api), nonDtcToken, controller.signal)
              .then(r => ({ kind: 'nonDtc', ...r }))
          );
        }

        const pages = await Promise.all(pageFetches);
        if (controller.signal.aborted) break;

        let dtcUpdated = false;
        let nonDtcUpdated = false;

        for (const page of pages) {
          const newRows = Array.isArray(page.data) ? page.data : [];
          if (page.kind === 'dtc') {
            dtcRecords.push(...newRows);
            dtcToken = page.continuationToken || null;
            if (newRows.length > 0) dtcUpdated = true;
          } else {
            nonDtcRecords.push(...newRows);
            nonDtcToken = page.continuationToken || null;
            if (newRows.length > 0) nonDtcUpdated = true;
          }
        }

        // Update state and cache as more data arrives
        if (dtcUpdated) commitAuditData(dtcRecords);
        if (nonDtcUpdated) commitNonDtcData(nonDtcRecords);
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
        const queuedOptions = queuedFetchOptionsRef.current;
        queuedFetchOptionsRef.current = null;
        fetchAllData(queuedOptions);
      }
    }
  }, [commitAuditData, commitNonDtcData]);

  useEffect(() => {
    if (mountedRef.current) {
      return undefined;
    }

    mountedRef.current = true;

    // If cached data exists, load silently — user sees data immediately
    const hasCachedData = readCache(DTC_CACHE_KEY).length > 0;
    fetchAllData({ silent: hasCachedData });

    // Pre-fetch subscriptions and flows so they are available everywhere on load
    fetchSubscriptions();
    fetchFlowsData();

    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [fetchAllData, fetchSubscriptions, fetchFlowsData]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!autoRefresh) {
      return undefined;
    }

    // Single interval. If a request is still in progress, the lock skips the next tick.
    refreshTimerRef.current = setInterval(() => {
      fetchAllData({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, fetchAllData]);

  const login = useCallback((userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    setUser(null);
    setAuditData([]);
    setNonDtcAuditData([]);
    setSubscriptionData([]);

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
    auditData,
    nonDtcAuditData,
    loading,
    dataComplete,
    fetchError,
    nonDtcFetchError,
    fetchAllData,
    subscriptionData,
    subscriptionLoading,
    isLocalSubscription,
    subscriptionError,
    fetchSubscriptions,
  }), [
    user,
    login,
    logout,
    autoRefresh,
    auditData,
    nonDtcAuditData,
    loading,
    dataComplete,
    fetchError,
    nonDtcFetchError,
    fetchAllData,
    subscriptionData,
    subscriptionLoading,
    isLocalSubscription,
    subscriptionError,
    fetchSubscriptions,
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
