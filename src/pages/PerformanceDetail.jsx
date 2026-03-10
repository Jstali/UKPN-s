import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, Filter, X, CheckSquare, Square, TrendingUp, Activity, ArrowRight } from 'lucide-react';
import { PERFORMANCE_ITEMS } from '../data/dashboardConfig';

const PerformanceDetail = () => {
  const navigate = useNavigate();
  const [showFilter, setShowFilter] = useState(false);
  const [selectedApps, setSelectedApps] = useState(
    PERFORMANCE_ITEMS.map(app => app.name)
  );

  const toggleApp = (name) => {
    setSelectedApps(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const selectAll = () => setSelectedApps(PERFORMANCE_ITEMS.map(app => app.name));
  const clearAll = () => setSelectedApps([]);

  const filteredItems = [...PERFORMANCE_ITEMS]
    .filter(app => selectedApps.includes(app.name))
    .sort((a, b) => b.actual - a.actual);

  const overallAvg = filteredItems.length > 0
    ? (filteredItems.reduce((sum, app) => sum + app.actual, 0) / filteredItems.length).toFixed(1)
    : '0.0';

  const maxThreshold = Math.max(...PERFORMANCE_ITEMS.map(a => a.threshold));
  const withinCount = filteredItems.filter(a => a.actual <= a.threshold).length;

  const getBarColor = (actual, threshold) => {
    const ratio = actual / threshold;
    if (ratio <= 0.6) return { bar: '#22c55e', bg: '#dcfce7' };
    if (ratio <= 0.85) return { bar: '#f59e0b', bg: '#fef3c7' };
    return { bar: '#ef4444', bg: '#fee2e2' };
  };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → Performance Detail
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h1 className="page-title" style={{ margin: 0, fontSize: '1.6rem' }}>
          Performance Detail
        </h1>
        <button
          onClick={() => setShowFilter(!showFilter)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s ease',
            border: showFilter ? '1.5px solid #c4b5fd' : '1.5px solid #e2e8f0',
            background: showFilter ? '#f5f3ff' : '#ffffff',
            color: showFilter ? '#7c3aed' : '#475569',
          }}
        >
          <Filter size={14} />
          Filter {selectedApps.length < PERFORMANCE_ITEMS.length && `(${selectedApps.length})`}
        </button>
      </div>

      {/* Filter Box */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
              padding: '16px 20px', marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Select Applications</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={selectAll} style={{
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px',
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer'
                  }}>Select All</button>
                  <button onClick={clearAll} style={{
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px',
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer'
                  }}>Clear All</button>
                  <button onClick={() => setShowFilter(false)} style={{
                    padding: '4px 8px', fontSize: '11px', borderRadius: '6px',
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center'
                  }}><X size={13} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {PERFORMANCE_ITEMS.map(app => (
                  <div
                    key={app.name}
                    onClick={() => toggleApp(app.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: selectedApps.includes(app.name) ? '1.5px solid #c4b5fd' : '1.5px solid #e2e8f0',
                      background: selectedApps.includes(app.name) ? '#f5f3ff' : '#ffffff',
                      color: selectedApps.includes(app.name) ? '#7c3aed' : '#64748b',
                      fontSize: '13px', fontWeight: 600, minWidth: '140px'
                    }}
                  >
                    {selectedApps.includes(app.name)
                      ? <CheckSquare size={15} color="#7c3aed" />
                      : <Square size={15} color="#94a3b8" />
                    }
                    {app.name}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { icon: <Gauge size={18} />, label: 'Overall Avg', value: `${overallAvg}s`, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          { icon: <Activity size={18} />, label: 'Applications', value: filteredItems.length, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { icon: <TrendingUp size={18} />, label: 'Within Threshold', value: `${withinCount}/${filteredItems.length}`, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              background: '#ffffff', borderRadius: '12px', padding: '16px 18px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: stat.bg, color: stat.color, border: `1px solid ${stat.border}`
              }}>
                {stat.icon}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Application Rows — List View with Progress Bars */}
      <div style={{
        background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 2fr 100px 100px 100px 40px',
          padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
          fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
          alignItems: 'center'
        }}>
          <span>System</span>
          <span>Performance</span>
          <span style={{ textAlign: 'center' }}>Avg Time</span>
          <span style={{ textAlign: 'center' }}>Threshold</span>
          <span style={{ textAlign: 'center' }}>Files</span>
          <span></span>
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No applications selected. Use the filter to select applications.
          </div>
        ) : (
          filteredItems.map((app, i) => {
            const barPercent = Math.min((app.actual / maxThreshold) * 100, 100);
            const thresholdPercent = (app.threshold / maxThreshold) * 100;
            const colors = getBarColor(app.actual, app.threshold);

            return (
              <motion.div
                key={app.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate('/performance-graph', { state: { app } })}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 2fr 100px 100px 100px 40px',
                  padding: '16px 20px', alignItems: 'center',
                  borderBottom: i < filteredItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s ease',
                }}
                whileHover={{ backgroundColor: '#f8fafc' }}
              >
                {/* System Name + Status */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>{app.name}</div>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                    background: app.actual <= app.threshold ? '#f0fdf4' : '#fef2f2',
                    color: app.actual <= app.threshold ? '#16a34a' : '#dc2626',
                    border: app.actual <= app.threshold ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  }}>
                    {app.actual <= app.threshold ? 'Healthy' : 'Exceeded'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ padding: '0 16px' }}>
                  <div style={{
                    position: 'relative', width: '100%', height: '22px',
                    background: '#f1f5f9', borderRadius: '11px', overflow: 'hidden'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPercent}%` }}
                      transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: '11px',
                        background: `linear-gradient(90deg, ${colors.bar}cc, ${colors.bar})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        paddingRight: '8px',
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>{app.avgTime}</span>
                    </motion.div>
                    {/* Threshold marker */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: `${thresholdPercent}%`,
                      width: '2px', background: '#475569', opacity: 0.4,
                    }} />
                  </div>
                </div>

                {/* Avg Time */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: '15px', fontWeight: 800,
                    color: colors.bar,
                  }}>{app.avgTime}</span>
                </div>

                {/* Threshold */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>{app.threshold}s</span>
                </div>

                {/* Files */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 700, color: '#1e293b',
                    background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px'
                  }}>{app.files}</span>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: 'center' }}>
                  <ArrowRight size={16} color="#94a3b8" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default PerformanceDetail;
