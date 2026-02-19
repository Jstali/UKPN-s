import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell, AlertCircle, CheckCircle, Clock, TrendingUp, XCircle, X, BarChart3, PieChart } from 'lucide-react';
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
  const [detailsData, setDetailsData] = React.useState({ title: '', items: [], value: 0, chartData: {} });

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

    setDetailsData({ title, items, value, chartData, type });
    setShowDetailsModal(true);
  };

  const navigateToDetails = (filterType) => {
    setShowDetailsModal(false);
    navigate('/dtc-audit', { state: { filterType, category: detailsData.type } });
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

      <AnimatePresence>
        {showDetailsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(8px)',
              padding: '20px'
            }}
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#f8f9fa',
                borderRadius: '12px',
                width: '1200px',
                maxWidth: '95%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{
                background: 'white',
                padding: '20px 32px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>{detailsData.title}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Analytics Dashboard</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6b7280',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {/* Metric Card */}
                <div 
                  onClick={() => navigateToDetails('all')}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '32px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Count
                  </div>
                  <div style={{ fontSize: '64px', fontWeight: '700', color: '#667eea' }}>
                    {detailsData.value}
                  </div>
                </div>

                {/* Charts Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  {/* Bar Chart */}
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <BarChart3 size={20} color="#667eea" />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Distribution by Category</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {detailsData.chartData.labels?.map((label, index) => {
                        const maxValue = Math.max(...detailsData.chartData.values);
                        const percentage = (detailsData.chartData.values[index] / maxValue) * 100;
                        return (
                          <div 
                            key={index}
                            onClick={() => navigateToDetails(label)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#4b5563' }}>
                              <span style={{ fontWeight: '500' }}>{label}</span>
                              <span style={{ fontWeight: '700', color: '#1f2937' }}>{detailsData.chartData.values[index]}</span>
                            </div>
                            <div style={{ background: '#f3f4f6', borderRadius: '6px', height: '24px', overflow: 'hidden', position: 'relative' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                                style={{
                                  height: '100%',
                                  background: detailsData.chartData.colors[index],
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  paddingRight: '8px'
                                }}
                              >
                                <span style={{ fontSize: '11px', color: 'white', fontWeight: '600' }}>
                                  {percentage > 15 ? `${percentage.toFixed(0)}%` : ''}
                                </span>
                              </motion.div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Donut Chart */}
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <PieChart size={20} color="#667eea" />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Percentage Breakdown</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      {/* Donut SVG */}
                      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                        {(() => {
                          const total = detailsData.chartData.values.reduce((a, b) => a + b, 0);
                          let currentAngle = 0;
                          return detailsData.chartData.values.map((value, index) => {
                            const percentage = value / total;
                            const angle = percentage * 360;
                            const radius = 70;
                            const innerRadius = 45;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;

                            const x1 = 90 + radius * Math.cos(startRad);
                            const y1 = 90 + radius * Math.sin(startRad);
                            const x2 = 90 + radius * Math.cos(endRad);
                            const y2 = 90 + radius * Math.sin(endRad);
                            const x3 = 90 + innerRadius * Math.cos(endRad);
                            const y3 = 90 + innerRadius * Math.sin(endRad);
                            const x4 = 90 + innerRadius * Math.cos(startRad);
                            const y4 = 90 + innerRadius * Math.sin(startRad);

                            const largeArc = angle > 180 ? 1 : 0;

                            return (
                              <motion.path
                                key={index}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`}
                                fill={detailsData.chartData.colors[index]}
                              />
                            );
                          });
                        })()}
                      </svg>
                      {/* Legend */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {detailsData.chartData.labels?.map((label, index) => {
                          const total = detailsData.chartData.values.reduce((a, b) => a + b, 0);
                          const percentage = ((detailsData.chartData.values[index] / total) * 100).toFixed(1);
                          return (
                            <div 
                              key={index} 
                              onClick={() => navigateToDetails(label)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '6px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                background: detailsData.chartData.colors[index],
                                flexShrink: 0
                              }} />
                              <div style={{ flex: 1, fontSize: '13px', color: '#4b5563' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: '500' }}>{label}</span>
                                  <span style={{ fontWeight: '700', color: '#1f2937', marginLeft: '8px' }}>{percentage}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    Items List ({detailsData.items.length})
                  </h3>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '8px'
                  }}>
                    {detailsData.items.length > 0 ? (
                      detailsData.items.map((item, index) => (
                        <div key={index} style={{
                          padding: '10px 12px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#374151',
                          fontFamily: 'monospace',
                          border: '1px solid #e5e7eb'
                        }}>
                          {item}
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', gridColumn: '1 / -1' }}>
                        No items found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                onClick={() => showDetails('subscriptions')}
                style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', backdropFilter: 'blur(10px)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <TrendingUp size={16} style={{ marginBottom: '6px' }} />
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
