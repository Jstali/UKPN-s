import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell, AlertCircle, CheckCircle, Clock, TrendingUp, XCircle, X, BarChart3, PieChart, CircleCheckBig, PoundSterling, ShieldCheck, LayoutDashboard, ChevronRight } from 'lucide-react';
import AnimatedCounter from '../components/AnimatedCounter';
import { sapAuditData } from '../data/mockData';
import auditData from '../data/Audit_Data_Dumy';
import admsData from '../data/ADMS_DEV_V1.js';
import electralinkData from '../data/Electralink_DEV_V1.js';
import mprsData from '../data/MPRS_DEV_V1.js';
import msbiData from '../data/application subscription.js';

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [showFailedDropdown, setShowFailedDropdown] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [infoText, setInfoText] = React.useState('ℹ️ System Information: Regular maintenance scheduled for this weekend   •   •   •   📊 New reports available in SAP Audit section');
  const [dashboardUpdatedAt] = React.useState(() => new Date().toLocaleTimeString());

  const canEditInfo = user?.role === 'Business' || user?.role === 'Core Support' || user?.role === 'Admin';

  // Calculate subscription stats
  const allSubscriptions = [admsData, electralinkData, mprsData, msbiData];
  const validSubscriptions = allSubscriptions.filter(app => app.status === 'active');
  const invalidSubscriptions = allSubscriptions.filter(app => app.status !== 'active');
  const totalSubscriptions = allSubscriptions.length;
  const validCount = auditData.filter(item => item.events?.some(e => e.Event_Type === '2')).length;
  const deliveredCount = auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).length;
  const pendingCount = validCount - deliveredCount;

  const showDetails = (type) => {
    let title = '';
    let items = [];
    let value = 0;
    let chartData = {};

    switch(type) {
      case 'files':
        title = 'Files Received';
        items = auditData.map(item => item.Source_FileName);
        value = auditData.length;
        chartData = {
          labels: ['Valid', 'Invalid', 'Pending'],
          values: [78, 27, 27],
          colors: ['#10b981', '#ef4444', '#f59e0b']
        };
        break;
      case 'valid':
        title = 'Valid Subscriptions';
        items = validSubscriptions.map(app => app.Application);
        value = 78;
        chartData = {
          labels: ['ADMS', 'Electralink', 'MPRS', 'MSBI'],
          values: [25, 20, 18, 15],
          colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
        };
        break;
      case 'subscriptions':
        title = 'Total Subscriptions';
        items = allSubscriptions.map(app => app.Application);
        value = 105;
        chartData = {
          labels: ['Valid', 'Invalid'],
          values: [78, 27],
          colors: ['#10b981', '#ef4444']
        };
        break;
      case 'deliveries':
        title = 'Total Deliveries';
        items = auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName);
        value = 78;
        chartData = {
          labels: ['Delivered', 'Pending'],
          values: [78, 27],
          colors: ['#10b981', '#f59e0b']
        };
        break;
      case 'pending':
        title = 'Pending Delivery';
        items = auditData.filter(item => 
          item.events?.some(e => e.Event_Type === '2') && 
          !item.events?.some(e => e.Event_Type === '4')
        ).map(item => item.Source_FileName);
        value = 27;
        chartData = {
          labels: ['Pending', 'Delivered'],
          values: [27, 78],
          colors: ['#f59e0b', '#10b981']
        };
        break;
    }

    navigate('/analytics', { state: { title, items, value, chartData, type } });
  };

  const cards = [
    {
      title: 'DTC Audit',
      description: 'View and manage DTC audit records',
      icon: <img src={`${process.env.PUBLIC_URL}/Screenshot 2026-02-19 at 16-55-49 Untitled design - iOS Icon.png`} alt="DTC Audit" style={{ width: 32, height: 32 }} />,
      path: '/dtc-audit',
      lastUpdated: '2026-02-16 14:30:00'
    },
    {
      title: 'SAP Audit',
      description: 'View and manage SAP audit records',
      icon: <img src={`${process.env.PUBLIC_URL}/Screenshot 2026-02-19 at 16-55-49 Untitled design - iOS Icon.png`} alt="SAP Audit" style={{ width: 32, height: 32 }} />,
      path: '/sap-audit',
      lastUpdated: '2026-02-16 14:25:00'
    },
    {
      title: 'Subscriptions',
      description: 'Create and manage subscription rules',
      icon: <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_16-56-34_Untitled_design_-_iOS_Icon-removebg-preview.png`} alt="Subscriptions" style={{ width: 32, height: 32 }} />,
      path: '/subscriptions',
      lastUpdated: '2026-02-16 14:20:00'
    }
  ];

  const failedRecords = sapAuditData.filter(item => item.status === 'Failed');
  const marqueeText = failedRecords.map(item => 
    `⚠️ Failed: ${item.flow} - ${item.fileId} (${item.startDate})`
  ).join('   •   •   •   ');

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: '100%' }}>
      {/* Left Sidebar */}
      <nav className="home-sidebar">
        <div className="home-sidebar-header">
          <LayoutDashboard size={18} />
          <span>Navigation</span>
        </div>
        <div className="home-sidebar-nav">
          {[
            { label: 'DTC Audit', path: '/dtc-audit', icon: <img src={`${process.env.PUBLIC_URL}/Screenshot 2026-02-19 at 16-55-49 Untitled design - iOS Icon.png`} alt="DTC Audit" style={{ width: 20, height: 20 }} />, desc: 'DTC records & events' },
            { label: 'Non DTC Audit', path: '/sap-audit', icon: <img src={`${process.env.PUBLIC_URL}/Screenshot 2026-02-19 at 16-55-49 Untitled design - iOS Icon.png`} alt="Non DTC Audit" style={{ width: 20, height: 20 }} />, desc: 'Non-DTC audit monitoring' },
            { label: 'Subscription', path: '/subscriptions', icon: <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_16-56-34_Untitled_design_-_iOS_Icon-removebg-preview.png`} alt="Subscription" style={{ width: 20, height: 20 }} />, desc: 'Manage rules & routing' },
          ].map((item) => (
            <div
              key={item.path}
              className="home-sidebar-item"
              onClick={() => navigate(item.path)}
            >
              <div className="home-sidebar-item-icon">{item.icon}</div>
              <div className="home-sidebar-item-text">
                <span className="home-sidebar-item-label">{item.label}</span>
                <span className="home-sidebar-item-desc">{item.desc}</span>
              </div>
              <ChevronRight size={14} className="home-sidebar-item-arrow" />
            </div>
          ))}
        </div>
        <div className="home-sidebar-footer">
          <div className="home-sidebar-footer-dot" />
          <span>All systems operational</span>
        </div>
      </nav>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '32px' }}>
          {/* Welcome Heading */}
          <div style={{ padding: '20px 24px 16px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937', marginBottom: '3px' }}>
              Welcome to File Connect
            </h1>
            <div style={{ width: '60px', height: '4px', background: '#667eea', marginBottom: '0' }}></div>
          </div>

          {/* Edit Info Bar */}
          {canEditInfo && (
            <div style={{
              background: '#dbeafe',
              marginTop: '8px',
              marginLeft: '24px',
              marginRight: '24px',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: '12px'
            }}>
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  padding: '6px 14px',
                  background: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
              >
                Edit Info
              </button>
              <div style={{
                color: '#1e40af',
                fontWeight: '600',
                fontSize: '14px',
                flex: 1
              }}>
                {infoText}
              </div>
            </div>
          )}

          {/* View Failed Bar */}
          {failedRecords.length > 0 && (
            <div style={{
              background: '#fee2e2',
              padding: '12px 24px',
              marginTop: canEditInfo ? '8px' : '16px',
              marginBottom: '0',
              marginLeft: '24px',
              marginRight: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'relative',
              borderRadius: '12px'
            }}>
              <button
                onClick={() => setShowFailedDropdown(!showFailedDropdown)}
                style={{
                  padding: '6px 14px',
                  background: '#991b1b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
              >
                View Failed
              </button>
              {showFailedDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '16px',
                  background: 'white',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 100,
                  minWidth: '400px'
                }}>
                  {failedRecords.map((record, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px 16px',
                        borderBottom: index < failedRecords.length - 1 ? '1px solid #fee2e2' : 'none',
                        fontSize: '13px',
                        color: '#991b1b'
                      }}
                    >
                      ⚠️ {record.flow} - {record.fileId} ({record.startDate})
                    </div>
                  ))}
                </div>
              )}
              <div style={{
                color: '#991b1b',
                fontWeight: '600',
                fontSize: '14px',
                flex: 1
              }}>
                {marqueeText}
              </div>
            </div>
          )}

          {/* File Status Section */}
          <div style={{ padding: '10px 24px', marginTop: failedRecords.length > 0 ? '24px' : '16px' }}>

            {/* File Status Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="file-status-dashboard"
            >
              <div className="file-status-header">
                <div className="file-status-header-left">
                  <div className="file-status-dot" />
                  <h3>File Status</h3>
                </div>
                <span className="file-status-badge">Live — Last 24 hours</span>
              </div>

              <div className="file-status-grid">
                {[
                  { key: 'files', label: 'Files Received', value: auditData.length, icon: <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.04.11-removebg-preview.png`} alt="Files Received" style={{ width: 28, height: 28 }} />, color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#bfdbfe', trend: '+12%' },
                  { key: 'valid', label: 'Valid Subscriptions', value: 78, icon: (
                    <div className="icon-overlay-wrap">
                      <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.13.13-removebg-preview.png`} alt="Valid Subscriptions" style={{ width: 28, height: 28 }} />
                      {/* Cover the rubber stamp at bottom-right */}
                      <div className="icon-overlay-cover" style={{ width: '14px', height: '16px', bottom: '0px', right: '0px', background: '#ecfdf5' }} />
                      {/* Place a tick over the stamp area */}
                      <div className="icon-overlay-symbol" style={{ bottom: '-1px', right: '-2px', fontSize: '14px', color: '#1f2937' }}>
                        <CircleCheckBig size={13} strokeWidth={2.5} />
                      </div>
                    </div>
                  ), color: '#10b981', bgColor: '#ecfdf5', borderColor: '#a7f3d0', trend: '+5%' },
                  { key: 'subscriptions', label: 'Total Subscriptions', value: 105, icon: (
                    <div className="icon-overlay-wrap">
                      <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_16-56-34_Untitled_design_-_iOS_Icon-removebg-preview.png`} alt="Subscriptions" style={{ width: 28, height: 28 }} />
                      {/* Cover the $ symbol in the center */}
                      <div className="icon-overlay-cover" style={{ width: '10px', height: '12px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#f5f3ff' }} />
                      {/* Place £ over the dollar */}
                      <div className="icon-overlay-symbol" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '11px', fontWeight: '900', color: '#1f2937', lineHeight: 1 }}>
                        £
                      </div>
                    </div>
                  ), color: '#8b5cf6', bgColor: '#f5f3ff', borderColor: '#c4b5fd', trend: null },
                  { key: 'deliveries', label: 'Total Deliveries', value: 78, icon: <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.09.12-removebg-preview.png`} alt="Total Deliveries" style={{ width: 28, height: 28 }} />, color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fcd34d', trend: '+8%' },
                  { key: 'pending', label: 'Pending Delivery', value: 27, icon: <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.11.15-removebg-preview.png`} alt="Pending Delivery" style={{ width: 28, height: 28 }} />, color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca', trend: '-3%' },
                ].map((item, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                    onClick={() => showDetails(item.key)}
                    className="file-status-card"
                    style={{ '--card-accent': item.color, '--card-bg': item.bgColor, '--card-border': item.borderColor }}
                  >
                    <div className="file-status-card-accent" />
                    <div className="file-status-card-icon" style={{ background: item.bgColor, color: item.color }}>
                      {item.icon}
                    </div>
                    <div className="file-status-card-value" style={{ color: item.color }}>
                      <AnimatedCounter value={item.value} />
                    </div>
                    <div className="file-status-card-label">{item.label}</div>
                    {item.trend && (
                      <div className="file-status-card-trend" style={{
                        color: item.trend.startsWith('+') ? '#10b981' : '#ef4444',
                        background: item.trend.startsWith('+') ? '#ecfdf5' : '#fef2f2'
                      }}>
                        {item.trend.startsWith('+') ? <TrendingUp size={12} /> : null}
                        {item.trend}
                      </div>
                    )}
                    <div className="file-status-card-arrow">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="file-status-footer">
                <div className="file-status-footer-dot" />
                Updated: {dashboardUpdatedAt}
              </div>
            </motion.div>
          </div>
        </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Edit Information</h3>
            <textarea
              value={infoText}
              onChange={(e) => setInfoText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
