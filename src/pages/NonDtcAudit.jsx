import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, BarChart3, Activity, Filter, RotateCcw, ArrowLeft } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { EVENT_TYPE_COLORS } from '../components/ColorBar';
import { useApp } from '../context/AppContext';
import { exportToCSV } from '../utils/exportUtils';

const mapItem = (item) => ({
  uniqueId: item.id || '',
  flow: item.sourceAppName || item.subscription || '-',
  sourceFile: item.sourceFileName || '',
  fileId: item.id || '',
  sourcePath: item.sourcePath || '',
  eventType: item.events?.[0]?.eventType || '',
  startDate: item.events?.[0]?.timestamp ? new Date(item.events[0].timestamp).toLocaleString() : '',
  endDate: item.events?.[item.events.length - 1]?.timestamp ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString() : '',
  status: item.status || '',
  rawData: item,
});

const NonDtcAudit = () => {
  const navigate = useNavigate();
  const { nonDtcAuditData, loading, dataComplete } = useApp();
  const [showBars, setShowBars] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sourceApp: 'All',
    subscription: 'All',
    status: 'All',
    eventType: 'All',
    sourceFile: '',
    fileId: '',
    fileCreated: '',
    eventFrom: '',
    eventTo: ''
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const auditData = useMemo(() => (nonDtcAuditData || []).map(mapItem), [nonDtcAuditData]);

  const filteredData = useMemo(() => {
    let result = [...auditData];
    if (appliedFilters.sourceApp !== 'All') result = result.filter(r => r.flow === appliedFilters.sourceApp);
    if (appliedFilters.subscription !== 'All') result = result.filter(r => r.rawData?.subscription === appliedFilters.subscription);
    if (appliedFilters.status !== 'All') result = result.filter(r => r.status === appliedFilters.status);
    if (appliedFilters.eventType !== 'All') result = result.filter(r => r.eventType === appliedFilters.eventType);
    if (appliedFilters.sourceFile) result = result.filter(r => r.sourceFile?.toLowerCase().includes(appliedFilters.sourceFile.toLowerCase()));
    if (appliedFilters.fileId) result = result.filter(r => r.fileId?.includes(appliedFilters.fileId));
    return result;
  }, [auditData, appliedFilters]);

  const applyFilters = () => { setAppliedFilters(filters); setShowFilters(false); };
  const resetFilters = () => {
    const empty = { sourceApp: 'All', subscription: 'All', status: 'All', eventType: 'All', sourceFile: '', fileId: '', fileCreated: '', eventFrom: '', eventTo: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const uniqueFlows = [...new Set(filteredData.map(r => r.flow))].filter(Boolean).length;

  const eventTypeCounts = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => { const et = row.eventType || 'Unknown'; counts[et] = (counts[et] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const columns = [
    { key: 'uniqueId', label: 'Unique ID' },
    { key: 'flow', label: 'Source Application' },
    { key: 'sourceFile', label: 'Source File' },
    { key: 'fileId', label: 'File ID' },
    { key: 'sourcePath', label: 'Source Path' },
    { key: 'eventType', label: 'Event Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'status', label: 'Status' },
  ];

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#fff', cursor: 'pointer' };
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' };

  return (
    <motion.div className="page-container non-dtc-audit-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div className="dtc-breadcrumb-inline">
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Non DTC Audit</span>
          </div>
        </div>
        <div className="dtc-kpi-row">
          <div className="dtc-kpi-chip"><BarChart3 size={14} color="#6366f1" /><span className="dtc-kpi-label">Files</span><span className="dtc-kpi-value">{filteredData.length.toLocaleString()}</span></div>
          <div className="dtc-kpi-chip"><Activity size={14} color="#0ea5e9" /><span className="dtc-kpi-label">Flows</span><span className="dtc-kpi-value">{uniqueFlows}</span></div>
        </div>
        <div className="dtc-header-actions">
          <button className={`dtc-apps-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={12} /> Filters <ChevronDown size={12} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>
          <button className={`dtc-apps-toggle ${showBars ? 'active' : ''}`} onClick={() => setShowBars(!showBars)}>
            Charts <ChevronDown size={12} style={{ transform: showBars ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            style={{ background: 'white', borderRadius: '12px', padding: '20px', margin: '0 24px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Filters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Source Application</label>
                  <select value={filters.sourceApp} onChange={e => setFilters({ ...filters, sourceApp: e.target.value })} style={inputStyle}>
                    <option value="All">All</option>
                    {[...new Set(auditData.map(r => r.flow).filter(Boolean))].sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subscription</label>
                  <select value={filters.subscription} onChange={e => setFilters({ ...filters, subscription: e.target.value })} style={inputStyle}>
                    <option value="All">All</option>
                    {[...new Set(auditData.map(r => r.rawData?.subscription).filter(Boolean))].sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={inputStyle}>
                    <option value="All">All</option>
                    {[...new Set(auditData.map(r => r.status).filter(Boolean))].sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Event Type</label>
                  <select value={filters.eventType} onChange={e => setFilters({ ...filters, eventType: e.target.value })} style={inputStyle}>
                    <option value="All">All</option>
                    {[...new Set(auditData.map(r => r.eventType).filter(Boolean))].sort().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Additional Filters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><label style={labelStyle}>Source File</label><input type="text" value={filters.sourceFile} onChange={e => setFilters({ ...filters, sourceFile: e.target.value })} placeholder="Enter source file name" style={inputStyle} /></div>
                <div><label style={labelStyle}>File ID</label><input type="text" value={filters.fileId} onChange={e => setFilters({ ...filters, fileId: e.target.value })} placeholder="Enter File ID" style={inputStyle} /></div>
                <div><label style={labelStyle}>File Created</label><input type="date" value={filters.fileCreated} onChange={e => setFilters({ ...filters, fileCreated: e.target.value })} style={inputStyle} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={resetFilters} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={applyFilters} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Apply Filters</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBars && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="dtc-apps-bar">
            {eventTypeCounts.length > 0 && <ColorBar data={eventTypeCounts} label="Event Type" colors={EVENT_TYPE_COLORS} />}
          </motion.div>
        )}
      </AnimatePresence>

      {(loading || (!dataComplete && nonDtcAuditData.length === 0)) ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '14px', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading Non-DTC audit data...
        </div>
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          compactColumns={[
            { key: 'uniqueId', label: 'Unique ID' },
            { key: 'flow', label: 'Source Application' },
            { key: 'sourceFile', label: 'Source File' },
            { key: 'eventType', label: 'Event Type' },
            { key: 'status', label: 'Status' },
          ]}
          onDownload={(row) => exportToCSV([row], columns, `non_dtc_audit_${row.uniqueId}`)}
          exportConfig={{ filename: 'non_dtc_audit_report' }}
          onViewDetail={() => navigate('/non-dtc-audit-detail')}
        />
      )}
    </motion.div>
  );
};

export default NonDtcAudit;
