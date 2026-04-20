import React, { useState, useMemo } from 'react';
import { CheckCircle, X, Mail, AlertCircle } from 'lucide-react';
import { sendAuditExportEmail } from '../services/apiService';

// ─── Filter → payload conversion ────────────────────────────────────────────

const buildFiltersPayload = (filters, auditType) => {
  if (!filters) return null;
  const out = {};
  const add = (key, val) => { if (val && val !== 'All') out[key] = val; };

  if (auditType === 'DTC') {
    add('flow',                   filters.flow);
    add('version',                filters.version);
    add('fromRole',               filters.fromRole);
    add('fromMPID',               filters.fromMPID);
    add('toRole',                 filters.toRole);
    add('toMPID',                 filters.toMPID);
    add('sourceApplication',      filters.sourceApplication);
    add('destinationApplication', filters.destinationApplication);
    add('eventType',              filters.eventType);
    add('fileId',                 filters.fileId);
    if (filters.eventTimestampFrom) {
      try { out.fromDate = new Date(filters.eventTimestampFrom).toISOString(); } catch {}
    }
    if (filters.eventTimestampTo) {
      try { out.toDate = new Date(filters.eventTimestampTo + 'T23:59:59').toISOString(); } catch {}
    }
  } else {
    // SAP
    add('flow',                   filters.flow);
    add('sourceApplication',      filters.sourceApp);
    add('destinationApplication', filters.destinationApp);
    add('eventType',              filters.eventType);
    add('fileId',                 filters.fileId);
    if (filters.eventFrom) {
      const time = filters.eventFromTime || '00:00';
      try { out.fromDate = new Date(`${filters.eventFrom}T${time}`).toISOString(); } catch {}
    }
    if (filters.eventTo) {
      const time = filters.eventToTime || '23:59';
      try { out.toDate = new Date(`${filters.eventTo}T${time}:59`).toISOString(); } catch {}
    }
  }
  return Object.keys(out).length > 0 ? out : null;
};

const getFilterChips = (filters, auditType) => {
  if (!filters) return [];
  const chips = [];
  const add = (label, val) => { if (val && val !== 'All') chips.push({ label, value: val }); };

  if (auditType === 'DTC') {
    add('Flow',         filters.flow);
    add('Version',      filters.version);
    add('From Role',    filters.fromRole);
    add('From MPID',    filters.fromMPID);
    add('To Role',      filters.toRole);
    add('To MPID',      filters.toMPID);
    add('Source',       filters.sourceApplication);
    add('Destination',  filters.destinationApplication);
    add('Event Type',   filters.eventType);
    add('File ID',      filters.fileId);
    add('From',         filters.eventTimestampFrom);
    add('To',           filters.eventTimestampTo);
  } else {
    add('Flow',         filters.flow);
    add('Source',       filters.sourceApp);
    add('Destination',  filters.destinationApp);
    add('Event Type',   filters.eventType);
    add('File ID',      filters.fileId);
    add('From',         filters.eventFrom);
    add('To',           filters.eventTo);
  }
  return chips;
};

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));

// ─── Component ───────────────────────────────────────────────────────────────

const EmailModal = ({
  onClose,
  auditType    = 'DTC',
  appliedFilters = null,
  selectedDocIds = [],
}) => {
  const hasSelection = selectedDocIds.length > 0;

  const [email,   setEmail]   = useState('');
  const [scope,   setScope]   = useState(hasSelection ? 'selected' : 'filtered');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [apiError, setApiError] = useState('');
  const [touched, setTouched] = useState(false);

  const filterChips = useMemo(
    () => getFilterChips(appliedFilters, auditType),
    [appliedFilters, auditType],
  );

  const emailErr = touched && !isValidEmail(email) ? 'Enter a valid email address' : '';
  const canSubmit = isValidEmail(email) && !sending &&
    (scope === 'selected' ? hasSelection : true);

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValidEmail(email)) return;

    const payload = {
      email,
      auditType,
      ...(scope === 'selected'
        ? { selectedIds: selectedDocIds }
        : { filters: buildFiltersPayload(appliedFilters, auditType) || {} }),
    };

    setSending(true);
    setApiError('');
    const { data, error } = await sendAuditExportEmail(payload);
    setSending(false);

    if (error) {
      const msg =
        error.includes('404') ? 'API endpoint not found (404). The backend route may not be deployed yet in this environment.' :
        error.includes('401') || error.includes('403') ? 'Authentication failed (401/403). Check the API function key.' :
        error.includes('400') ? `Bad request — ${error}` :
        error.includes('500') ? 'Backend error (500). Please try again or contact the backend team.' :
        error;
      setApiError(msg);
    } else {
      setSuccess(data);
    }
  };

  const LABEL = { fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const INPUT = { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(15,23,42,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '460px', maxWidth: '94vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)', animation: 'fadeIn 0.18s ease',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={18} color="#4c4ebd" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Send Export by Email</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Send audit data as an Excel attachment</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {success ? (
          /* ── Success state ─────────────────────────────── */
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <CheckCircle size={52} color="#10b981" style={{ marginBottom: '14px' }} />
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Email Sent!</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Report sent to <strong>{success?.sentToEmail || email}</strong>
            </div>
            {success?.matchedDocuments != null && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {success.matchedDocuments} document{success.matchedDocuments !== 1 ? 's' : ''} · {success.exportedRows ?? '—'} rows exported
              </div>
            )}
            {success?.attachmentFileName && (
              <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
                📎 {success.attachmentFileName}
              </div>
            )}
            <button onClick={onClose} style={{ marginTop: '24px', padding: '10px 28px', background: '#4c4ebd', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              Close
            </button>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────── */
          <div style={{ padding: '20px 24px 24px' }}>

            {/* Email input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={LABEL}>Email Address</label>
              <input
                type="email"
                value={email}
                placeholder="recipient@example.com"
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                onFocus={(e) => (e.target.style.borderColor = '#4c4ebd')}
                style={{ ...INPUT, borderColor: emailErr ? '#ef4444' : '#e2e8f0' }}
                autoFocus
              />
              {emailErr && (
                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {emailErr}
                </div>
              )}
            </div>

            {/* Scope selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={LABEL}>Export Scope</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  border: `1.5px solid ${scope === 'selected' ? '#4c4ebd' : '#e2e8f0'}`,
                  borderRadius: '8px', cursor: hasSelection ? 'pointer' : 'not-allowed',
                  background: scope === 'selected' ? '#eef2ff' : '#fff',
                  opacity: hasSelection ? 1 : 0.5,
                }}>
                  <input type="radio" name="scope" value="selected" checked={scope === 'selected'} disabled={!hasSelection} onChange={() => setScope('selected')} style={{ accentColor: '#4c4ebd' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Selected rows</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {hasSelection ? `${selectedDocIds.length} file${selectedDocIds.length !== 1 ? 's' : ''} selected` : 'No rows selected — use checkboxes in the table'}
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  border: `1.5px solid ${scope === 'filtered' ? '#4c4ebd' : '#e2e8f0'}`,
                  borderRadius: '8px', cursor: 'pointer',
                  background: scope === 'filtered' ? '#eef2ff' : '#fff',
                }}>
                  <input type="radio" name="scope" value="filtered" checked={scope === 'filtered'} onChange={() => setScope('filtered')} style={{ accentColor: '#4c4ebd' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Current filtered result</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {filterChips.length > 0 ? `${filterChips.length} filter${filterChips.length !== 1 ? 's' : ''} applied` : 'No filters applied — exports all records'}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary chips */}
            <div style={{ marginBottom: apiError ? '14px' : '20px' }}>
              <label style={{ ...LABEL, marginBottom: '8px' }}>Summary</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ padding: '3px 10px', background: '#eef2ff', color: '#4c4ebd', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '1px solid #c7d2fe' }}>
                  Audit Type: {auditType}
                </span>

                {scope === 'selected' && hasSelection && (
                  <span style={{ padding: '3px 10px', background: '#d1fae5', color: '#065f46', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '1px solid #a7f3d0' }}>
                    Selected Files: {selectedDocIds.length}
                  </span>
                )}

                {scope === 'filtered' && filterChips.map(({ label, value }) => (
                  <span key={label} style={{ padding: '3px 10px', background: '#f1f5f9', color: '#334155', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                    {label}: {value}
                  </span>
                ))}

                {scope === 'filtered' && filterChips.length === 0 && (
                  <span style={{ padding: '3px 10px', background: '#fef3c7', color: '#92400e', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '1px solid #fde68a' }}>
                    All records (no filters)
                  </span>
                )}
              </div>
            </div>

            {/* API error */}
            {apiError && (
              <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#b91c1c', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                {apiError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '10px 22px', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 22px', background: canSubmit ? '#4c4ebd' : '#94a3b8',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontSize: '13px', fontWeight: 600, minWidth: '120px', justifyContent: 'center',
                }}
              >
                {sending ? (
                  <>
                    <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                    Sending...
                  </>
                ) : (
                  <><Mail size={14} /> Send Email</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailModal;
