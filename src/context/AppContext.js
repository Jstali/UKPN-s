import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { fetchDtcSubscriptions } from '../utils/api';

const AppContext = createContext(null);
const AUDIT_PAGE_SIZE = 200;

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

  // Refs to avoid stale closures and prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(null);
  const auditDataRef = useRef([]);
  const nonDtcDataRef = useRef([]);

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

  const resolveNextDataset = (nextData, hadError, currentData) => {
    if (hadError && currentData.length > 0) {
      return currentData;
    }
    return nextData;
  };

  const fetchAllData = useCallback(async (force = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }

    // Rate-limit: skip if fetched within last 30 seconds (unless forced)
    const now = Date.now();
    if (!force && lastFetchRef.current && (now - lastFetchRef.current < 30000)) {
      console.log('⏸️ Rate limit: Last fetch was', Math.round((now - lastFetchRef.current)/1000), 'seconds ago');
      return;
    }

    console.log('🔄 Starting data fetch...');
    isFetchingRef.current = true;
    const hasExistingData = auditDataRef.current.length > 0 || nonDtcDataRef.current.length > 0;

    // Only show skeleton on true first load (no existing data)
    if (!hasExistingData) {
      setLoading(true);
      setDataComplete(false);
    }
    // On refresh with existing data: keep dataComplete=true so Failed Files stay visible
    // Don't set dataComplete=false here — only flip it when data is truly absent

    setFetchError(null);
    setNonDtcFetchError(null);

    try {
      let dtcErr = null, nonDtcErr = null;
      console.log('📡 Fetching page 1...');
      const dtcPromise = api.fetchDtcAuditData(null, AUDIT_PAGE_SIZE).catch(err => {
        dtcErr = err.message || 'DTC API error';
        console.error('❌ DTC fetch failed:', dtcErr);
        return { data: [], continuationToken: null, error: dtcErr };
      });

      const nonDtcPromise = api.fetchNonDtcAuditData(null, AUDIT_PAGE_SIZE).catch(err => {
        nonDtcErr = err.message || 'Non-DTC API error';
        console.error('❌ Non-DTC fetch failed:', nonDtcErr);
        return { data: [], continuationToken: null, error: nonDtcErr };
      });

      const [dtcResponse, nonDtcResponse] = await Promise.all([dtcPromise, nonDtcPromise]);
      dtcErr = dtcErr || dtcResponse?.error || null;
      nonDtcErr = nonDtcErr || nonDtcResponse?.error || null;

      const initialDtc = dtcResponse.data || [];
      const initialNonDtc = nonDtcResponse.data || [];
      const nextInitialDtc = resolveNextDataset(initialDtc, !!dtcErr, auditDataRef.current);
      const nextInitialNonDtc = resolveNextDataset(initialNonDtc, !!nonDtcErr, nonDtcDataRef.current);

      if (dtcErr) setFetchError(dtcErr);
      // Track Non-DTC error independently so the page can show a specific message
      if (nonDtcErr) setNonDtcFetchError(nonDtcErr);

      if (nextInitialDtc.length === 0 && nextInitialNonDtc.length === 0 && (dtcErr || nonDtcErr)) {
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
        setAuditDataSync(nextInitialDtc);
        setNonDtcDataSync(nextInitialNonDtc);
        setLoading(false);
      }

      lastFetchRef.current = Date.now();

      // No more pages — commit and finish
      if (!dtcResponse.continuationToken && !nonDtcResponse.continuationToken) {
        if (hasExistingData) {
          setAuditDataSync(nextInitialDtc);
          setNonDtcDataSync(nextInitialNonDtc);
        }
        setDataComplete(true);
        isFetchingRef.current = false;
        return;
      }

      // Paginate remaining pages, accumulating silently
      let allDtc = [...nextInitialDtc];
      let allNonDtc = [...nextInitialNonDtc];
      let dtcToken = dtcResponse.continuationToken;
      let nonDtcToken = nonDtcResponse.continuationToken;

      while (dtcToken || nonDtcToken) {
        const promises = [];
        if (dtcToken) {
          promises.push(
            api.fetchDtcAuditData(dtcToken, AUDIT_PAGE_SIZE).catch(err => {
              const message = err.message || 'DTC pagination error';
              console.error('DTC pagination error:', err);
              return { data: [], continuationToken: null, error: message };
            })
          );
        }
        if (nonDtcToken) {
          promises.push(
            api.fetchNonDtcAuditData(nonDtcToken, AUDIT_PAGE_SIZE).catch(err => {
              const message = err.message || 'Non-DTC pagination error';
              console.error('Non-DTC pagination error:', err);
              return { data: [], continuationToken: null, error: message };
            })
          );
        }

        const results = await Promise.all(promises);

        if (dtcToken) {
          const dtcRes = results[0];
          allDtc = [...allDtc, ...(dtcRes.data || [])];
          if (dtcRes.error) setFetchError(dtcRes.error);
          dtcToken = dtcRes.continuationToken;
        }
        if (nonDtcToken) {
          const nonDtcRes = results[promises.length === 2 ? 1 : 0];
          allNonDtc = [...allNonDtc, ...(nonDtcRes.data || [])];
          if (nonDtcRes.error) setNonDtcFetchError(nonDtcRes.error);
          nonDtcToken = nonDtcRes.continuationToken;
        }

        // Update UI progressively every page
        setAuditDataSync([...allDtc]);
        setNonDtcDataSync([...allNonDtc]);
        // Don't write cache on every page - only at the end
      }

      // Final update and cache write
      setAuditDataSync([...allDtc]);
      setNonDtcDataSync([...allNonDtc]);
      setDataComplete(true);
      
      // Log total records fetched
      console.log(`📊 Total records fetched - DTC: ${allDtc.length}, Non-DTC: ${allNonDtc.length}`);
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
      nonDtcFetchError,
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
