import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, PieChart } from 'lucide-react';

const Analytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title, value, chartData, items } = location.state || {};
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 30;

  if (!chartData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No data available</p>
        <button onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const totalValue = chartData.values.reduce((a, b) => a + b, 0);
  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items?.slice(startIndex, endIndex) || [];

  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, alignSelf: 'stretch' }}>

      {/* Breadcrumb + Back button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="breadcrumb" style={{ margin: 0 }}>
          <Link to="/">Home</Link> → Analytics
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '7px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          <ArrowLeft size={15} />
          Back to Home
        </button>
      </div>

      {/* Top row: Metric card + Charts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: '14px' }}>

        {/* Metric Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', fontWeight: '600' }}>
            {title}
          </div>
          <div style={{ fontSize: '58px', fontWeight: '800', color: '#667eea', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>Total count</div>
        </div>

        {/* Bar Chart */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BarChart3 size={20} color="#667eea" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Distribution by Category</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {chartData.labels?.map((label, index) => {
              const percentage = (chartData.values[index] / totalValue) * 100;
              return (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', color: '#4b5563' }}>
                    <span style={{ fontWeight: '500' }}>{label}</span>
                    <span style={{ fontWeight: '700', color: '#1f2937' }}>{chartData.values[index]}</span>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: '6px', height: '24px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: chartData.colors[index],
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '8px'
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'white', fontWeight: '600' }}>
                        {percentage > 15 ? `${percentage.toFixed(1)}%` : ''}
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
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <PieChart size={20} color="#667eea" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Percentage Breakdown</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <svg width="160" height="160" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
              {(() => {
                let currentAngle = 0;
                return chartData.values.map((val, index) => {
                  const percentage = val / totalValue;
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
                      fill={chartData.colors[index]}
                    />
                  );
                });
              })()}
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chartData.labels?.map((label, index) => {
                const percentage = ((chartData.values[index] / totalValue) * 100).toFixed(1);
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '14px', height: '14px',
                      borderRadius: '4px',
                      background: chartData.colors[index],
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, fontSize: '14px', color: '#4b5563' }}>
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

      {/* Items List — grows to fill remaining space */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
          Items List ({items?.length || 0})
        </h3>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '8px',
          alignContent: 'start',
          marginBottom: currentItems.length > 0 && totalPages > 1 ? '14px' : '0'
        }}>
          {currentItems.length > 0 ? (
            currentItems.map((item, index) => (
              <div key={index} style={{
                padding: '10px 14px',
                background: '#f9fafb',
                borderRadius: '7px',
                fontSize: '13px',
                color: '#374151',
                fontFamily: 'monospace',
                border: '1px solid #e5e7eb',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '16px', gridColumn: '1 / -1' }}>
              No items found
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 12px',
                background: currentPage === 1 ? '#e5e7eb' : '#667eea',
                color: currentPage === 1 ? '#9ca3af' : 'white',
                border: 'none', borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600'
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 12px',
                background: currentPage === totalPages ? '#e5e7eb' : '#667eea',
                color: currentPage === totalPages ? '#9ca3af' : 'white',
                border: 'none', borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
