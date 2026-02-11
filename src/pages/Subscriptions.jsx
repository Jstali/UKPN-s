import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X, Eye } from 'lucide-react';

const Subscriptions = () => {
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
        <Link to="/">Home</Link> → Subscriptions
      </div>
      <h1 className="page-title">Subscriptions</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Manually create and manage subscription rules
      </p>

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
