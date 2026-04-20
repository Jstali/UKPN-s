import React from 'react';

// Small metric pill displayed in the audit page header bar.
// Replaces the repeated inline `.dtc-kpi-chip` div blocks.
const KpiChip = ({ icon: Icon, iconColor, label, value }) => (
  <div className="dtc-kpi-chip" style={{ padding: '6px 12px', fontSize: '13px' }}>
    {Icon && <Icon size={13} color={iconColor} />}
    <span className="dtc-kpi-label" style={{ fontSize: '13px' }}>{label}</span>
    <span className="dtc-kpi-value" style={{ fontSize: '14px' }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
  </div>
);

export default KpiChip;
