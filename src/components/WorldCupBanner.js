import React from 'react';
import { Link } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import { t } from '../i18n';

const WC_DATE = '2026-06-11T18:00:00Z';

export default function WorldCupBanner({ language }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1a2f5e 50%, #0d3b1e 100%)',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid #1e3a6e',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', right: '-20px', top: '-20px',
        fontSize: '120px', opacity: 0.05,
      }}>🏆</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFD700' }}>
                {t(language, 'worldCup')}
              </div>
              <div style={{ fontSize: '12px', color: '#88aadd' }}>
                🇺🇸 USA • 🇨🇦 Canada • 🇲🇽 Mexico
              </div>
            </div>
          </div>
          <CountdownTimer targetDate={WC_DATE} />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/world-cup-2026" style={{
            background: '#FFD700',
            color: '#000',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: '700',
          }}>
            {t(language, 'viewQualifiers')}
          </Link>
          <Link to="/world-cup-2026" style={{
            background: 'transparent',
            color: '#FFD700',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: '600',
            border: '1px solid #FFD700',
          }}>
            Groups →
          </Link>
        </div>
      </div>
    </div>
  );
}