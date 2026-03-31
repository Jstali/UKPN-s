import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { fetchDtcSubscriptions } from '../utils/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [auditData, setAuditData] = useState([]);
  const [nonDtcAuditData, setNonDtcAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataComplete, setDataComplete] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isLocalSubscription, setIsLocalSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);

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
    // Skip if data exists and fetch was recent (within 5 minutes)
    if (!force && lastFetch && (Date.now() - lastFetch < 300000)) {
      return;
    }
    // If last fetch had an error, back off for 2 minutes before auto-retrying
    if (force && fetchError && lastFetch && (Date.now() - lastFetch < 120000)) {
      return;
    }

    // Only show the loading skeleton on first load (no data yet).
    // On background refreshes keep existing data visible (stale-while-revalidate).
    const isFirstLoad = auditData.length === 0 && nonDtcAuditData.length === 0;
    if (isFirstLoad) setLoading(true);
    setDataComplete(false);
    setFetchError(null);
    try {
      // Fetch first page immediately with individual error handling
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

      // Surface error if both APIs failed or returned no data
      if (initialDtc.length === 0 && initialNonDtc.length === 0 && (dtcErr || nonDtcErr)) {
        setFetchError(dtcErr || nonDtcErr);
      }

      setAuditData(initialDtc);
      setNonDtcAuditData(initialNonDtc);
      setLoading(false);
      setLastFetch(Date.now());

      // Load remaining in background only if there's more data
      if (!dtcResponse.continuationToken && !nonDtcResponse.continuationToken) {
        setDataComplete(true);
        return;
      }

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
        
        setAuditData([...allDtc]);
        setNonDtcAuditData([...allNonDtc]);
      }
      setDataComplete(true);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setFetchError(error.message || 'Failed to load data');
      setDataComplete(true);
      setLoading(false);
      setLastFetch(Date.now());
    }
  }, [lastFetch, fetchError]);

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
    setAuditData([]);
    setNonDtcAuditData([]);
    setSubscriptionData([]);
    setLastFetch(null);
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
