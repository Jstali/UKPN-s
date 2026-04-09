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

      if (dtcErr) setFetchError(dtcErr);
      if (nonDtcErr) setNonDtcFetchError(nonDtcErr);

      // Both APIs failed with no data at all — bail early, keep whatever we had
      if (initialDtc.length === 0 && initialNonDtc.length === 0 && (dtcErr || nonDtcErr)) {
        setLoading(false);
        if (!hasExistingData) setDataComplete(true);
        lastFetchRef.current = Date.now();
        isFetchingRef.current = false;
        return;
      }

      // First load: show page 1 immediately so the UI isn't blank while paginating
      if (!hasExistingData) {
        setAuditDataSync(initialDtc);
        setNonDtcDataSync(initialNonDtc);
        setLoading(false);
      }

      lastFetchRef.current = Date.now();

      // Accumulate ALL pages from the API
      let allFetchedDtc = [...initialDtc];
      let allFetchedNonDtc = [...initialNonDtc];
      let dtcToken = dtcResponse.continuationToken;
      let nonDtcToken = nonDtcResponse.continuationToken;

      while (dtcToken || nonDtcToken) {
        const promises = [];
        if (dtcToken) {
          promises.push(
            api.fetchDtcAuditData(dtcToken, AUDIT_PAGE_SIZE).catch(err => {
              console.error('DTC pagination error:', err);
              return { data: [], continuationToken: null, error: err.message };
            })
          );
        }
        if (nonDtcToken) {
          promises.push(
            api.fetchNonDtcAuditData(nonDtcToken, AUDIT_PAGE_SIZE).catch(err => {
              console.error('Non-DTC pagination error:', err);
              return { data: [], continuationToken: null, error: err.message };
            })
          );
        }

        const results = await Promise.all(promises);

        if (dtcToken) {
          const dtcRes = results[0];
          allFetchedDtc = [...allFetchedDtc, ...(dtcRes.data || [])];
          if (dtcRes.error) setFetchError(dtcRes.error);
          dtcToken = dtcRes.continuationToken;
        }
        if (nonDtcToken) {
          const nonDtcRes = results[promises.length === 2 ? 1 : 0];
          allFetchedNonDtc = [...allFetchedNonDtc, ...(nonDtcRes.data || [])];
          if (nonDtcRes.error) setNonDtcFetchError(nonDtcRes.error);
          nonDtcToken = nonDtcRes.continuationToken;
        }

        // First load only: update UI progressively as each page arrives
        if (!hasExistingData) {
          setAuditDataSync([...allFetchedDtc]);
          setNonDtcDataSync([...allFetchedNonDtc]);
        }
      }

      // ─── Commit final result ───────────────────────────────────────────────
      if (hasExistingData) {
        // BACKGROUND REFRESH — incremental merge:
        // 1. For records already in state: update them in-place with fresh API data
        //    (picks up new events, status changes on existing files)
        // 2. For records the API returned that we've never seen: append them
        // This means the count only ever goes UP, filters/scroll position are preserved,
        // and the test team never sees their working dataset wiped.

        const freshDtcMap = new Map(allFetchedDtc.filter(r => r.id).map(r => [r.id, r]));
        const freshNonDtcMap = new Map(allFetchedNonDtc.filter(r => r.id).map(r => [r.id, r]));

        // Update existing records in-place
        const updatedDtc = auditDataRef.current.map(r =>
          r.id && freshDtcMap.has(r.id) ? { ...r, ...freshDtcMap.get(r.id) } : r
        );
        const updatedNonDtc = nonDtcDataRef.current.map(r =>
          r.id && freshNonDtcMap.has(r.id) ? { ...r, ...freshNonDtcMap.get(r.id) } : r
        );

        // Append genuinely new records
        const existingDtcIds = new Set(auditDataRef.current.map(r => r.id).filter(Boolean));
        const existingNonDtcIds = new Set(nonDtcDataRef.current.map(r => r.id).filter(Boolean));
        const newDtc = allFetchedDtc.filter(r => r.id && !existingDtcIds.has(r.id));
        const newNonDtc = allFetchedNonDtc.filter(r => r.id && !existingNonDtcIds.has(r.id));

        if (newDtc.length > 0 || newNonDtc.length > 0) {
          console.log(`🆕 New records found — DTC: +${newDtc.length}, Non-DTC: +${newNonDtc.length}`);
        } else {
          console.log('✅ No new records this cycle');
        }

        setAuditDataSync([...updatedDtc, ...newDtc]);
        setNonDtcDataSync([...updatedNonDtc, ...newNonDtc]);
      } else {
        // First load: just set the full dataset
        setAuditDataSync([...allFetchedDtc]);
        setNonDtcDataSync([...allFetchedNonDtc]);
      }

      setDataComplete(true);
      console.log(`📊 Total in state — DTC: ${auditDataRef.current.length}, Non-DTC: ${nonDtcDataRef.current.length}`);
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
