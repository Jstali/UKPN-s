import React from 'react';

const EditModal = ({ infoText, onInfoTextChange, onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '24px',
        width: '500px', maxWidth: '90%'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Edit Information</h3>
        <textarea
          value={infoText}
          onChange={(e) => onInfoTextChange(e.target.value)}
          style={{
            width: '100%', minHeight: '100px', padding: '12px',
            border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: '#e5e7eb', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: '#1e40af', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
