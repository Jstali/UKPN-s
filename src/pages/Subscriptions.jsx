import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X, Eye, Download, ArrowLeft, ChevronDown, FileJson } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import admsData from '../data/ADMS_DEV_V1.js';
import electralinkData from '../data/Electralink_DEV_V1.js';
import mprsData from '../data/MPRS_DEV_V1.js';
import msbiData from '../data/application subscription.js';

const Subscriptions = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showJson, setShowJson] = useState(false);
  
  // Role-based access
  const canEdit = user?.role === 'Core Support' || user?.role === 'Admin';
  
  // Combine all subscription data
  const allSubscriptions = [admsData, electralinkData, mprsData, msbiData];
  
  // Transform data for display
  const existingSubscriptions = allSubscriptions.map(app => {
    const allHeaderStrings = app.rules.flatMap(rule => rule.Header_String.value);
    const allDestinations = app.rules.map(rule => rule.destination);
    
    return {
      application: app.Application,
      filterId: app.filterId,
      headerStrings: allHeaderStrings,
      destinations: allDestinations,
      id: app.id,
      status: app.status,
      rules: app.rules
    };
  });

  if (showForm) {
    return <SubscriptionForm onBack={() => setShowForm(false)} />;
  }

  if (selectedApp) {
    return (
      <motion.div
        className="page-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="breadcrumb">
          <Link to="/">Home</Link> → <Link to="/subscriptions">Subscriptions</Link> → {selectedApp.application}
        </div>
        <h1 className="page-title">{selectedApp.application}</h1>

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
          <button className="button button-secondary" onClick={() => setSelectedApp(null)}>
            <ArrowLeft size={16} /> Back
          </button>
          <button className="button button-primary" onClick={() => setShowJson(!showJson)}>
            <FileJson size={16} /> {showJson ? 'Hide JSON' : 'View JSON'}
          </button>
          <button 
            className="button button-success" 
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
            <Download size={16} /> Download
          </button>
        </div>

        {showJson ? (
          <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1.5rem', borderRadius: '8px', overflow: 'auto' }}>
            <pre>{JSON.stringify(selectedApp, null, 2)}</pre>
          </div>
        ) : (
          <div className="details-container">
            <div className="detail-section">
              <h3>Filter ID</h3>
              <p>{selectedApp.filterId}</p>
            </div>
            <div className="detail-section">
              <h3>Status</h3>
              <p style={{ color: selectedApp.status === 'active' ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                {selectedApp.status?.toUpperCase() || 'N/A'}
              </p>
            </div>
            <div className="detail-section">
              <h3>Subscription Rules ({selectedApp.rules?.length || 0})</h3>
              {selectedApp.rules?.map((rule, idx) => (
                <div key={idx} style={{ 
                  background: '#f9fafb', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginBottom: '1rem' 
                }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#374151' }}>
                    Rule {idx + 1}
                  </h4>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#6b7280' }}>Header Strings:</strong>
                    {rule.Header_String.value.map((str, strIdx) => (
                      <p key={strIdx} style={{ fontSize: '0.85rem', marginLeft: '1rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        {str}
                      </p>
                    ))}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#6b7280' }}>File Name Template:</strong>
                    <p style={{ fontSize: '0.85rem', marginLeft: '1rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {rule.Header_String.fileName}
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280' }}>Destination:</strong>
                    <p style={{ fontSize: '0.85rem', marginLeft: '1rem', marginTop: '0.25rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {rule.destination}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="detail-section">
              <h3>All Header Strings ({selectedApp.headerStrings.length})</h3>
              {selectedApp.headerStrings.map((str, idx) => (
                <p key={idx} style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontFamily: 'monospace' }}>{str}</p>
              ))}
            </div>
            <div className="detail-section">
              <h3>All Destinations ({selectedApp.destinations.length})</h3>
              {selectedApp.destinations.map((dest, idx) => (
                <p key={idx} style={{ fontSize: '0.85rem', marginBottom: '0.5rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>{dest}</p>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb">
        <Link to="/">Home</Link> → Subscriptions
      </div>
      <h1 className="page-title">All Applications</h1>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        {canEdit && (
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add New Subscription
          </button>
        )}
      </div>

      <div className="app-grid">
        {existingSubscriptions.map((app) => (
          <SpotlightCard key={app.id}>
            <motion.div
              className="app-card"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedApp(app);
              }}
              style={{ cursor: 'pointer' }}
            >
              <h3>{app.application}</h3>
            </motion.div>
          </SpotlightCard>
        ))}
      </div>
    </motion.div>
  );
};
const SubscriptionForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    filterId: '',
    application: '',
    id: '',
    rules: [
      {
        headerStrings: [''],
        fileName: '',
        destinations: ['']
      }
    ]
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

  const generateJSON = () => {
    return {
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
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const json = generateJSON();
    console.log('Subscription JSON:', JSON.stringify(json, null, 2));
    alert('Subscription created! Check console for JSON output.');
  };

  const handleReset = () => {
    setFormData({
      filterId: '',
      application: '',
      id: '',
      rules: [{ headerStrings: [''], fileName: '', destination: '' }]
    });
  };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb">
        <Link to="/">Home</Link> → <span onClick={onBack} style={{ cursor: 'pointer', color: 'var(--ukpn-secondary)' }}>Subscriptions</span> → New
      </div>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 className="page-title">Create New Subscription</h1>
        <p style={{ color: '#9D1320', marginBottom: '2rem' }}>
          Manually create and manage subscription rules
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Filter ID</label>
            <input
              type="text"
              className="form-input"
              value={formData.filterId}
              onChange={(e) => setFormData({ ...formData, filterId: e.target.value })}
              placeholder="e.g., ADMS"
              required
            />
          </div>
          <div className="form-group">
            <label>Application</label>
            <input
              type="text"
              className="form-input"
              value={formData.application}
              onChange={(e) => setFormData({ ...formData, application: e.target.value })}
              placeholder="e.g., ADMS"
              required
            />
          </div>
          <div className="form-group">
            <label>ID</label>
            <input
              type="text"
              className="form-input"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="e.g., ADMS"
              required
            />
          </div>
        </div>

        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Rules</h3>
            <button type="button" className="button button-primary" onClick={addRule}>
              <Plus size={16} /> Add Rule
            </button>
          </div>

          <AnimatePresence>
            {formData.rules.map((rule, ruleIndex) => (
              <motion.div
                key={ruleIndex}
                className="rule-card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rule-header">
                  <span className="rule-title">Rule {ruleIndex + 1}</span>
                  {formData.rules.length > 1 && (
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => removeRule(ruleIndex)}
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Header String Values</label>
                    <button
                      type="button"
                      style={{
                        padding: '4px 8px',
                        background: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                  {rule.headerStrings.map((str, strIndex) => (
                    <div key={strIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={str}
                        onChange={(e) => updateHeaderString(ruleIndex, strIndex, e.target.value)}
                        placeholder="e.g., ZHV|D0132001|X|+|R|EELC|+|OPER"
                      />
                      {rule.headerStrings.length > 1 && (
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => removeHeaderString(ruleIndex, strIndex)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => addHeaderString(ruleIndex)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <Plus size={16} /> Add Header String
                  </button>
                </div>

                <div className="form-group">
                  <label>File Name Template</label>
                  <input
                    type="text"
                    className="form-input"
                    value={rule.fileName}
                    onChange={(e) => updateRule(ruleIndex, 'fileName', e.target.value)}
                    placeholder="{uuid}"
                  />
                </div>

                <div className="form-group">
                  <label>Destination Paths</label>
                  {rule.destinations.map((dest, destIndex) => (
                    <div key={destIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={dest}
                        onChange={(e) => updateDestination(ruleIndex, destIndex, e.target.value)}
                        placeholder="//UKPNFORvFS01/WorkHub/Disconnections/D0132Flows"
                        required
                      />
                      {rule.destinations.length > 1 && (
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => removeDestination(ruleIndex, destIndex)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => addDestination(ruleIndex)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <Plus size={16} /> Add Destination
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-success">
            Submit
          </button>
          <button type="button" className="button button-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
          <button type="button" className="button button-secondary" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="button button-primary" onClick={() => setShowPreview(true)}>
            <Eye size={16} /> Preview JSON
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">JSON Preview</h2>
                <span className="modal-close" onClick={() => setShowPreview(false)}>
                  <X size={24} />
                </span>
              </div>
              <pre>{JSON.stringify(generateJSON(), null, 2)}</pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Subscriptions;
