import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell, AlertCircle, CheckCircle, Clock, TrendingUp, XCircle, X, BarChart3, PieChart } from 'lucide-react';
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
    <div className="page-container">
      {canEditInfo && (
        <div style={{
          background: '#dbeafe',
          borderBottom: '2px solid #93c5fd',
          padding: '12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
          zIndex: 200,
          marginTop: '20px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              marginLeft: '16px',
              padding: '6px 12px',
              background: '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            Edit Info
          </button>
          <div style={{
            color: '#1e40af',
            fontWeight: '600',
            fontSize: '14px',
            flex: 1,
            padding: '0 16px'
          }}>
            {infoText}
          </div>
        </div>
      )}

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

      {failedRecords.length > 0 && (
        <div style={{
          background: '#fee2e2',
          borderBottom: '2px solid #fca5a5',
          padding: '12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
          zIndex: 200,
          marginTop: '12px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setShowFailedDropdown(!showFailedDropdown)}
            style={{
              marginLeft: '16px',
              padding: '6px 12px',
              background: '#991b1b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
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
            flex: 1,
            padding: '0 16px'
          }}>
            {marqueeText}
          </div>
        </div>
      )}

      <div className="home-hero">
        <div className="home-content">
          <h1 className="page-title">Welcome to File Connect</h1>
          <div className="cards-grid">
            {cards.map((card, index) => (
              <motion.div
                key={card.title}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(card.path)}
              >
                <div className="card-icon">
                  {card.icon}
                </div>
                <h2 className="card-title">{card.title}</h2>
                <p className="card-description">{card.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="home-image">
          {/* Mini Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
              marginBottom: '20px',
              marginTop: '200px',
              maxWidth: '600px'
            }}
          >
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>File Status</h3>
              <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.7 }}>Last 24 hours</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              <div 
                onClick={() => showDetails('files')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.04.11-removebg-preview.png`} alt="Files Received" style={{ width: 24, height: 24, marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{auditData.length}</div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Files Received</div>
              </div>
              
              <div 
                onClick={() => showDetails('valid')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.13.13-removebg-preview.png`} alt="Valid Subscriptions" style={{ width: 24, height: 24, marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  78
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Valid Subscriptions</div>
              </div>
              
              <div 
                onClick={() => showDetails('subscriptions')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_16-56-34_Untitled_design_-_iOS_Icon-removebg-preview.png`} alt="Subscriptions" style={{ width: 24, height: 24, marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  105
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Total Subscriptions</div>
              </div>
              
              <div 
                onClick={() => showDetails('deliveries')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.09.12-removebg-preview.png`} alt="Total Deliveries" style={{ width: 24, height: 24, marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  78
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Total Deliveries</div>
              </div>
              
              <div 
                onClick={() => showDetails('pending')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <img src={`${process.env.PUBLIC_URL}/Screenshot_2026-02-19_at_18.11.15-removebg-preview.png`} alt="Pending Delivery" style={{ width: 24, height: 24, marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  27
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Pending Delivery</div>
              </div>
            </div>
            
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '10px', opacity: 0.7 }}>Updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </motion.div>
          
          <img 
            src={`${process.env.PUBLIC_URL}/100_website_hero-graphic-2025_artwork.avif`}
            alt="UKPN Network"
            onError={(e) => {
              console.error('Image failed to load:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
