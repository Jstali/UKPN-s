import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus, Trash2, X, Eye, Download, ArrowLeft, FileJson, Server,
  Layers, CheckCircle, XCircle, Copy, ChevronRight, Search,
  Filter, FolderOpen, FileText, Globe, Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchDtcSubscriptions } from '../utils/api';

const APP_COLORS = {
  ADMS: { accent: '#6366f1', light: '#eef2ff', border: '#c7d2fe' },
  Electralink: { accent: '#f59e0b', light: '#fffbeb', border: '#fde68a' },
  MPRS: { accent: '#10b981', light: '#ecfdf5', border: '#a7f3d0' },
  MSBI: { accent: '#8b5cf6', light: '#f5f3ff', border: '#c4b5fd' },
};

const getAppColor = (appName) => {
  const key = Object.keys(APP_COLORS).find(k => appName?.toUpperCase().includes(k));
  return APP_COLORS[key] || { accent: '#6b7280', light: '#f9fafb', border: '#d1d5db' };
};

const normalizeSubscription = (app) => {
  const rules = Array.isArray(app?.rules) ? app.rules.map(rule => ({
    ...rule,
    destination: rule.destination || rule.destinations || rule.Destination
  })) : [];

  const headerStrings = rules.flatMap(rule => rule?.Header_String?.value || []);
  const destinations = rules.map(rule => rule.destination).filter(Boolean);

  return {
    application: app?.Application || app?.application || app?.id || app?.filterId || 'Unknown',
    filterId: app?.filterId || app?.FilterId || app?.id || 'Unknown',
    headerStrings,
    destinations,
    id: app?.id || app?.ID || app?.filterId || `${app?.Application || 'app'}_${Math.random().toString(36).slice(2, 8)}`,
    status: app?.status || 'active',
    rules
  };
};

const Subscriptions = () => {
  const { user } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [copiedRule, setCopiedRule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRules, setExpandedRules] = useState({});
  const [existingSubscriptions, setExistingSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const canEdit = user?.role === 'Core Support' || user?.role === 'Admin';

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptions = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const apiData = await fetchDtcSubscriptions();
        const normalized = Array.isArray(apiData) ? apiData.map(normalizeSubscription) : [];
        if (isMounted) {
          setExistingSubscriptions(normalized);
        }
      } catch (error) {
        console.error('[Subscriptions] Failed to load:', error);
        if (isMounted) {
          setLoadError(error.message || 'Failed to load subscriptions.');
          setExistingSubscriptions([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSubscriptions();
    return () => { isMounted = false; };
  }, []);

  const filteredSubscriptions = existingSubscriptions.filter(app =>
    app.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.filterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedSubscriptions = filteredSubscriptions.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handlePageSize = (val) => { setPageSize(Number(val)); setCurrentPage(1); };

  const handleCopyRule = (rule, idx) => {
    const text = `Header Strings: ${rule.Header_String.value.join(', ')}\nFile Name: ${rule.Header_String.fileName}\nDestination: ${rule.destination}`;
    navigator.clipboard.writeText(text);
    setCopiedRule(idx);
    setTimeout(() => setCopiedRule(null), 2000);
  };

  const toggleRule = (idx) => {
    setExpandedRules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (showForm) {
    return <SubscriptionForm onBack={() => setShowForm(false)} />;
  }

  // ─── Detail View ───
  if (selectedApp) {
    const colors = getAppColor(selectedApp.application);
    const totalHeaders = selectedApp.headerStrings.length;
    const uniqueDest = new Set(selectedApp.destinations).size;

    return (
      <motion.div
        className="sp-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
          <Link to="/">Home</Link> → <Link to="/subscriptions" onClick={(e) => { e.preventDefault(); setSelectedApp(null); }}>Subscriptions</Link> → {selectedApp.application}
        </div>

        {/* Detail Hero Card */}
        <div className="sp-hero-card">
          <div className="sp-hero-left">
            <div className="sp-hero-icon" style={{ background: colors.light, borderColor: colors.border }}>
              <Server size={22} style={{ color: colors.accent }} />
            </div>
            <div>
              <h1 className="sp-hero-title">{selectedApp.application}</h1>
              <div className="sp-hero-tags">
                <span className={`sp-tag ${selectedApp.status === 'active' ? 'sp-tag-green' : 'sp-tag-red'}`}>
                  {selectedApp.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {selectedApp.status?.toUpperCase()}
                </span>
                <span className="sp-tag sp-tag-neutral"><Filter size={12} /> {selectedApp.filterId}</span>
                <span className="sp-tag sp-tag-neutral"><Layers size={12} /> {selectedApp.rules?.length} Rules</span>
              </div>
            </div>
          </div>
          <div className="sp-hero-actions">
            <button className="sp-btn sp-btn-ghost" onClick={() => setSelectedApp(null)}>
              <ArrowLeft size={15} /> Back
            </button>
            <button className={`sp-btn ${showJson ? 'sp-btn-filled' : 'sp-btn-ghost'}`} onClick={() => setShowJson(!showJson)}>
              <FileJson size={15} /> {showJson ? 'Details' : 'JSON'}
            </button>
            <button
              className="sp-btn sp-btn-accent"
              onClick={() => {
                const text = `Application: ${selectedApp.application}\nFilter ID: ${selectedApp.filterId}\n\nHeader Strings:\n${selectedApp.headerStrings.join('\n')}\n\nDestinations:\n${selectedApp.destinations.join('\n')}\n\nID: ${selectedApp.id}`;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedApp.application}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={15} /> Export
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showJson ? (
            <motion.div
              key="json"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="sp-card"
            >
              <div className="sp-card-header">
                <div className="sp-card-header-left">
                  <FileJson size={15} color="#667eea" />
                  <span className="sp-card-title">JSON Output</span>
                </div>
              </div>
              <div className="sp-json-body">
                <pre>{JSON.stringify(selectedApp, null, 2)}</pre>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {/* KPI Row */}
              <div className="sp-kpi-row">
                <div className="sp-kpi">
                  <div className="sp-kpi-icon" style={{ background: '#eef2ff' }}><Layers size={18} color="#6366f1" /></div>
                  <div>
                    <div className="sp-kpi-value">{selectedApp.rules?.length || 0}</div>
                    <div className="sp-kpi-label">Rules</div>
                  </div>
                </div>
                <div className="sp-kpi">
                  <div className="sp-kpi-icon" style={{ background: '#fef3c7' }}><FileText size={18} color="#d97706" /></div>
                  <div>
                    <div className="sp-kpi-value">{totalHeaders}</div>
                    <div className="sp-kpi-label">Header Strings</div>
                  </div>
                </div>
                <div className="sp-kpi">
                  <div className="sp-kpi-icon" style={{ background: '#ecfdf5' }}><FolderOpen size={18} color="#059669" /></div>
                  <div>
                    <div className="sp-kpi-value">{uniqueDest}</div>
                    <div className="sp-kpi-label">Destinations</div>
                  </div>
                </div>
              </div>

              {/* Rules Table Card */}
              <div className="sp-card">
                <div className="sp-card-header">
                  <div className="sp-card-header-left">
                    <Layers size={15} color="#667eea" />
                    <span className="sp-card-title">Subscription Rules</span>
                    <span className="sp-card-count">{selectedApp.rules?.length}</span>
                  </div>
                </div>
                <div className="sp-rules-table">
                  <div className="sp-rules-thead">
                    <div className="sp-rules-th sp-rules-th-num">#</div>
                    <div className="sp-rules-th" style={{ flex: 2 }}>Header Strings</div>
                    <div className="sp-rules-th" style={{ flex: 1 }}>File Template</div>
                    <div className="sp-rules-th" style={{ flex: 2 }}>Destination</div>
                    <div className="sp-rules-th sp-rules-th-action"></div>
                  </div>
                  {selectedApp.rules?.map((rule, idx) => {
                    const isExpanded = expandedRules[idx];
                    const headerCount = rule.Header_String.value.length;
                    return (
                      <motion.div
                        key={idx}
                        className="sp-rules-row"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <div className="sp-rules-td sp-rules-td-num">
                          <span className="sp-rule-num" style={{ background: colors.light, color: colors.accent, borderColor: colors.border }}>
                            {idx + 1}
                          </span>
                        </div>
                        <div className="sp-rules-td" style={{ flex: 2 }}>
                          <code className="sp-mono">{rule.Header_String.value[0]}</code>
                          {headerCount > 1 && (
                            <button className="sp-more-btn" onClick={() => toggleRule(idx)}>
                              {isExpanded ? 'Show less' : `+${headerCount - 1} more`}
                            </button>
                          )}
                          {isExpanded && rule.Header_String.value.slice(1).map((str, i) => (
                            <code key={i} className="sp-mono sp-mono-extra">{str}</code>
                          ))}
                        </div>
                        <div className="sp-rules-td" style={{ flex: 1 }}>
                          <code className="sp-mono sp-mono-blue">{rule.Header_String.fileName}</code>
                        </div>
                        <div className="sp-rules-td" style={{ flex: 2 }}>
                          <code className="sp-mono sp-mono-green">{rule.destination}</code>
                        </div>
                        <div className="sp-rules-td sp-rules-td-action">
                          <button
                            className="sp-icon-btn"
                            onClick={() => handleCopyRule(rule, idx)}
                            title="Copy rule"
                          >
                            {copiedRule === idx ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ─── Main Grid View ───
  const activeCount = existingSubscriptions.filter(a => a.status === 'active').length;
  const totalRules = existingSubscriptions.reduce((sum, a) => sum + (a.rules?.length || 0), 0);

  return (
    <motion.div
      className="sp-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → Subscriptions
      </div>

      {/* Page Header */}
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Subscriptions</h1>
          <p className="sp-page-subtitle">Manage application subscription rules & routing</p>
        </div>
        {canEdit && (
          <button className="sp-btn sp-btn-filled" onClick={() => setShowForm(true)}>
            <Plus size={15} /> New Subscription
          </button>
        )}
      </div>

      {/* Overview KPIs */}
      {loading && (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7280' }}>
          Loading subscriptions from API...
        </div>
      )}
      {!loading && loadError && (
        <div style={{
          marginBottom: '12px', padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: '8px', fontSize: '13px', color: '#991b1b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <span>Unable to load subscriptions. Please check your network connection and try again.</span>
          <button
            onClick={() => {
              let isMounted = true;
              setLoading(true);
              setLoadError('');
              fetchDtcSubscriptions()
                .then(apiData => {
                  const normalized = Array.isArray(apiData) ? apiData.map(normalizeSubscription) : [];
                  if (isMounted) setExistingSubscriptions(normalized);
                })
                .catch(err => {
                  console.error('[Subscriptions] retry failed:', err);
                  if (isMounted) {
                    setLoadError(err.message || 'Failed to load subscriptions.');
                    setExistingSubscriptions([]);
                  }
                })
                .finally(() => { if (isMounted) setLoading(false); });
              return () => { isMounted = false; };
            }}
            style={{
              padding: '6px 14px', background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div className="sp-kpi-row sp-kpi-row-overview">
        <div className="sp-kpi">
          <div className="sp-kpi-icon" style={{ background: '#eef2ff' }}><Globe size={18} color="#6366f1" /></div>
          <div>
            <div className="sp-kpi-value">{existingSubscriptions.length}</div>
            <div className="sp-kpi-label">Applications</div>
          </div>
        </div>
        <div className="sp-kpi">
          <div className="sp-kpi-icon" style={{ background: '#ecfdf5' }}><CheckCircle size={18} color="#059669" /></div>
          <div>
            <div className="sp-kpi-value">{activeCount}</div>
            <div className="sp-kpi-label">Active</div>
          </div>
        </div>
        <div className="sp-kpi">
          <div className="sp-kpi-icon" style={{ background: '#fef3c7' }}><Layers size={18} color="#d97706" /></div>
          <div>
            <div className="sp-kpi-value">{totalRules}</div>
            <div className="sp-kpi-label">Total Rules</div>
          </div>
        </div>
      </div>

      {/* Application Table Card */}
      <div className="sp-card">
        <div className="sp-card-header">
          <div className="sp-card-header-left">
            <Server size={15} color="#667eea" />
            <span className="sp-card-title">All Applications</span>
            <span className="sp-card-count">{filteredSubscriptions.length}</span>          </div>
          <div className="sp-card-header-right">
            <div className="sp-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sp-app-table">
          <div className="sp-app-thead">
            <div className="sp-app-th" style={{ flex: 2 }}>Application</div>
            <div className="sp-app-th" style={{ flex: 1 }}>Filter ID</div>
            <div className="sp-app-th" style={{ flex: 1 }}>Status</div>
            <div className="sp-app-th" style={{ flex: 1 }}>Rules</div>
            <div className="sp-app-th" style={{ flex: 1 }}>Headers</div>
            <div className="sp-app-th sp-app-th-action"></div>
          </div>
          {pagedSubscriptions.map((app, index) => {
            const colors = getAppColor(app.application);
            return (
              <motion.div
                key={app.id}
                className="sp-app-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedApp(app)}
              >
                <div className="sp-app-td" style={{ flex: 2 }}>
                  <div className="sp-app-name-cell">
                    <div className="sp-app-dot" style={{ background: colors.accent }} />
                    <span className="sp-app-name">{app.application}</span>
                  </div>
                </div>
                <div className="sp-app-td" style={{ flex: 1 }}>
                  <code className="sp-filter-id">{app.filterId}</code>
                </div>
                <div className="sp-app-td" style={{ flex: 1 }}>
                  <span className={`sp-tag-sm ${app.status === 'active' ? 'sp-tag-green' : 'sp-tag-red'}`}>
                    {app.status === 'active' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {app.status?.toUpperCase()}
                  </span>
                </div>
                <div className="sp-app-td" style={{ flex: 1 }}>
                  <span className="sp-app-num">{app.rules?.length || 0}</span>
                </div>
                <div className="sp-app-td" style={{ flex: 1 }}>
                  <span className="sp-app-num">{app.headerStrings.length}</span>
                </div>
                <div className="sp-app-td sp-app-td-action">
                  <ChevronRight size={16} className="sp-row-arrow" />
                </div>
              </motion.div>
            );
          })}
          {filteredSubscriptions.length === 0 && !loading && (
            <div className="sp-empty">
              {loadError
                ? 'Could not load subscriptions — see error above.'
                : searchTerm
                  ? 'No applications match your search.'
                  : 'No subscriptions found.'}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSize(e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
            >
              {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              {filteredSubscriptions.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredSubscriptions.length)}`} of {filteredSubscriptions.length}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: safePage === 1 ? '#f1f5f9' : '#fff', cursor: safePage === 1 ? 'not-allowed' : 'pointer', color: safePage === 1 ? '#94a3b8' : '#374151' }}
              >‹</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: safePage === totalPages ? '#f1f5f9' : '#fff', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', color: safePage === totalPages ? '#94a3b8' : '#374151' }}
              >›</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Create Form ───
const SubscriptionForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    filterId: '',
    application: '',
    id: '',
    rules: [{ headerStrings: [''], fileName: '', destinations: [''] }]
  });

  const [showPreview, setShowPreview] = useState(false);

  const addRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { headerStrings: [''], fileName: '', destinations: [''] }]
    });
  };

  const removeRule = (index) => {
    const newRules = formData.rules.filter((_, i) => i !== index);
    setFormData({ ...formData, rules: newRules });
  };

  const addHeaderString = (ruleIndex) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex].headerStrings.push('');
    setFormData({ ...formData, rules: newRules });
  };

  const removeHeaderString = (ruleIndex, stringIndex) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex].headerStrings = newRules[ruleIndex].headerStrings.filter((_, i) => i !== stringIndex);
    setFormData({ ...formData, rules: newRules });
  };

  const updateHeaderString = (ruleIndex, stringIndex, value) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex].headerStrings[stringIndex] = value;
    setFormData({ ...formData, rules: newRules });
  };

  const updateRule = (ruleIndex, field, value) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex][field] = value;
    setFormData({ ...formData, rules: newRules });
  };

  const addDestination = (ruleIndex) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex].destinations.push('');
    setFormData({ ...formData, rules: newRules });
  };

  const removeDestination = (ruleIndex, destIndex) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex].destinations = newRules[ruleIndex].destinations.filter((_, i) => i !== destIndex);
    setFormData({ ...formData, rules: newRules });
  };

  const updateDestination = (ruleIndex, destIndex, value) => {
    const newRules = [...formData.rules];
    newRules[ruleIndex].destinations[destIndex] = value;
    setFormData({ ...formData, rules: newRules });
  };

  const generateJSON = () => ({
    filterId: formData.filterId,
    rules: formData.rules.map(rule => ({
      Header_String: {
        value: rule.headerStrings.filter(s => s.trim() !== ''),
        fileName: rule.fileName || '{uuid}'
      },
      destinations: rule.destinations.filter(d => d.trim() !== '')
    })),
    Application: formData.application,
    id: formData.id
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const json = generateJSON();
    alert('Subscription created successfully!');
  };

  const handleReset = () => {
    setFormData({
      filterId: '',
      application: '',
      id: '',
      rules: [{ headerStrings: [''], fileName: '', destinations: [''] }]
    });
  };

  return (
    <motion.div
      className="sp-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → <span onClick={onBack} style={{ cursor: 'pointer', color: 'var(--ukpn-secondary)' }}>Subscriptions</span> → New
      </div>

      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Create Subscription</h1>
          <p className="sp-page-subtitle">Define subscription rules and routing for a new application</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Card */}
        <div className="sp-card" style={{ marginBottom: '16px' }}>
          <div className="sp-card-header">
            <div className="sp-card-header-left">
              <Server size={15} color="#667eea" />
              <span className="sp-card-title">Basic Information</span>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="sp-form-row">
              <div className="sp-field">
                <label className="sp-label">Filter ID <span className="sp-req">*</span></label>
                <input
                  type="text"
                  className="sp-input"
                  value={formData.filterId}
                  onChange={(e) => setFormData({ ...formData, filterId: e.target.value })}
                  placeholder="e.g., ADMS"
                  required
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">Application <span className="sp-req">*</span></label>
                <input
                  type="text"
                  className="sp-input"
                  value={formData.application}
                  onChange={(e) => setFormData({ ...formData, application: e.target.value })}
                  placeholder="e.g., ADMS"
                  required
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">ID <span className="sp-req">*</span></label>
                <input
                  type="text"
                  className="sp-input"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., ADMS_DEV_V1"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rules Card */}
        <div className="sp-card" style={{ marginBottom: '16px' }}>
          <div className="sp-card-header">
            <div className="sp-card-header-left">
              <Layers size={15} color="#667eea" />
              <span className="sp-card-title">Subscription Rules</span>
              <span className="sp-card-count">{formData.rules.length}</span>
            </div>
            <button type="button" className="sp-btn sp-btn-filled sp-btn-sm" onClick={addRule}>
              <Plus size={14} /> Add Rule
            </button>
          </div>
          <div className="sp-card-body">
            <AnimatePresence>
              {formData.rules.map((rule, ruleIndex) => (
                <motion.div
                  key={ruleIndex}
                  className="sp-rule-block"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="sp-rule-block-header">
                    <span className="sp-rule-badge">{ruleIndex + 1}</span>
                    <span className="sp-rule-block-title">Rule {ruleIndex + 1}</span>
                    {formData.rules.length > 1 && (
                      <button type="button" className="sp-btn-danger-sm" onClick={() => removeRule(ruleIndex)}>
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="sp-rule-block-body">
                    {/* Header Strings */}
                    <div className="sp-field">
                      <div className="sp-field-row">
                        <label className="sp-label">Header String Values</label>
                        <button type="button" className="sp-link-btn" onClick={() => addHeaderString(ruleIndex)}>
                          <Plus size={13} /> Add
                        </button>
                      </div>
                      {rule.headerStrings.map((str, strIndex) => (
                        <div key={strIndex} className="sp-input-group">
                          <input
                            type="text"
                            className="sp-input"
                            value={str}
                            onChange={(e) => updateHeaderString(ruleIndex, strIndex, e.target.value)}
                            placeholder="e.g., ZHV|D0132001|X|+|R|EELC|+|OPER"
                          />
                          {rule.headerStrings.length > 1 && (
                            <button type="button" className="sp-input-remove" onClick={() => removeHeaderString(ruleIndex, strIndex)}>
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* File Name */}
                    <div className="sp-field">
                      <label className="sp-label">File Name Template</label>
                      <input
                        type="text"
                        className="sp-input"
                        value={rule.fileName}
                        onChange={(e) => updateRule(ruleIndex, 'fileName', e.target.value)}
                        placeholder="{uuid}"
                      />
                    </div>

                    {/* Destinations */}
                    <div className="sp-field">
                      <div className="sp-field-row">
                        <label className="sp-label">Destination Paths</label>
                        <button type="button" className="sp-link-btn" onClick={() => addDestination(ruleIndex)}>
                          <Plus size={13} /> Add
                        </button>
                      </div>
                      {rule.destinations.map((dest, destIndex) => (
                        <div key={destIndex} className="sp-input-group">
                          <input
                            type="text"
                            className="sp-input"
                            value={dest}
                            onChange={(e) => updateDestination(ruleIndex, destIndex, e.target.value)}
                            placeholder="//UKPNFORvFS01/WorkHub/Disconnections/..."
                            required
                          />
                          {rule.destinations.length > 1 && (
                            <button type="button" className="sp-input-remove" onClick={() => removeDestination(ruleIndex, destIndex)}>
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="sp-form-footer">
          <button type="submit" className="sp-btn sp-btn-accent">
            <CheckCircle size={15} /> Create Subscription
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={() => setShowPreview(true)}>
            <Eye size={15} /> Preview JSON
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={onBack}>
            <ArrowLeft size={15} /> Cancel
          </button>
        </div>
      </form>

      {/* JSON Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            className="sp-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              className="sp-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sp-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileJson size={16} color="#667eea" />
                  <h3 className="sp-modal-title">JSON Preview</h3>
                </div>
                <button className="sp-icon-btn" onClick={() => setShowPreview(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="sp-json-body">
                <pre>{JSON.stringify(generateJSON(), null, 2)}</pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Subscriptions;
