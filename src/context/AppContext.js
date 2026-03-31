import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { fetchDtcSubscriptions } from '../utils/api';

const AppContext = createContext(null);

// ─── localStorage cache helpers ───────────────────────────────────────────────
const LS_KEY = 'ukpn_audit_cache';
const LS_TTL = 30 * 60 * 1000; // 30 minutes

function readLocalCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { dtc, nonDtc, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_TTL) { localStorage.removeItem(LS_KEY); return null; }
    return { dtc: dtc || [], nonDtc: nonDtc || [] };
  } catch { return null; }
}

function writeLocalCache(dtc, nonDtc) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ dtc, nonDtc, ts: Date.now() }));
  } catch {}
}

function clearLocalCache() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Seed state from localStorage so data shows instantly before first API response
  const cached = readLocalCache();
  const [auditData, setAuditData] = useState(cached?.dtc || []);
  const [nonDtcAuditData, setNonDtcAuditData] = useState(cached?.nonDtc || []);

  const [loading, setLoading] = useState(!cached); // show skeleton only if no cache
  const [dataComplete, setDataComplete] = useState(!!cached);
  const [fetchError, setFetchError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isLocalSubscription, setIsLocalSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);

  // Refs to avoid stale closures and prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(cached ? Date.now() - 25000 : null); // cache = 25s old, triggers refresh soon
  const auditDataRef = useRef(cached?.dtc || []);
  const nonDtcDataRef = useRef(cached?.nonDtc || []);

  // Keep refs in sync with state
  const setAuditDataSync = (data) => {
    auditDataRef.current = data;
    setAuditData(data);
  };
  const setNonDtcDataSync = (data) => {
    nonDtcDataRef.current = data;
    setNonDtcAuditData(data);
  };

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const fetchAllData = useCallback(async (force = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;

    // Rate-limit: skip if fetched within last 30 seconds (unless forced)
    const now = Date.now();
    if (!force && lastFetchRef.current && (now - lastFetchRef.current < 30000)) {
      return;
    }

    isFetchingRef.current = true;
    const hasExistingData = auditDataRef.current.length > 0 || nonDtcDataRef.current.length > 0;

    // Only show skeleton on true first load (no cache, no data)
    if (!hasExistingData) {
      setLoading(true);
      setDataComplete(false);
    }
    // On refresh with existing data: keep dataComplete=true so Failed Files stay visible
    // Don't set dataComplete=false here — only flip it when data is truly absent

    setFetchError(null);

    try {
      let dtcErr = null, nonDtcErr = null;
      const dtcPromise = api.fetchDtcAuditData(null, 100).catch(err => {
        dtcErr = err.message || 'DTC API error';
        return { data: [], continuationToken: null };
      });

      const nonDtcPromise = api.fetchNonDtcAuditData(null, 100).catch(err => {
        nonDtcErr = err.message || 'Non-DTC API error';
        return { data: [], continuationToken: null };
      });

      const [dtcResponse, nonDtcResponse] = await Promise.all([dtcPromise, nonDtcPromise]);

      const initialDtc = dtcResponse.data || [];
      const initialNonDtc = nonDtcResponse.data || [];

      if (initialDtc.length === 0 && initialNonDtc.length === 0 && (dtcErr || nonDtcErr)) {
        setFetchError(dtcErr || nonDtcErr);
        setLoading(false);
        if (!hasExistingData) setDataComplete(true);
        lastFetchRef.current = Date.now();
        isFetchingRef.current = false;
        return;
      }

      // On first load (no existing data): show data immediately as pages arrive
      // On background refresh: hold off until all pages collected (atomic swap)
      if (!hasExistingData) {
        setAuditDataSync(initialDtc);
        setNonDtcDataSync(initialNonDtc);
        setLoading(false);
        writeLocalCache(initialDtc, initialNonDtc);
      }

      lastFetchRef.current = Date.now();

      // No more pages — commit and finish
      if (!dtcResponse.continuationToken && !nonDtcResponse.continuationToken) {
        if (hasExistingData) {
          setAuditDataSync(initialDtc);
          setNonDtcDataSync(initialNonDtc);
          writeLocalCache(initialDtc, initialNonDtc);
        }
        setDataComplete(true);
        isFetchingRef.current = false;
        return;
      }

      // Paginate remaining pages, accumulating silently
      let allDtc = [...initialDtc];
      let allNonDtc = [...initialNonDtc];
      let dtcToken = dtcResponse.continuationToken;
      let nonDtcToken = nonDtcResponse.continuationToken;

      while (dtcToken || nonDtcToken) {
        const promises = [];
        if (dtcToken) {
          promises.push(
            api.fetchDtcAuditData(dtcToken, 100).catch(err => {
              console.error('DTC pagination error:', err);
              return { data: [], continuationToken: null };
            })
          );
        }
        if (nonDtcToken) {
          promises.push(
            api.fetchNonDtcAuditData(nonDtcToken, 100).catch(err => {
              console.error('Non-DTC pagination error:', err);
              return { data: [], continuationToken: null };
            })
          );
        }

        const results = await Promise.all(promises);

        if (dtcToken) {
          const dtcRes = results[0];
          allDtc = [...allDtc, ...(dtcRes.data || [])];
          dtcToken = dtcRes.continuationToken;
        }
        if (nonDtcToken) {
          const nonDtcRes = results[promises.length === 2 ? 1 : 0];
          allNonDtc = [...allNonDtc, ...(nonDtcRes.data || [])];
          nonDtcToken = nonDtcRes.continuationToken;
        }

        // On first load: progressive updates so data appears sooner
        if (!hasExistingData) {
          setAuditDataSync([...allDtc]);
          setNonDtcDataSync([...allNonDtc]);
          writeLocalCache(allDtc, allNonDtc);
        }
      }

      // Atomic swap for background refresh (one update, no counter flicker)
      if (hasExistingData) {
        setAuditDataSync([...allDtc]);
        setNonDtcDataSync([...allNonDtc]);
      }
      writeLocalCache(allDtc, allNonDtc);
      setDataComplete(true);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setFetchError(error.message || 'Failed to load data');
      setLoading(false);
      if (!hasExistingData) setDataComplete(true);
      lastFetchRef.current = Date.now();
    } finally {
      isFetchingRef.current = false;
    }
  }, []); // stable — no dependencies, uses refs

  // Auto-refresh every 30 seconds
  useEffect(() => {
    // Fetch immediately on mount
    fetchAllData(true);

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAllData, autoRefresh]);

  const fetchSubscriptions = useCallback(async () => {
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    try {
      const { data, isLocal, error } = await fetchDtcSubscriptions();
      setSubscriptionData(Array.isArray(data) ? data : []);
      setIsLocalSubscription(!!isLocal);
      if (error) setSubscriptionError(error);
    } catch (err) {
      setSubscriptionError(err.message || 'Failed to load subscriptions');
      setSubscriptionData([]);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setAuditDataSync([]);
    setNonDtcDataSync([]);
    setSubscriptionData([]);
    lastFetchRef.current = null;
    clearLocalCache();
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
  };

  return (
    <AppContext.Provider value={{
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
      fetchAllData,
      subscriptionData,
      subscriptionLoading,
      isLocalSubscription,
      subscriptionError,
      fetchSubscriptions,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
