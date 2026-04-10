import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import api, { fetchDtcSubscriptions } from '../utils/api';

const AppContext = createContext(null);

const MAX_AUDIT_RECORDS = 1000;
const AUDIT_PAGE_SIZE = 500;
const AUTO_REFRESH_INTERVAL_MS = 60000;

const buildDatasetSignature = (records) =>
  JSON.stringify(
    (records || []).slice(0, MAX_AUDIT_RECORDS).map((item) => ({
      id: item?.id || item?.File_ID || item?.fileId || '',
      updatedAt: item?._ts || '',
      eventCount: Array.isArray(item?.events) ? item.events.length : 0,
      status: item?.status || item?.Status || '',
    }))
  );

const trimRecords = (records) => (Array.isArray(records) ? records.slice(0, MAX_AUDIT_RECORDS) : []);

// Fetch one page from a given API endpoint
const fetchOnePage = async (fetchFn, token, signal) =>
  fetchFn(token, AUDIT_PAGE_SIZE, { signal });

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [auditData, setAuditData] = useState([]);
  const [nonDtcAuditData, setNonDtcAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataComplete, setDataComplete] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [nonDtcFetchError, setNonDtcFetchError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isLocalSubscription, setIsLocalSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);

  // Strict in-flight lock. Only one refresh cycle may run at a time.
  const isFetchingRef = useRef(false);
  const activeControllerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const queuedFetchOptionsRef = useRef(null);
  const auditSignatureRef = useRef('');
  const nonDtcSignatureRef = useRef('');

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (!savedUser) return;

    try {
      setUser(JSON.parse(savedUser));
    } catch {
      sessionStorage.removeItem('user');
    }
  }, []);

  const commitDatasetIfChanged = useCallback((setState, signatureRef, records) => {
    const trimmedRecords = trimRecords(records);
    const nextSignature = buildDatasetSignature(trimmedRecords);

    if (nextSignature === signatureRef.current) {
      return false;
    }

    signatureRef.current = nextSignature;
    setState(trimmedRecords);
    return true;
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

      // Show first page immediately — clears the loading spinner
      commitDatasetIfChanged(setAuditData, auditSignatureRef, dtcRecords);
      commitDatasetIfChanged(setNonDtcAuditData, nonDtcSignatureRef, nonDtcRecords);
      setLoading(false);

      // ── Step 2: Fetch remaining pages in background (both in parallel) ──────
      let dtcToken = dtcRecords.length < MAX_AUDIT_RECORDS ? (dtcFirst?.continuationToken || null) : null;
      let nonDtcToken = nonDtcRecords.length < MAX_AUDIT_RECORDS ? (nonDtcFirst?.continuationToken || null) : null;

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
            if (dtcRecords.length >= MAX_AUDIT_RECORDS) dtcRecords.length = MAX_AUDIT_RECORDS;
            dtcToken = dtcRecords.length < MAX_AUDIT_RECORDS ? (page.continuationToken || null) : null;
            if (newRows.length > 0) dtcUpdated = true;
          } else {
            nonDtcRecords.push(...newRows);
            if (nonDtcRecords.length >= MAX_AUDIT_RECORDS) nonDtcRecords.length = MAX_AUDIT_RECORDS;
            nonDtcToken = nonDtcRecords.length < MAX_AUDIT_RECORDS ? (page.continuationToken || null) : null;
            if (newRows.length > 0) nonDtcUpdated = true;
          }
        }

        // Update state as more data arrives
        if (dtcUpdated) commitDatasetIfChanged(setAuditData, auditSignatureRef, dtcRecords);
        if (nonDtcUpdated) commitDatasetIfChanged(setNonDtcAuditData, nonDtcSignatureRef, nonDtcRecords);
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
  }, [commitDatasetIfChanged]);

  useEffect(() => {
    if (mountedRef.current) {
      return undefined;
    }

    mountedRef.current = true;
    fetchAllData();

    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [fetchAllData]);

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
    auditSignatureRef.current = '';
    nonDtcSignatureRef.current = '';

    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
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
