import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, BarChart3, Activity, Filter, RotateCcw } from 'lucide-react';
import DataTable from '../components/DataTable';
import ColorBar, { FLOW_COLORS, EVENT_TYPE_COLORS } from '../components/ColorBar';
import api from '../utils/api';
import { exportToCSV } from '../utils/exportUtils';

const NonDtcAudit = () => {
  const navigate = useNavigate();
  const [showBars, setShowBars] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [auditData, setAuditData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sourceApp: '',
    sourceFile: '',
    status: '',
    eventType: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let allData = [];
        let token = null;
        do {
          const response = await api.fetchNonDtcAuditData(token, 500);
          allData = [...allData, ...(response.data || [])];
          token = response.continuationToken || null;
        } while (token);
        
        // Map SAP API fields to expected format
        const mappedData = allData.map(item => ({
          uniqueId: item.id || '',
          flow: item.sourceAppName || item.subscription || 'UNKNOWN',
          sourceFile: item.sourceFileName || '',
          fileId: item.id || '',
          sourcePath: item.sourcePath || '',
          eventType: item.events?.[0]?.eventType || '',
          startDate: item.events?.[0]?.timestamp ? new Date(item.events[0].timestamp).toLocaleString() : '',
          endDate: item.events?.[item.events.length - 1]?.timestamp ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString() : '',
          status: item.status || '',
          rawData: item
        }));
        
        setAuditData(mappedData);
        setFilteredData(mappedData);
      } catch (error) {
        console.error('Failed to fetch non-DTC audit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const applyFilters = () => {
    let filtered = [...auditData];
    
    if (filters.sourceApp) {
      filtered = filtered.filter(item => 
        item.flow?.toLowerCase().includes(filters.sourceApp.toLowerCase())
      );
    }
    if (filters.sourceFile) {
      filtered = filtered.filter(item => 
        item.sourceFile?.toLowerCase().includes(filters.sourceFile.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter(item => 
        item.status?.toLowerCase().includes(filters.status.toLowerCase())
      );
    }
    if (filters.eventType) {
      filtered = filtered.filter(item => 
        item.eventType?.toLowerCase().includes(filters.eventType.toLowerCase())
      );
    }
    
    setFilteredData(filtered);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      sourceApp: '',
      sourceFile: '',
      status: '',
      eventType: '',
      startDate: '',
      endDate: ''
    });
    setFilteredData(auditData);
    setShowFilters(false);
  };

  const uniqueFlows = [...new Set(filteredData.map(item => item.flow))].filter(Boolean).length;

  const flowCounts = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      const flow = row.flow || 'UNKNOWN';
      counts[flow] = (counts[flow] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const eventTypeCounts = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      const et = row.eventType || 'Unknown';
      counts[et] = (counts[et] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
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
    { key: 'status', label: 'Status' }
  ];

  return (
    <motion.div
      className="page-container non-dtc-audit-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Compact Header: Breadcrumb + KPIs + Actions — all in one row */}
      <div className="dtc-header-bar">
        <div className="dtc-header-left">
          <div className="dtc-breadcrumb-inline">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Non DTC Audit</span>
          </div>
        </div>

        {/* Inline KPI chips */}
        <div className="dtc-kpi-row">
          <div className="dtc-kpi-chip">
            <BarChart3 size={14} color="#6366f1" />
            <span className="dtc-kpi-label">Files</span>
            <span className="dtc-kpi-value">{filteredData.length.toLocaleString()}</span>
          </div>
          <div className="dtc-kpi-chip">
            <Activity size={14} color="#0ea5e9" />
            <span className="dtc-kpi-label">Flows</span>
            <span className="dtc-kpi-value">{uniqueFlows}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="dtc-header-actions">
          <button
            onClick={() => navigate('/non-dtc-audit-filter')}
            className="dtc-apps-toggle"
            style={{ background: '#667eea', color: 'white' }}
          >
            <Filter size={12} />
            Advanced Filters
          </button>
          <button
            className={`dtc-apps-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={12} />
            Quick Filters
          </button>
          <button
            className={`dtc-apps-toggle ${showBars ? 'active' : ''}`}
            onClick={() => setShowBars(!showBars)}
          >
            Charts
            <ChevronDown size={12} style={{
              transform: showBars ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              margin: '0 24px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Source Application
                </label>
                <input
                  type="text"
                  value={filters.sourceApp}
                  onChange={(e) => setFilters({ ...filters, sourceApp: e.target.value })}
                  placeholder="Filter by source app..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Source File
                </label>
                <input
                  type="text"
                  value={filters.sourceFile}
                  onChange={(e) => setFilters({ ...filters, sourceFile: e.target.value })}
                  placeholder="Filter by file name..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Status
                </label>
                <input
                  type="text"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  placeholder="Filter by status..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={resetFilters}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} />
                Reset
              </button>
              <button
                onClick={applyFilters}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Color Bars */}
      <AnimatePresence>
        {showBars && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="dtc-apps-bar"
          >
            {eventTypeCounts.length > 0 && (
              <ColorBar data={eventTypeCounts} label="Event Type" colors={EVENT_TYPE_COLORS} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px', flexDirection: 'column', gap: '14px',
          color: '#64748b', fontSize: '14px', fontWeight: 500,
        }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid #e2e8f0',
            borderTopColor: '#667eea', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
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
