import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gauge, Clock } from 'lucide-react';
import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const generateGraphData = (appName, range, customFrom, customTo) => {
  const data = [];
  const baseTime = { ADMS: 1.8, Electralink: 2.1, MPRS: 1.5, MSBI: 2.4, 'SAP PI': 2.8 };
  const base = baseTime[appName] || 2.0;

  if (range === '24h') {
    for (let i = 0; i < 24; i++) data.push({ label: `${String(i).padStart(2, '0')}:00`, time: +(base + (Math.random() - 0.4) * 1.2).toFixed(2) });
  } else if (range === '7d') {
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => data.push({ label: d, time: +(base + (Math.random() - 0.4) * 1.0).toFixed(2) }));
  } else if (range === '30d') {
    for (let i = 1; i <= 30; i++) data.push({ label: `Day ${i}`, time: +(base + (Math.random() - 0.4) * 1.0).toFixed(2) });
  } else if (range === '1y') {
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach(m => data.push({ label: m, time: +(base + (Math.random() - 0.4) * 0.8).toFixed(2) }));
  } else if (range === 'custom' && customFrom && customTo) {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    const diffDays = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1);
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      data.push({ label, time: +(base + (Math.random() - 0.4) * 1.0).toFixed(2) });
    }
  }
  return data;
};

const RANGE_OPTIONS = [
  { key: '24h', label: '24 Hours' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'custom', label: 'Custom' },
];

const PerformanceGraphPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const app = location.state?.app;
  const [range, setRange] = useState('24h');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const graphData = useMemo(() => app ? generateGraphData(app.name, range, customFrom, customTo) : [], [app, range, customFrom, customTo]);

  if (!app) {
    navigate('/');
    return null;
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/">Home</Link> → Performance → {app.name}
      </div>

      <h1 className="page-title" style={{ margin: 0, paddingBottom: '0.5rem', fontSize: '1.6rem' }}>
        {app.name} — Performance
      </h1>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
          overflow: 'hidden', marginTop: '16px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gauge size={18} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              {app.name} — Processing Time
            </h3>
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#8b5cf6',
            background: '#f5f3ff', padding: '4px 12px', borderRadius: '20px',
            border: '1px solid #c4b5fd'
          }}>{range === '24h' ? 'Last 24 hours' : range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : range === 'custom' && customFrom && customTo ? `${customFrom} to ${customTo}` : 'Custom Range'}</span>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Stats Row */}
          <div style={{
            display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1, minWidth: '150px', padding: '14px 18px', background: '#f0fdf4',
              borderRadius: '10px', border: '1px solid #bbf7d0'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Average Time</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>{app.avgTime}</div>
            </div>
            <div style={{
              flex: 1, minWidth: '150px', padding: '14px 18px', background: '#f8fafc',
              borderRadius: '10px', border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Threshold</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{app.threshold}s</div>
            </div>
            <div style={{
              flex: 1, minWidth: '150px', padding: '14px 18px', background: '#f8fafc',
              borderRadius: '10px', border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Files Processed</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{app.files}</div>
            </div>
          </div>

          {/* Range Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setRange(opt.key)} style={{
                padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: range === opt.key ? '1.5px solid #c4b5fd' : '1.5px solid #e2e8f0',
                background: range === opt.key ? '#f5f3ff' : '#ffffff',
                color: range === opt.key ? '#7c3aed' : '#64748b',
              }}>{opt.label}</button>
            ))}
            {range === 'custom' && (() => {
              const today = new Date();
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(today.getDate() - 30);
              const maxDate = today.toISOString().split('T')[0];
              const minDate = thirtyDaysAgo.toISOString().split('T')[0];
              return (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>From:</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    min={minDate}
                    max={customTo || maxDate}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                      border: '1.5px solid #e2e8f0', color: '#1e293b', outline: 'none',
                    }}
                  />
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>To:</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    min={customFrom || minDate}
                    max={maxDate}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                      border: '1.5px solid #e2e8f0', color: '#1e293b', outline: 'none',
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* Chart */}
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval={range === '24h' ? 2 : range === '30d' ? 4 : range === 'custom' ? Math.max(0, Math.floor(graphData.length / 15)) : 0} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} unit="s" domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f8fafc', padding: '8px 12px' }}
                  formatter={(value) => [`${value}s`, 'Avg Time']}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="time" stroke="#22c55e" strokeWidth={2.5} fill="url(#colorTime)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PerformanceGraphPage;
