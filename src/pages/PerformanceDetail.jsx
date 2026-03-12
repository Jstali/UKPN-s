import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, Filter, X, CheckSquare, Square, Activity, ArrowRight } from 'lucide-react';
import { PERFORMANCE_ITEMS } from '../data/dashboardConfig';

// Generate mini sparkline data for each app
const generateSparkData = (appName) => {
  const baseTime = { ADMS: 1.8, Electralink: 2.1, MPRS: 1.5, MSBI: 2.4, 'SAP PI': 2.8 };
  const base = baseTime[appName] || 2.0;
  const points = [];
  for (let i = 0; i < 12; i++) {
    points.push(+(base + (Math.sin(i * 0.8) * 0.3) + (Math.random() - 0.5) * 0.4).toFixed(2));
  }
  return points;
};

// SVG Sparkline component
const Sparkline = ({ data, color, width = 120, height = 36 }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const PerformanceDetail = () => {
  const navigate = useNavigate();
  const [showFilter, setShowFilter] = useState(false);
  const [selectedApps, setSelectedApps] = useState(
    PERFORMANCE_ITEMS.map(app => app.name)
  );

  const sparkData = useMemo(() => {
    const map = {};
    PERFORMANCE_ITEMS.forEach(app => { map[app.name] = generateSparkData(app.name); });
    return map;
  }, []);

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

  const getColor = (actual, threshold) => {
    if (actual <= threshold) return '#22c55e';
    return '#ef4444';
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { icon: <Gauge size={18} />, label: 'Overall Avg', value: `${overallAvg}s`, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          { icon: <Activity size={18} />, label: 'Applications', value: filteredItems.length, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
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

      {/* Application Rows — List View with Sparkline Graphs */}
      <div style={{
        background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px',
          padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
          fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
          alignItems: 'center'
        }}>
          <span>System</span>
          <span style={{ textAlign: 'center' }}>Trend</span>
          <span style={{ textAlign: 'center' }}>Avg Time</span>
          <span style={{ textAlign: 'center' }}>Files</span>
          <span></span>
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No applications selected. Use the filter to select applications.
          </div>
        ) : (
          filteredItems.map((app, i) => {
            const color = getColor(app.actual, app.threshold);

            return (
              <motion.div
                key={app.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate('/performance-graph', { state: { app } })}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < filteredItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s ease',
                }}
                whileHover={{ backgroundColor: '#f8fafc' }}
              >
                {/* System Name */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{app.name}</div>
                </div>

                {/* Sparkline Graph */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Sparkline data={sparkData[app.name]} color={color} />
                </div>

                {/* Avg Time */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color }}>{app.avgTime}</span>
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
