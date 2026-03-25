
import React from 'react';

export default function AdZone({ type = 'box', label = 'Advertisement' }) {
  const styles = {
    box: { minHeight: '250px', width: '100%' },
    tall: { minHeight: '600px', width: '160px' },
    banner: { minHeight: '90px', width: '100%' },
    small: { minHeight: '120px', width: '100%' },
  };

  return (
    <div style={{
      ...styles[type],
      background: '#141414',
      border: '1px dashed #222',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#333',
      fontSize: '11px',
      gap: '5px',
    }}>
      <span style={{ fontSize: '20px' }}>📢</span>
      <span>{label}</span>
      <span style={{ fontSize: '9px', color: '#2a2a2a' }}>Ad Zone</span>
    </div>
  );
}