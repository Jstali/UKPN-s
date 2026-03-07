import React, { useState, useCallback, useRef } from 'react';

export const FLOW_COLORS = [
  '#1e40af', '#7c3aed', '#0d9488', '#b45309', '#be123c',
  '#4338ca', '#0369a1', '#15803d', '#a16207', '#9333ea',
  '#0f766e', '#c2410c', '#1d4ed8', '#7e22ce', '#047857',
  '#b91c1c', '#4f46e5', '#0e7490', '#65a30d', '#dc2626',
];

export const APP_COLORS = [
  '#0891b2', '#d97706', '#7c3aed', '#059669', '#e11d48',
  '#2563eb', '#c026d3', '#ca8a04', '#0d9488', '#9333ea',
  '#dc2626', '#0284c7', '#16a34a', '#db2777', '#ea580c',
  '#4f46e5', '#0e7490', '#65a30d', '#be185d', '#1d4ed8',
];

export const EVENT_TYPE_COLORS = [
  '#6d28d9', '#0891b2', '#d97706', '#059669', '#e11d48',
  '#2563eb', '#c026d3', '#ca8a04', '#dc2626', '#0284c7',
  '#16a34a', '#db2777', '#ea580c', '#4f46e5', '#0e7490',
];

const ColorBar = ({ data, label, colors }) => {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0 });
  const barRef = useRef(null);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const handleMouseEnter = useCallback((i, e) => {
    setHovered(i);
    if (barRef.current) {
      const barRect = barRef.current.getBoundingClientRect();
      const segRect = e.currentTarget.getBoundingClientRect();
      const segCenter = segRect.left + segRect.width / 2 - barRect.left;
      setTooltipPos({ left: segCenter });
    }
  }, []);

  return (
    <div style={{ marginBottom: '14px', position: 'relative' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        {hovered !== null && (
          <div style={{
            position: 'absolute', bottom: '100%', left: tooltipPos.left,
            transform: 'translateX(-50%)', marginBottom: '6px',
            background: '#1e293b', color: '#fff', padding: '6px 12px', borderRadius: '8px',
            fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)', pointerEvents: 'none',
          }}>
            {data[hovered].name}: {data[hovered].count}
            <div style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0, borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent', borderTop: '5px solid #1e293b',
            }} />
          </div>
        )}
        <div ref={barRef} style={{
          display: 'flex', height: '28px', borderRadius: '8px', overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}>
          {data.map((item, i) => {
            const widthPct = (item.count / total) * 100;
            return (
              <div
                key={item.name}
                onMouseEnter={(e) => handleMouseEnter(i, e)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: `${widthPct}%`, background: colors[i % colors.length],
                  cursor: 'pointer', transition: 'opacity 0.2s',
                  opacity: hovered !== null && hovered !== i ? 0.5 : 1,
                }}
              />
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '8px' }}>
        {data.map((item, i) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors[i % colors.length], flexShrink: 0 }} />
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorBar;
