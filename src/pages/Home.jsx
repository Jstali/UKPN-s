import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { sapAuditData } from '../data/mockData';
import auditData from '../data/Audit_Data_Dumy';
import admsData from '../data/ADMS_DEV_V1.js';
import electralinkData from '../data/Electralink_DEV_V1.js';
import mprsData from '../data/MPRS_DEV_V1.js';
import msbiData from '../data/application subscription.js';
import { NAV_CARDS } from '../data/dashboardConfig';
import FileStatusSection from '../components/dashboard/FileStatusSection';
import ApplicationStatusSection from '../components/dashboard/ApplicationStatusSection';
import PerformanceSection from '../components/dashboard/PerformanceSection';
import EditModal from '../components/dashboard/EditModal';

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [showFailedDropdown, setShowFailedDropdown] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [infoText, setInfoText] = React.useState('ℹ️ System Information: Regular maintenance scheduled for this weekend   •   •   •   📊 New reports available in SAP Audit section');
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = React.useState(() => new Date().toLocaleTimeString());
  const [autoRefresh, setAutoRefresh] = React.useState(false);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setDashboardUpdatedAt(new Date().toLocaleTimeString());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const canEditInfo = user?.role === 'Business' || user?.role === 'Core Support' || user?.role === 'Admin';

  // Calculate subscription stats
  const allSubscriptions = [admsData, electralinkData, mprsData, msbiData];
  const validSubscriptions = allSubscriptions.filter(app => app.status === 'active');
  const validCount = auditData.filter(item => item.events?.some(e => e.Event_Type === '2')).length;
  const deliveredCount = auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).length;

  const showDetails = (type) => {
    const detailsMap = {
      files: {
        title: 'Files Received',
        items: auditData.map(item => item.Source_FileName),
        value: auditData.length,
        chartData: { labels: ['Valid', 'Invalid', 'Pending'], values: [78, 27, 27], colors: ['#10b981', '#ef4444', '#f59e0b'] }
      },
      valid: {
        title: 'Valid Subscriptions',
        items: validSubscriptions.map(app => app.Application),
        value: 78,
        chartData: { labels: ['ADMS', 'Electralink', 'MPRS', 'MSBI'], values: [25, 20, 18, 15], colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'] }
      },
      subscriptions: {
        title: 'Total Subscriptions',
        items: allSubscriptions.map(app => app.Application),
        value: 105,
        chartData: { labels: ['Valid', 'Invalid'], values: [78, 27], colors: ['#10b981', '#ef4444'] }
      },
      deliveries: {
        title: 'Total Deliveries',
        items: auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName),
        value: 78,
        chartData: { labels: ['Delivered', 'Pending'], values: [78, 27], colors: ['#10b981', '#f59e0b'] }
      },
      pending: {
        title: 'Pending Delivery',
        items: auditData.filter(item => item.events?.some(e => e.Event_Type === '2') && !item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName),
        value: 27,
        chartData: { labels: ['Pending', 'Delivered'], values: [27, 78], colors: ['#f59e0b', '#10b981'] }
      }
    };
    const detail = detailsMap[type];
    if (detail) navigate('/analytics', { state: { ...detail, type } });
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) setDashboardUpdatedAt(new Date().toLocaleTimeString());
  };

  const failedRecords = sapAuditData.filter(item => item.status === 'Failed');
  const marqueeText = failedRecords.map(item =>
    `⚠️ Failed: ${item.flow} - ${item.fileId} (${item.startDate})`
  ).join('   •   •   •   ');

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '32px', paddingLeft: '48px', paddingRight: '48px' }}>

        {/* Welcome Heading + Auto Refresh */}
        <div style={{ padding: '14px 24px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '3px' }}>
              Welcome to File Connect
            </h1>
            <div style={{ width: '44px', height: '3px', background: '#667eea', marginBottom: '0' }} />
          </div>
          <button
            onClick={handleToggleAutoRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px',
              border: `1.5px solid ${autoRefresh ? '#bbf7d0' : '#e2e8f0'}`,
              background: autoRefresh ? '#f0fdf4' : '#f8fafc',
              color: autoRefresh ? '#16a34a' : '#64748b',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} style={{ animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }} />
            {autoRefresh ? 'Disable Auto Refresh' : 'Enable Auto Refresh'}
          </button>
        </div>

        {/* Edit Info Bar — marquee shows for all roles with canEditInfo or Business, Edit button hidden for Business */}
        {(canEditInfo || user?.role === 'Business') && (
          <div style={{
            background: '#dbeafe', marginTop: '8px', marginLeft: '24px', marginRight: '24px',
            padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px'
          }}>
            {user?.role !== 'Business' && (
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  padding: '6px 14px', background: '#1e40af', color: 'white', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap'
                }}
              >
                Edit Info
              </button>
            )}
            <div style={{ color: '#1e40af', fontWeight: '600', fontSize: '14px', flex: 1 }}>{infoText}</div>
          </div>
        )}

        {/* View Failed Bar */}
        {failedRecords.length > 0 && (
          <div style={{
            background: '#fee2e2', padding: '12px 24px',
            marginTop: canEditInfo ? '8px' : '16px', marginBottom: '0',
            marginLeft: '24px', marginRight: '24px',
            display: 'flex', alignItems: 'center', gap: '12px',
            position: 'relative', borderRadius: '12px'
          }}>
            <button
              onClick={() => setShowFailedDropdown(!showFailedDropdown)}
              style={{
                padding: '6px 14px', background: '#991b1b', color: 'white', border: 'none',
                borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap'
              }}
            >
              View Failed
            </button>
            {showFailedDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: '16px',
                background: 'white', border: '1px solid #fca5a5', borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '300px',
                overflowY: 'auto', zIndex: 100, minWidth: '400px'
              }}>
                {failedRecords.map((record, index) => (
                  <div key={index} style={{
                    padding: '12px 16px',
                    borderBottom: index < failedRecords.length - 1 ? '1px solid #fee2e2' : 'none',
                    fontSize: '13px', color: '#991b1b'
                  }}>
                    ⚠️ {record.flow} - {record.fileId} ({record.startDate})
                  </div>
                ))}
              </div>
            )}
            <div style={{ color: '#991b1b', fontWeight: '600', fontSize: '14px', flex: 1 }}>{marqueeText}</div>
          </div>
        )}

        {/* Navigation Cards */}
        <div style={{ padding: '0 24px', marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {NAV_CARDS.map((item) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => navigate(item.path)}
                style={{
                  background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '14px',
                  padding: '20px 22px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '16px', transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}
                whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '12px', background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}>
                  <img src={`${process.env.PUBLIC_URL}/${item.icon}`} alt={item.label} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '3px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
                </div>
                <ChevronRight size={18} color="#475569" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Dashboard Sections */}
        <FileStatusSection
          auditDataLength={auditData.length}
          dashboardUpdatedAt={dashboardUpdatedAt}
          onShowDetails={showDetails}
        />

        <ApplicationStatusSection dashboardUpdatedAt={dashboardUpdatedAt} />

        <PerformanceSection dashboardUpdatedAt={dashboardUpdatedAt} />
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          infoText={infoText}
          onInfoTextChange={setInfoText}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default Home;
