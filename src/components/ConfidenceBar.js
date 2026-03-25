import React from 'react';

export default function ConfidenceBar({ level, language }) {
  const colors = ['#ff4444', '#ff8800', '#ffcc00', '#88cc00', '#00c851'];
  const labels = { en: 'Confidence', bn: 'আত্মবিশ্বাস', es: 'Confianza', fr: 'Confiance', pt: 'Confiança', ar: 'الثقة' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '10px', color: '#666' }}>{labels[language] || 'Confidence'}:</span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '14px',
              borderRadius: '2px',
              background: i <= level ? colors[level - 1] : '#2a2a2a',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '10px', color: colors[level - 1] }}>
        {['', 'Low', 'Fair', 'Good', 'High', 'Strong'][level]}
      </span>
    </div>
  );
}