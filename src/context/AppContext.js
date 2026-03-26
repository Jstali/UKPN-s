import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [auditData, setAuditData] = useState([]);
  const [nonDtcAuditData, setNonDtcAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

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
    if (!force && auditData.length > 0 && lastFetch && (Date.now() - lastFetch < 300000)) {
      return;
    }

    setLoading(true);
    try {
      // Fetch first page immediately with individual error handling
      const dtcPromise = api.fetchDtcAuditData(null, 200).catch(err => {
        console.error('DTC API error:', err);
        return { data: [], continuationToken: null };
      });
      
      const nonDtcPromise = api.fetchNonDtcAuditData(null, 200).catch(err => {
        console.error('Non-DTC API error:', err);
        return { data: [], continuationToken: null };
      });

      const [dtcResponse, nonDtcResponse] = await Promise.all([dtcPromise, nonDtcPromise]);

      const initialDtc = dtcResponse.data || [];
      const initialNonDtc = nonDtcResponse.data || [];
      
      setAuditData(initialDtc);
      setNonDtcAuditData(initialNonDtc);
      setLoading(false);
      setLastFetch(Date.now());

      // Load remaining in background only if there's more data
      if (!dtcResponse.continuationToken && !nonDtcResponse.continuationToken) {
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
            api.fetchDtcAuditData(dtcToken, 500).catch(err => {
              console.error('DTC pagination error:', err);
              return { data: [], continuationToken: null };
            })
          );
        }
        if (nonDtcToken) {
          promises.push(
            api.fetchNonDtcAuditData(nonDtcToken, 500).catch(err => {
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
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setLoading(false);
      setLastFetch(Date.now());
    }
  }, [auditData.length, lastFetch]);

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setAuditData([]);
    setNonDtcAuditData([]);
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
      fetchAllData
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
