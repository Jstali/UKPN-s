import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Clock, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PERFORMANCE_ITEMS } from '../../data/dashboardConfig';

// Generate mock graph data based on time range
const generateGraphData = (appName, range) => {
  const data = [];
  const baseTime = { ADMS: 1.8, Electralink: 2.1, MPRS: 1.5, MSBI: 2.4, 'SAP PI': 2.8 };
  const base = baseTime[appName] || 2.0;

  if (range === '24h') {
    for (let i = 0; i < 24; i++) {
      data.push({
        label: `${String(i).padStart(2, '0')}:00`,
        time: +(base + (Math.random() - 0.4) * 1.2).toFixed(2),
      });
    }
  } else if (range === '7d') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      data.push({
        label: day,
        time: +(base + (Math.random() - 0.4) * 1.0).toFixed(2),
      });
    });
  } else if (range === '30d') {
    for (let i = 1; i <= 30; i++) {
      data.push({
        label: `Day ${i}`,
        time: +(base + (Math.random() - 0.4) * 1.0).toFixed(2),
      });
    }
  } else if (range === '1y') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => {
      data.push({
        label: month,
        time: +(base + (Math.random() - 0.4) * 0.8).toFixed(2),
      });
    });
  }
  return data;
};

const RANGE_OPTIONS = [
  { key: '24h', label: '24 Hours' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '1y', label: '1 Year' },
];

const PerformanceGraph = ({ app, onClose }) => {
  const [range, setRange] = useState('24h');
  const graphData = useMemo(() => generateGraphData(app.name, range), [app.name, range]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '16px', padding: '24px',
          width: '720px', maxWidth: '90vw', maxHeight: '85vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
              {app.name} — Processing Time
            </h3>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Avg: <span style={{ color: '#16a34a', fontWeight: 700 }}>{app.avgTime}</span> &nbsp;|&nbsp; Threshold: {app.threshold}s &nbsp;|&nbsp; {app.files} files processed
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: '8px',
            padding: '8px', cursor: 'pointer', display: 'flex'
          }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Range Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
                border: range === opt.key ? '1.5px solid #c4b5fd' : '1.5px solid #e2e8f0',
                background: range === opt.key ? '#f5f3ff' : '#ffffff',
                color: range === opt.key ? '#7c3aed' : '#64748b',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={range === '24h' ? 2 : range === '30d' ? 4 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                unit="s"
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e293b', border: 'none', borderRadius: '8px',
                  fontSize: '12px', color: '#f8fafc', padding: '8px 12px'
                }}
                formatter={(value) => [`${value}s`, 'Avg Time']}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="time"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#colorTime)"
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PerformanceSection = ({ dashboardUpdatedAt }) => {
  const [selectedApp, setSelectedApp] = useState(null);

  return (
    <div style={{ padding: '10px 24px', marginTop: '16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Performance — Avg File Processing Time</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
            Measured at: {dashboardUpdatedAt}
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#8b5cf6',
            background: '#f5f3ff', padding: '4px 12px', borderRadius: '20px',
            border: '1px solid #c4b5fd'
          }}>Last 24 hours</span>
        </div>

        <div style={{ padding: '18px 24px' }}>
          {/* Overall Average */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', background: '#f8fafc', borderRadius: '10px', marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="#64748b" />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>Overall Average</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>2.4s</div>
          </div>

          {/* Per-Application Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {PERFORMANCE_ITEMS.map((app, index) => {
              const ratio = Math.min(app.actual / (app.threshold * 2), 1);

              return (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.06 }}
                  onClick={() => setSelectedApp(app)}
                  style={{
                    padding: '16px 16px', borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{app.name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>{app.avgTime}</span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    height: '7px', background: '#f1f5f9', borderRadius: '4px',
                    overflow: 'hidden', marginBottom: '8px'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ delay: 0.8 + index * 0.06, duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', background: '#22c55e', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>{app.files} files processed</span>
                    <span>Threshold: {app.threshold}s</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Graph Modal */}
      <AnimatePresence>
        {selectedApp && (
          <PerformanceGraph app={selectedApp} onClose={() => setSelectedApp(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerformanceSection;
