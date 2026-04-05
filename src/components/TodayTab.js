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

        // No argument needed — backend handles date
        const data = await getFixturesByDate();

        if (!isMounted) return;

        if (!data || !Array.isArray(data)) {
          setMatches([]);
          return;
        }

        // Already grouped format [{league, fixtures}]
        if (data.length > 0 && data[0]?.fixtures) {
          setMatches(data);
          return;
        }

        // Flat format [{fixture, league, teams, goals}]
        if (data.length > 0 && data[0]?.fixture) {
          const grouped = {};
          data.forEach(match => {
            const leagueId = match?.league?.id;
            if (!leagueId) return;
            if (!grouped[leagueId]) {
              grouped[leagueId] = {
                league: {
                  ...match.league,
                  // Ensure flag exists
                  flag: match.league?.flag || getLeagueFlag(leagueId),
                },
                fixtures: []
              };
            }
            grouped[leagueId].fixtures.push(match);
          });
          setMatches(Object.values(grouped));
          return;
        }

        setMatches([]);

      } catch (err) {
        console.error('Failed to fetch matches:', err);
        if (isMounted) {
          setError(err.message || 'Unable to load matches');
          setMatches([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMatches();
    return () => { isMounted = false; };
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div className="spinner" style={{ margin: '0 auto 15px' }} />
      <p style={{ color: '#666', fontSize: '13px' }}>Loading today's matches...</p>
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <div className="icon">⚠️</div>
      <p style={{ color: '#ff6b6b' }}>{error}</p>
      <p style={{ fontSize: '12px', color: '#444', marginTop: '8px' }}>
        Data updates at midnight UTC daily
      </p>
    </div>
  );

  if (!matches.length) return (
    <div className="empty-state">
      <div className="icon">⚽</div>
      <p>No matches scheduled for today</p>
      <p style={{ fontSize: '12px', color: '#444', marginTop: '8px' }}>
        Check the Upcoming tab for future fixtures
      </p>
    </div>
  );

  return (
    <div>
      {/* Match count summary */}
      <div style={{
        fontSize: '12px', color: '#555', marginBottom: '15px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span>📅</span>
        <span>
          {matches.reduce((sum, l) => sum + (l.fixtures?.length || 0), 0)} matches
          across {matches.length} competition{matches.length > 1 ? 's' : ''} today
        </span>
      </div>

      {matches.map(({ league, fixtures }) => (
        <div key={league?.id || Math.random()} style={{ marginBottom: '25px' }}>
          {/* League header */}
          <div className="league-header">
            {league?.logo
              ? <img src={league.logo} alt={league.name}
                  style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              : <span style={{ fontSize: '18px' }}>{league?.flag || '⚽'}</span>
            }
            <span style={{ fontWeight: '700', color: '#ccc' }}>{league?.name}</span>
            {league?.country && (
              <span style={{ fontSize: '11px', color: '#444', marginLeft: '4px' }}>
                · {league.country}
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#444', marginLeft: 'auto' }}>
              {fixtures?.length || 0} match{(fixtures?.length || 0) !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Match cards */}
          {fixtures?.map(f => (
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

// Fallback flag mapper
function getLeagueFlag(leagueId) {
  const flags = {
    2: '🏆', 39: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 140: '🇪🇸',
    135: '🇮🇹', 78: '🇩🇪', 61: '🇫🇷',
    71: '🇧🇷', 128: '🇦🇷',
  };
  return flags[leagueId] || '⚽';
}