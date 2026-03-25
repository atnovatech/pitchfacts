import React, { useState, useEffect } from 'react';
import { getFixturesByDate, getUpcomingFixtures } from '../services/api';
import MatchCard from './MatchCard';
import StatsPopup from './StatsPopup';
import { t } from '../i18n';

export default function StatsTab({ language, favouriteTeams, toggleFavourite }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStatsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const today = new Date().toISOString().split('T')[0];
        const next7 = new Date();
        next7.setDate(next7.getDate() + 7);
        const to = next7.toISOString().split('T')[0];

        const [todayData, upcomingData] = await Promise.all([
          getFixturesByDate(today),
          getUpcomingFixtures(today, to),
        ]);
        
        if (isMounted) {
          // Helper to flatten data
          const flattenData = (data) => {
            if (!data || !Array.isArray(data)) return [];
            if (data.length > 0 && data[0].fixture) return data;
            if (data.length > 0 && data[0].fixtures) {
              const flattened = [];
              data.forEach(leagueGroup => {
                if (leagueGroup.fixtures && Array.isArray(leagueGroup.fixtures)) {
                  flattened.push(...leagueGroup.fixtures);
                }
              });
              return flattened;
            }
            return [];
          };
          
          const todayProcessed = flattenData(todayData);
          const upcomingProcessed = flattenData(upcomingData);
          
          // Combine and deduplicate
          const allMatches = [...todayProcessed, ...upcomingProcessed];
          const uniqueMatches = [];
          const seenIds = new Set();
          
          allMatches.forEach(match => {
            if (match && match.fixture && match.fixture.id && !seenIds.has(match.fixture.id)) {
              seenIds.add(match.fixture.id);
              uniqueMatches.push(match);
            }
          });
          
          // Group by league for display
          const grouped = {};
          uniqueMatches.forEach(match => {
            if (match && match.league && match.league.id) {
              const leagueId = match.league.id;
              if (!grouped[leagueId]) {
                grouped[leagueId] = {
                  league: match.league,
                  fixtures: []
                };
              }
              grouped[leagueId].fixtures.push(match);
            }
          });
          
          setMatches(Object.values(grouped));
        }
      } catch (err) {
        console.error('Failed to fetch stats data:', err);
        if (isMounted) {
          setError(err.message || 'Unable to load stats data');
          setMatches([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchStatsData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  
  if (error) {
    return (
      <div className="empty-state">
        <div className="icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!matches || !matches.length) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <p>No matches available for stats</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '15px', fontSize: '13px', color: '#666' }}>
        📊 Click any match for full H2H stats, form guide, injuries & probable outcome
      </div>

      {matches.map(({ league, fixtures }) => (
        <div key={`${league?.id}-stats` || Math.random()} style={{ marginBottom: '25px' }}>
          <div className="league-header">
            <span style={{ fontSize: '20px' }}>{league?.flag}</span>
            <span>{league?.name}</span>
            <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>
              {fixtures?.length || 0} match{(fixtures?.length || 0) > 1 ? 'es' : ''}
            </span>
          </div>
          {fixtures && fixtures.map(f => (
            <MatchCard
              key={f.fixture?.id || Math.random()}
              fixture={f}
              onClick={setSelectedFixture}
              language={language}
              favouriteTeams={favouriteTeams}
              toggleFavourite={toggleFavourite}
              showPreview={true}
            />
          ))}
        </div>
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