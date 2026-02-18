import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell, AlertCircle, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react';
import { ShineBorder } from '../components/ui/shine-border';
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
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [detailsData, setDetailsData] = React.useState({ title: '', items: [] });

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

    switch(type) {
      case 'files':
        title = 'Files Received';
        items = auditData.map(item => item.Source_FileName);
        break;
      case 'valid':
        title = 'Valid Subscriptions';
        items = validSubscriptions.map(app => app.Application);
        break;
      case 'invalid':
        title = 'Invalid Subscriptions';
        items = invalidSubscriptions.map(app => app.Application);
        break;
      case 'subscriptions':
        title = 'Total Subscriptions';
        items = allSubscriptions.map(app => app.Application);
        break;
      case 'deliveries':
        title = 'Total Deliveries';
        items = auditData.filter(item => item.events?.some(e => e.Event_Type === '4')).map(item => item.Source_FileName);
        break;
      case 'pending':
        title = 'Pending Delivery';
        items = auditData.filter(item => 
          item.events?.some(e => e.Event_Type === '2') && 
          !item.events?.some(e => e.Event_Type === '4')
        ).map(item => item.Source_FileName);
        break;
    }

    setDetailsData({ title, items });
    setShowDetailsModal(true);
  };

  const downloadDetails = () => {
    const content = detailsData.items.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${detailsData.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    {
      title: 'DTC Audit',
      description: 'View and manage DTC audit records',
      icon: <FileText size={32} />,
      path: '/dtc-audit',
      lastUpdated: '2026-02-16 14:30:00'
    },
    {
      title: 'SAP Audit',
      description: 'View and manage SAP audit records',
      icon: <Database size={32} />,
      path: '/sap-audit',
      lastUpdated: '2026-02-16 14:25:00'
    },
    {
      title: 'Subscriptions',
      description: 'Create and manage subscription rules',
      icon: <Bell size={32} />,
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
          marginTop: '20px'
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
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <div style={{
              display: 'inline-block',
              paddingLeft: '100%',
              animation: 'marquee 20s linear infinite'
            }}>
              {infoText}
            </div>
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

      {showDetailsModal && (
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
            width: '600px',
            maxWidth: '90%',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>{detailsData.title}</h3>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              minHeight: '200px',
              maxHeight: 'calc(70vh - 150px)'
            }}>
              {detailsData.items.length > 0 ? (
                detailsData.items.map((item, index) => (
                  <div key={index} style={{
                    padding: '8px',
                    borderBottom: index < detailsData.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: '14px'
                  }}>
                    {item}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                  No items found
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={downloadDetails}
                style={{
                  padding: '8px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Download
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
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
                Close
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
          zIndex: 200
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
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <div style={{
              display: 'inline-block',
              paddingLeft: '100%',
              animation: 'marquee 20s linear infinite'
            }}>
              {marqueeText}
            </div>
          </div>
        </div>
      )}

      <div className="home-hero">
        <div className="home-content">
          <h1 className="page-title">Welcome to File Connect</h1>
          <div className="cards-grid">
            {cards.map((card, index) => (
              <ShineBorder
                key={card.title}
                className="card"
                color={["#4c4ebd", "#B16207", "#F8AF59"]}
                borderRadius={12}
                borderWidth={2}
                duration={10}
                onClick={() => navigate(card.path)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-icon">
                    {card.icon}
                  </div>
                  <h2 className="card-title">{card.title}</h2>
                  <p className="card-description">{card.description}</p>
                </motion.div>
              </ShineBorder>
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
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>System Overview</h3>
              <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.7 }}>Last 24 hours - {new Date().toLocaleTimeString()}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              <div 
                onClick={() => showDetails('files')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <FileText size={16} style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{auditData.length}</div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Files Received</div>
              </div>
              
              <div 
                onClick={() => showDetails('valid')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <CheckCircle size={16} style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  78
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Valid Subscriptions</div>
              </div>
              
              <div 
                onClick={() => showDetails('invalid')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <XCircle size={16} style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  27
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Invalid Subscriptions</div>
              </div>
              
              <div 
                onClick={() => showDetails('deliveries')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <Database size={16} style={{ marginBottom: '6px' }} />
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
                <Clock size={16} style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  27
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>Pending Delivery</div>
              </div>
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
