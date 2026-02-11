import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X, Eye, Download, ArrowLeft } from 'lucide-react';

const Subscriptions = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  
  const existingSubscriptions = [
    {
      application: 'Electralink',
      filterId: 'ELECTRALINK_v1',
      headerString1: 'ZHV|D0123004|P|EELC|%|%|TR01',
      destination1: '//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/IN/SAPP/Tet/destination/ELECTRALINK_1',
      headerString2: 'ZHV|D0123004|%|%|E|ABCD|TR01',
      destination2: '//UKPNNA-11',
      id: 'ELECTRALINK',
      DTC_SUB_DEV: 'replace_with_new_partition_key_value',
      _rid: 'nPkHAOvA5tABAAAAAAAAAA==',
      _self: 'dbs/nPkHAA==/colls/nPkHAOvA5tA=/docs/nPkHAOvA5tABAAAAAAAAAA==/',
      _etag: '"81008615-0000-1100-0000-68cd77990000"',
      _attachments: 'attachments/',
      _ts: 1758295961
    },
    {
      application: 'MPRS',
      filterId: 'MPRS_v1',
      headerString1: 'ZHV|D035001|Z|EELC|P|DCCO|TR01',
      destination1: '//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/IN/SAPP/Tet/destination/D0350_DCCO_1',
      headerString2: 'ZHV|D035001|%|EELC|%|DCCO|TR01',
      destination2: '//UKPNNA-11',
      id: 'MPRS',
      DTC_SUB_DEV: 'replace_with_new_partition_key_value',
      _rid: 'nPkHAOvA5tABAAAAAAAAAA==',
      _self: 'dbs/nPkHAA==/colls/nPkHAOvA5tA=/docs/nPkHAOvA5tABAAAAAAAAAA==/',
      _etag: '"81008615-0000-1100-0000-68cd77990000"',
      _attachments: 'attachments/',
      _ts: 1758295961
    }
  ];

  const downloadExcel = () => {
    alert('Excel download functionality would be implemented here');
  };

  if (showForm) {
    return <SubscriptionForm onBack={() => setShowForm(false)} />;
  }

  if (selectedApp) {
    return <ApplicationDetails app={selectedApp} onBack={() => setSelectedApp(null)} />;
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
      <h1 className="page-title">All Applications Data</h1>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="button button-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add New Subscription
        </button>
      </div>

      <div className="table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: '1800px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '120px' }}>Application</th>
                <th style={{ minWidth: '150px' }}>filterId</th>
                <th style={{ minWidth: '350px' }}>Header_String_1</th>
                <th style={{ minWidth: '500px' }}>destination_1</th>
                <th style={{ minWidth: '350px' }}>Header_String_2</th>
                <th style={{ minWidth: '300px' }}>destination_2</th>
              </tr>
            </thead>
            <tbody>
              {existingSubscriptions.map((sub, index) => (
                <tr key={index} onClick={() => setSelectedApp(sub)} style={{ cursor: 'pointer' }}>
                  <td><strong>{sub.application}</strong></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.filterId}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.headerString1}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{sub.destination1}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sub.headerString2}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{sub.destination2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button className="button button-success" onClick={downloadExcel}>
            <Download size={16} /> Download Excel
          </button>
          <Link to="/">
            <button className="button button-secondary">
              <ArrowLeft size={16} /> Back to Applications
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const ApplicationDetails = ({ app, onBack }) => {
  const downloadTxt = () => {
    const jsonData = {
      filterId: app.filterId,
      rules: [
        {
          Header_String: app.headerString1,
          destination: app.destination1
        },
        {
          Header_String: app.headerString2,
          destination: app.destination2
        }
      ],
      Application: app.application,
      id: app.id,
      DTC_SUB_DEV: app.DTC_SUB_DEV,
      _rid: app._rid,
      _self: app._self,
      _etag: app._etag,
      _attachments: app._attachments,
      _ts: app._ts
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.application}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const jsonData = {
    filterId: app.filterId,
    rules: [
      {
        Header_String: app.headerString1,
        destination: app.destination1
      },
      {
        Header_String: app.headerString2,
        destination: app.destination2
      }
    ],
    Application: app.application,
    id: app.id,
    DTC_SUB_DEV: app.DTC_SUB_DEV,
    _rid: app._rid,
    _self: app._self,
    _etag: app._etag,
    _attachments: app._attachments,
    _ts: app._ts
  };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="breadcrumb">
        <Link to="/">Home</Link> → <span onClick={onBack} style={{ cursor: 'pointer', color: 'var(--ukpn-secondary)' }}>Subscriptions</span> → {app.application}
      </div>
      <h1 className="page-title">{app.application}</h1>

      <div className="table-container">
        <pre style={{ 
          background: '#1e1e1e', 
          color: '#d4d4d4', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          overflow: 'auto',
          fontSize: '0.9rem',
          lineHeight: '1.6'
        }}>
          {JSON.stringify(jsonData, null, 2)}
        </pre>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button className="button button-success" onClick={downloadTxt}>
            <Download size={16} /> Download
          </button>
          <button className="button button-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Applications
          </button>
        </div>
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
        destination: ''
      }
    ]
  });

  const [showPreview, setShowPreview] = useState(false);

  const addRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { headerStrings: [''], fileName: '', destination: '' }]
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

  const generateJSON = () => {
    return {
      filterId: formData.filterId,
      rules: formData.rules.map(rule => ({
        Header_String: {
          value: rule.headerStrings.filter(s => s.trim() !== ''),
          fileName: rule.fileName || '{uuid}'
        },
        destination: rule.destination
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
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
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
                  <label>Header String Values</label>
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
                  <label>Destination Path</label>
                  <input
                    type="text"
                    className="form-input"
                    value={rule.destination}
                    onChange={(e) => updateRule(ruleIndex, 'destination', e.target.value)}
                    placeholder="//UKPNFORvFS01/WorkHub/Disconnections/D0132Flows"
                    required
                  />
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
