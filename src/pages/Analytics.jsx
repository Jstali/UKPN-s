import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, PieChart } from 'lucide-react';

const Analytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title, value, chartData, items } = location.state || {};
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 50;

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
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/">Home</Link> → Analytics
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginTop: '20px' }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '24px'
          }}
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        {/* Metric Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </div>
          <div style={{ fontSize: '64px', fontWeight: '700', color: '#667eea' }}>
            {value}
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
              {chartData.labels?.map((label, index) => {
                const percentage = (chartData.values[index] / totalValue) * 100;
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#4b5563' }}>
                      <span style={{ fontWeight: '500' }}>{label}</span>
                      <span style={{ fontWeight: '700', color: '#1f2937' }}>{chartData.values[index]}</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: '6px', height: '24px', overflow: 'hidden', position: 'relative' }}>
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
                  let currentAngle = 0;
                  return chartData.values.map((value, index) => {
                    const percentage = value / totalValue;
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
              {/* Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chartData.labels?.map((label, index) => {
                  const percentage = ((chartData.values[index] / totalValue) * 100).toFixed(1);
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: chartData.colors[index],
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
            Items List ({items?.length || 0})
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  background: currentPage === 1 ? '#e5e7eb' : '#667eea',
                  color: currentPage === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  background: currentPage === totalPages ? '#e5e7eb' : '#667eea',
                  color: currentPage === totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
