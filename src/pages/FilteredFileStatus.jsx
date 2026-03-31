import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { formatDateTime } from '../utils/auditUtils';

const FilteredFileStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { filteredData = [], startDate, endDate, statusFilter } = location.state || {};

  const downloadCSV = () => {
    const headers = ['File Name', 'Created', 'Status', 'Application', 'Flow'];
    const rows = filteredData.map(file => {
      const hasDelivered = file.events?.some(e => String(e.Event_Type) === '4');
      const hasFailed = file.events?.some(e => {
        const s = (e.Status || e.status || '').toLowerCase();
        if (s === 'duplicate checksum') return false;
        return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
      });
      const status = hasFailed ? 'Failed' : hasDelivered ? 'Delivered' : 'Pending';

      return [
        file.Source_FileName || '-',
        formatDateTime(file.Created || file.timestamp),
        status,
        file.Application_Name || '-',
        file.Flow_Version || '-',
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered-file-status-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterSummary = useMemo(() => {
    const parts = [];
    const statusLabels = {
      delivered: 'Delivered',
      pending: 'Pending',
      failed: 'Failed',
      duplicate: 'Duplicate Checksum',
    };
    if (statusFilter && statusFilter !== 'all') parts.push(`Status: ${statusLabels[statusFilter] || statusFilter}`);
    if (startDate) parts.push(`From: ${startDate}`);
    if (endDate) parts.push(`To: ${endDate}`);
    return parts.length > 0 ? parts.join(' | ') : 'All Files';
  }, [statusFilter, startDate, endDate]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '20px 24px',
        marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} style={{
            padding: '8px 16px', background: '#f1f5f9', border: 'none',
            borderRadius: '8px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#475569',
          }}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
              Filtered File Status
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
              {filterSummary}
            </p>
          </div>
        </div>
        <button onClick={downloadCSV} disabled={filteredData.length === 0} style={{
          padding: '8px 16px', background: filteredData.length === 0 ? '#cbd5e1' : '#10b981',
          color: '#fff', border: 'none', borderRadius: '8px',
          cursor: filteredData.length === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600,
        }}>
          <Download size={16} />
          Download CSV
        </button>
      </div>

      <div style={{
        background: 'white', borderRadius: '12px', padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            Results ({filteredData.length} files)
          </h3>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            No files found matching the filter criteria
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569' }}>File Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Application</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569' }}>Flow</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((file, idx) => {
                  const hasDelivered = file.events?.some(e => String(e.Event_Type) === '4');
                  const hasFailed = file.events?.some(e => {
                    const s = (e.Status || e.status || '').toLowerCase();
                    if (s === 'duplicate checksum') return false;
                    return s === 'failed' || s === 'invalid subscription' || s === 'checksum mismatch';
                  });
                  const hasDuplicateChecksum = file.events?.some(e => 
                    (e.Status || e.status || '').toLowerCase() === 'duplicate checksum'
                  );
                  
                  const status = hasDuplicateChecksum ? 'Duplicate Checksum' : hasFailed ? 'Failed' : hasDelivered ? 'Delivered' : 'Pending';
                  const statusColor = hasDuplicateChecksum ? '#8b5cf6' : hasFailed ? '#ef4444' : hasDelivered ? '#10b981' : '#f59e0b';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                        {file.Source_FileName || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                        {formatDateTime(file.Created || file.timestamp)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px', background: `${statusColor}20`,
                          color: statusColor, borderRadius: '4px',
                          fontSize: '12px', fontWeight: 600,
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                        {file.Application_Name || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
                        {file.Flow_Version || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilteredFileStatus;
