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
const AUDIT_PAGE_SIZE = 200;
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

const collectAuditPages = async (fetchPage, signal) => {
  const records = [];
  let continuationToken = null;
  let lastError = null;
  let aborted = false;

  do {
    const response = await fetchPage(continuationToken, AUDIT_PAGE_SIZE, { signal });

    if (response?.aborted) {
      aborted = true;
      break;
    }

    if (response?.error) {
      lastError = response.error;
      break;
    }

    const nextRecords = Array.isArray(response?.data) ? response.data : [];
    if (nextRecords.length > 0) {
      records.push(...nextRecords);
      if (records.length >= MAX_AUDIT_RECORDS) {
        records.length = MAX_AUDIT_RECORDS;
        continuationToken = null;
        break;
      }
    }

    continuationToken = response?.continuationToken || null;
  } while (continuationToken && !signal.aborted);

  return {
    data: trimRecords(records),
    error: lastError,
    aborted,
  };
};

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

    // Prevent duplicate fetches. Manual refresh may explicitly restart.
    if (isFetchingRef.current) {
      if (!restart) {
        return false;
      }

      queuedFetchOptionsRef.current = { restart: false, silent };
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      return false;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      // Fetch both APIs in parallel. Each collector paginates up to 1000 records max.
      const [dtcResult, nonDtcResult] = await Promise.all([
        collectAuditPages(api.fetchDtcAuditData.bind(api), controller.signal),
        collectAuditPages(api.fetchNonDtcAuditData.bind(api), controller.signal),
      ]);

      if (controller.signal.aborted || dtcResult.aborted || nonDtcResult.aborted) {
        return false;
      }

      setFetchError(dtcResult.error || null);
      setNonDtcFetchError(nonDtcResult.error || null);

      // Avoid re-render when payload has not changed.
      commitDatasetIfChanged(setAuditData, auditSignatureRef, dtcResult.data);
      commitDatasetIfChanged(setNonDtcAuditData, nonDtcSignatureRef, nonDtcResult.data);

      setDataComplete(true);
      return true;
    } catch (error) {
      if (controller.signal.aborted) {
        return false;
      }

      const message = error?.message || 'Failed to load audit data';
      setFetchError(message);
      setNonDtcFetchError((prev) => prev || message);
      setDataComplete(true);
      return false;
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
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
