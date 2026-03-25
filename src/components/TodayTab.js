import React, { useState, useEffect } from 'react';
import { getFixturesByDate } from '../services/api';
import MatchCard from './MatchCard';
import StatsPopup from './StatsPopup';
import { t } from '../i18n';

export default function TodayTab({ language, favouriteTeams, toggleFavourite }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const today = new Date().toISOString().split('T')[0];
        const data = await getFixturesByDate(today);
        
        if (isMounted) {
          // Handle both API formats
          if (data && Array.isArray(data)) {
            // Check if it's flat format (has fixture property)
            if (data.length > 0 && data[0].fixture) {
              // Convert flat format to grouped format
              const grouped = {};
              data.forEach(match => {
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
            // Already in grouped format
            else if (data.length > 0 && data[0].fixtures) {
              setMatches(data);
            }
            else {
              setMatches([]);
            }
          } else {
            setMatches([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err);
        if (isMounted) {
          setError(err.message || 'Unable to load matches');
          setMatches([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchMatches();
    
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

  if (!matches || !matches.length) return (
    <div className="empty-state">
      <div className="icon">⚽</div>
      <p>No matches scheduled for today</p>
    </div>
  );

  return (
    <div>
      {matches.map(({ league, fixtures }) => (
        <div key={league?.id || Math.random()} style={{ marginBottom: '25px' }}>
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