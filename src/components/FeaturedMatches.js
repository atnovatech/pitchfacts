import React, { useState, useEffect } from 'react';
import { getFixturesByDate } from '../services/api';
import CountdownTimer from './CountdownTimer';
import StatsPopup from './StatsPopup';
import { t } from '../i18n';

const PRIORITY_LEAGUES = [2, 39, 140, 135, 78, 61, 71, 128];

export default function FeaturedMatches({ language }) {
  const [featured, setFeatured] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchFeatured = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await getFixturesByDate(today);
        
        if (isMounted && data && Array.isArray(data)) {
          let allMatches = [];
          
          // Handle both API formats
          if (data.length > 0 && data[0].fixture) {
            // Flat format - each item has fixture property
            allMatches = data;
          } 
          else if (data.length > 0 && data[0].fixtures) {
            // Grouped format - each item has fixtures array
            data.forEach(leagueGroup => {
              if (leagueGroup.fixtures && Array.isArray(leagueGroup.fixtures)) {
                allMatches.push(...leagueGroup.fixtures);
              }
            });
          }
          
          // Sort by priority leagues
          const sorted = [...allMatches].sort((a, b) => {
            const aIndex = PRIORITY_LEAGUES.indexOf(a.league?.id);
            const bIndex = PRIORITY_LEAGUES.indexOf(b.league?.id);
            return aIndex - bIndex;
          });
          
          // Take first 3 matches
          const top = sorted.slice(0, 3);
          setFeatured(top);
        }
      } catch (error) {
        console.error('Failed to fetch featured matches:', error);
        setFeatured([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchFeatured();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#ccc', marginBottom: '12px' }}>
          {t(language, 'featuredMatches')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: '#1a1a1a',
              border: '1px solid #252525',
              borderRadius: '10px',
              padding: '14px',
              height: '100px',
            }}>
              <div style={{ textAlign: 'center', padding: '20px', color: '#444' }}>
                Loading...
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!featured.length) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#ccc', marginBottom: '12px' }}>
        {t(language, 'featuredMatches')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {featured.map(f => (
          <div
            key={f.fixture?.id || Math.random()}
            onClick={() => setSelectedFixture(f)}
            style={{
              background: '#1a1a1a',
              border: '1px solid #252525',
              borderRadius: '10px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#00c851'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#252525'}
          >
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
              {f.league?.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {f.teams?.home?.logo && <img src={f.teams.home.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
                <span style={{ fontSize: '11px', fontWeight: '600' }}>{f.teams?.home?.name}</span>
              </div>
              <span style={{ fontSize: '10px', color: '#555' }}>vs</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600' }}>{f.teams?.away?.name}</span>
                {f.teams?.away?.logo && <img src={f.teams.away.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
              </div>
            </div>
            <CountdownTimer targetDate={f.fixture?.date} compact />
            <div style={{ fontSize: '10px', color: '#444', marginTop: '8px' }}>
              📊 Stats & Preview →
            </div>
          </div>
        ))}
      </div>

      {selectedFixture && (
        <StatsPopup
          fixture={selectedFixture}
          onClose={() => setSelectedFixture(null)}
          language={language}
        />
      )}
    </div>
  );
}