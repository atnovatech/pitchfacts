import React, { useState, useEffect } from 'react';
import { getLiveFixtures } from '../services/api';
import MatchCard from './MatchCard';
import StatsPopup from './StatsPopup';
import { t } from '../i18n';

export default function LiveTab({ language, favouriteTeams, toggleFavourite }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [error, setError] = useState(null);

  const fetchLive = async () => {
    try {
      const data = await getLiveFixtures();
      
      // Handle both API formats
      if (data && Array.isArray(data)) {
        // If it's flat format, keep as is for LiveTab (we don't group live matches)
        if (data.length > 0 && data[0].fixture) {
          setFixtures(data);
        } 
        // If it's grouped format, flatten it
        else if (data.length > 0 && data[0].fixtures) {
          const flattened = [];
          data.forEach(leagueGroup => {
            if (leagueGroup.fixtures && Array.isArray(leagueGroup.fixtures)) {
              flattened.push(...leagueGroup.fixtures);
            }
          });
          setFixtures(flattened);
        }
        else {
          setFixtures([]);
        }
      } else {
        setFixtures([]);
      }
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch live matches:', err);
      setError(err.message || 'Unable to load live matches');
      setFixtures([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  
  if (error) {
    return (
      <div className="empty-state">
        <div className="icon">⚠️</div>
        <p>{error}</p>
        <p style={{ fontSize: '12px', marginTop: '10px', color: '#444' }}>
          Will retry automatically
        </p>
      </div>
    );
  }

  if (!fixtures.length) return (
    <div className="empty-state">
      <div className="icon">🔴</div>
      <p>{t(language, 'noLive')}</p>
      <p style={{ fontSize: '12px', marginTop: '10px', color: '#444' }}>
        Check back during match times
      </p>
    </div>
  );

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '15px', fontSize: '13px', color: '#888',
      }}>
        <span className="pulse-dot" />
        <span>{fixtures.length} live match{fixtures.length > 1 ? 'es' : ''} • Updates every 60s</span>
      </div>

      {fixtures.map(f => (
        <MatchCard
          key={f.fixture.id}
          fixture={f}
          onClick={setSelectedFixture}
          language={language}
          favouriteTeams={favouriteTeams}
          toggleFavourite={toggleFavourite}
          showPreview={false}
        />
      ))}

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