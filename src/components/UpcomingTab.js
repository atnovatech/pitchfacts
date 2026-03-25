import React, { useState, useEffect } from 'react';
import { getUpcomingFixtures } from '../services/api';
import MatchCard from './MatchCard';
import StatsPopup from './StatsPopup';

export default function UpcomingTab({ language, favouriteTeams, toggleFavourite }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [range, setRange] = useState('week');
  const [error, setError] = useState(null);

  const getDateRange = () => {
    const from = new Date();
    from.setDate(from.getDate() + 1);
    const to = new Date();
    const days = { day: 1, week: 7, month: 30, year: 365 }[range];
    to.setDate(to.getDate() + days);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchFixtures = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { from, to } = getDateRange();
        const data = await getUpcomingFixtures(from, to);
        
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
        console.error('Failed to fetch upcoming fixtures:', err);
        if (isMounted) {
          setError(err.message || 'Unable to load upcoming matches');
          setMatches([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchFixtures();
    
    return () => {
      isMounted = false;
    };
  }, [range]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #252525',
          borderTopColor: '#FFD700',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 15px',
        }} />
        <p style={{ color: '#888' }}>Loading upcoming matches...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
        <p style={{ color: '#ff6b6b' }}>{error}</p>
        <button 
          onClick={() => setRange(range)}
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            background: '#FFD700',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#0a0a0a',
            fontWeight: '600',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!matches || !matches.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📅</div>
        <p style={{ color: '#aaa', fontSize: '16px', marginBottom: '8px' }}>No upcoming matches in this period</p>
        <p style={{ fontSize: '13px', color: '#666' }}>
          Try selecting a different date range
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Range selector */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px', 
        flexWrap: 'wrap',
        padding: '4px 0',
      }}>
        {['day', 'week', 'month', 'year'].map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: '8px 20px',
              borderRadius: '24px',
              border: '1px solid',
              borderColor: range === r ? '#FFD700' : '#333',
              background: range === r ? '#FFD70020' : 'transparent',
              color: range === r ? '#FFD700' : '#888',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
          >
            Next {r === 'day' ? '24h' : r === 'week' ? '7 days' : r === 'month' ? '30 days' : '1 year'}
          </button>
        ))}
      </div>

      {/* Matches grouped by league */}
      {matches.map(({ league, fixtures }) => (
        <div key={league?.id || Math.random()} style={{ marginBottom: '25px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '15px',
            padding: '10px',
            background: '#1a1a1a',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '20px' }}>{league?.flag || '🏆'}</span>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700' }}>
              {league?.name}
            </span>
            <span style={{ fontSize: '11px', color: '#666', marginLeft: 'auto' }}>
              {fixtures?.length || 0} match{(fixtures?.length || 0) !== 1 ? 'es' : ''}
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