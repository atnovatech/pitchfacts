import React, { useState, useEffect, useCallback } from 'react';
import { getFixturesByDate, LEAGUES } from '../services/api';
import MatchCard from '../components/MatchCard';
import StatsPopup from '../components/StatsPopup';
import CountdownTimer from '../components/CountdownTimer';
import AdZone from '../components/AdZone';

const WC_DATE = '2026-06-11T18:00:00Z';

// World Cup qualifier league IDs (moved to constant for better maintainability)
const WC_QUALIFIER_LEAGUE_IDS = [1, 29, 30, 32];

// NOTE: Groups will be updated after official draw in late 2025
// This is placeholder content showing qualified teams only, not final groups
const QUALIFIED_TEAMS = [
  { confederation: 'UEFA', teams: ['France', 'Spain', 'England', 'Germany', 'Italy', 'Netherlands', 'Portugal', 'Belgium', 'Croatia', 'Switzerland'] },
  { confederation: 'CONMEBOL', teams: ['Brazil', 'Argentina', 'Uruguay', 'Colombia', 'Ecuador'] },
  { confederation: 'CONCACAF', teams: ['USA', 'Mexico', 'Canada'] },
  { confederation: 'CAF', teams: ['Morocco', 'Senegal', 'Nigeria', 'Egypt', 'Cameroon', 'Ghana'] },
  { confederation: 'AFC', teams: ['Japan', 'South Korea', 'Iran', 'Australia', 'Saudi Arabia'] },
  { confederation: 'OFC', teams: ['New Zealand'] },
];

export default function WorldCupPage({ language = 'en' }) {
  const [qualifierFixtures, setQualifierFixtures] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch qualifier fixtures with proper error handling
  useEffect(() => {
    let isMounted = true;
    
    const fetchQualifiers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const today = new Date().toISOString().split('T')[0];
        const data = await getFixturesByDate(today);
        
        if (isMounted) {
          // Filter for World Cup qualifiers
          const wcFixtures = data.filter(fixtureData =>
            fixtureData.league && 
            WC_QUALIFIER_LEAGUE_IDS.includes(fixtureData.league.id)
          );
          setQualifierFixtures(wcFixtures);
        }
      } catch (err) {
        console.error('Failed to fetch World Cup qualifiers:', err);
        if (isMounted) {
          setError('Unable to load qualifier matches. Please try again later.');
          setQualifierFixtures([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchQualifiers();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle tab change with analytics tracking
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
    // Track tab changes in analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_world_cup_tab', {
        event_category: 'engagement',
        event_label: newTab,
      });
    }
  }, []);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '15px' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2f5e 50%, #0d3b1e 100%)',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '20px',
        textAlign: 'center',
        border: '1px solid #1e3a6e',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          opacity: 0.03, 
          fontSize: '200px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          🏆
        </div>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏆</div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#FFD700', marginBottom: '5px' }}>
          FIFA World Cup 2026
        </h1>
        <p style={{ color: '#88aadd', marginBottom: '20px' }}>
          🇺🇸 United States • 🇨🇦 Canada • 🇲🇽 Mexico
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CountdownTimer targetDate={WC_DATE} />
        </div>
        <p style={{ color: '#88aadd', marginTop: '15px', fontSize: '13px' }}>
          June 11 – July 19, 2026 • 48 Teams • 104 Matches
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '5px', 
        marginBottom: '20px', 
        background: '#1a1a1a', 
        padding: '5px', 
        borderRadius: '10px' 
      }}>
        {['overview', 'qualifiers', 'teams', 'schedule'].map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              background: tab === t ? '#FFD70020' : 'transparent',
              color: tab === t ? '#FFD700' : '#888',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (tab !== t) e.target.style.background = '#252525';
            }}
            onMouseLeave={(e) => {
              if (tab !== t) e.target.style.background = 'transparent';
            }}
          >
            {t === 'teams' ? 'Qualified Teams' : t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
        <div>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div>
              <div style={{ 
                background: '#1a1a1a', 
                borderRadius: '12px', 
                padding: '20px', 
                marginBottom: '20px', 
                border: '1px solid #252525' 
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700', marginBottom: '15px' }}>
                  About World Cup 2026
                </h2>
                <p style={{ fontSize: '14px', color: '#aaa', lineHeight: '1.6', marginBottom: '15px' }}>
                  The 2026 FIFA World Cup will be the 23rd edition of the tournament and the first to feature 
                  48 teams, expanded from the previous 32-team format. It will be jointly hosted by the United 
                  States, Canada, and Mexico — marking the first World Cup hosted across three nations.
                </p>
                <p style={{ fontSize: '14px', color: '#aaa', lineHeight: '1.6', marginBottom: '15px' }}>
                  With 104 matches scheduled across 16 venues, this will be the largest World Cup in history. 
                  The final will be played at MetLife Stadium in New Jersey on July 19, 2026.
                </p>

                {/* Key Facts Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                  gap: '12px', 
                  marginTop: '20px' 
                }}>
                  {[
                    { label: 'Teams', value: '48' },
                    { label: 'Matches', value: '104' },
                    { label: 'Venues', value: '16' },
                    { label: 'Host Nations', value: '3' },
                    { label: 'Groups', value: '12' },
                    { label: 'Prize Money', value: '$1B+' },
                  ].map(fact => (
                    <div key={fact.label} style={{
                      background: '#141414',
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: '1px solid #252525',
                    }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#FFD700' }}>{fact.value}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{fact.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Venues Preview */}
              <div style={{ 
                background: '#1a1a1a', 
                borderRadius: '12px', 
                padding: '20px', 
                border: '1px solid #252525' 
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700', marginBottom: '15px' }}>
                  Iconic Venues
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { venue: 'MetLife Stadium', city: 'New Jersey', capacity: '82,500' },
                    { venue: 'Azteca Stadium', city: 'Mexico City', capacity: '87,523' },
                    { venue: 'SoFi Stadium', city: 'Los Angeles', capacity: '70,240' },
                    { venue: 'AT&T Stadium', city: 'Arlington', capacity: '80,000' },
                    { venue: 'BC Place', city: 'Vancouver', capacity: '54,500' },
                  ].map(venue => (
                    <div key={venue.venue} style={{ 
                      background: '#141414', 
                      padding: '12px', 
                      borderRadius: '8px',
                      border: '1px solid #252525'
                    }}>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{venue.venue}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{venue.city}</div>
                      <div style={{ fontSize: '10px', color: '#FFD700', marginTop: '5px' }}>{venue.capacity} capacity</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Qualifiers Tab */}
          {tab === 'qualifiers' && (
            <div>
              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '3px solid #252525',
                    borderTopColor: '#FFD700',
                    borderRadius: '50%',
                    margin: '0 auto 15px',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <p style={{ color: '#888' }}>Loading qualifier matches...</p>
                </div>
              ) : error ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                  <p style={{ color: '#ff6b6b' }}>{error}</p>
                </div>
              ) : qualifierFixtures.length > 0 ? (
                qualifierFixtures.map(({ league, fixtures }) => (
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
                      <span style={{ fontSize: '24px' }}>{league?.flag || '🏆'}</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700' }}>
                        {league?.name || 'World Cup Qualifiers'}
                      </span>
                    </div>
                    {fixtures.map(f => (
                      <MatchCard
                        key={f.fixture?.id || Math.random()}
                        fixture={f}
                        onClick={setSelectedFixture}
                        language={language}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌍</div>
                  <p style={{ color: '#aaa', fontSize: '16px', marginBottom: '8px' }}>No qualifier matches today</p>
                  <p style={{ fontSize: '13px', color: '#666' }}>
                    Check back on international matchdays for World Cup qualifiers
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Teams Tab (Replaces groups - more accurate for pre-tournament) */}
          {tab === 'teams' && (
            <div>
              <div style={{ 
                background: '#1a1a1a', 
                borderRadius: '12px', 
                padding: '20px', 
                border: '1px solid #252525' 
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700', marginBottom: '8px' }}>
                  Qualified Teams
                </h2>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
                  {Object.values(QUALIFIED_TEAMS).flatMap(c => c.teams).length} teams qualified • More to be confirmed
                </p>
                
                {QUALIFIED_TEAMS.map(confederation => (
                  <div key={confederation.confederation} style={{ marginBottom: '25px' }}>
                    <h3 style={{ 
                      fontSize: '15px', 
                      fontWeight: '600', 
                      color: '#FFD700',
                      marginBottom: '12px',
                      borderBottom: '1px solid #252525',
                      paddingBottom: '5px',
                    }}>
                      {confederation.confederation}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {confederation.teams.map(team => (
                        <span key={team} style={{
                          background: '#141414',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#ccc',
                          border: '1px solid #252525',
                        }}>
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px',
                  background: '#0a0a0a',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#666',
                  textAlign: 'center',
                }}>
                  Official group draw scheduled for late 2025
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {tab === 'schedule' && (
            <div style={{ 
              background: '#1a1a1a', 
              borderRadius: '12px', 
              padding: '20px', 
              border: '1px solid #252525' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700', marginBottom: '15px' }}>
                Key Tournament Dates
              </h2>
              {[
                { date: 'June 11, 2026', event: 'Opening Match', detail: 'Mexico City — Azteca Stadium' },
                { date: 'June 12–27, 2026', event: 'Group Stage', detail: '12 Groups, 72 matches across 3 nations' },
                { date: 'June 28 – July 1, 2026', event: 'Round of 32', detail: 'First knockout round' },
                { date: 'July 3–6, 2026', event: 'Round of 16', detail: 'Last 16 matches' },
                { date: 'July 9–10, 2026', event: 'Quarter Finals', detail: '8 teams remaining' },
                { date: 'July 14–15, 2026', event: 'Semi Finals', detail: 'Final 4 teams' },
                { date: 'July 18, 2026', event: 'Third Place Play-off', detail: 'Bronze medal match' },
                { date: 'July 19, 2026', event: '🏆 THE FINAL', detail: 'MetLife Stadium, New Jersey' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '15px',
                  padding: '12px 0',
                  borderBottom: i < 7 ? '1px solid #252525' : 'none',
                }}>
                  <div style={{ 
                    width: '120px', 
                    fontSize: '12px', 
                    color: '#FFD700',
                    fontWeight: '500',
                    flexShrink: 0 
                  }}>
                    {item.date}
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: item.event.includes('FINAL') ? '#FFD700' : '#fff' 
                    }}>
                      {item.event}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Removed ad placeholders, added useful content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* World Cup Facts Widget */}
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #252525',
          }}>
            <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#FFD700',
                 marginBottom: '12px'
                }}></h3>
            <div style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.6' }}>
              <p>• First World Cup with <strong>48 teams</strong></p>
              <p>• First hosted by <strong>3 nations</strong></p>
              <p>• <strong>104 matches</strong> total</p>
              <p>• <strong>16 venues</strong> across North America</p>
              <p>• Expanded knockout round: <strong>32 teams</strong></p>
            </div>
          </div>

          {/* Did You Know? Widget */}
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #252525',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FFD700', marginBottom: '12px' }}>
              💡 Did You Know?
            </h3>
            <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5' }}>
              The 2026 World Cup final at MetLife Stadium will be the first ever World Cup final 
              played on artificial turf with a grass overlay system.
            </p>
          </div>

          {/* Subscribe Widget */}
          <div style={{
            background: 'linear-gradient(135deg, #FFD70020, #1a1a1a)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #FFD70040',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FFD700', marginBottom: '8px' }}>
              📧 World Cup Updates
            </h3>
            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>
              Get match reminders, group draw results, and exclusive previews
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const email = e.target.email.value;
              if (email && window.gtag) {
                window.gtag('event', 'world_cup_subscribe', { event_category: 'engagement' });
              }
              alert('Thanks for subscribing! We\'ll keep you updated.');
              e.target.reset();
            }}>
              <input
                type="email"
                name="email"
                placeholder="Your email address"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#141414',
                  border: '1px solid #252525',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  marginBottom: '8px',
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#FFD700',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {selectedFixture && (
        <StatsPopup
          fixture={selectedFixture}
          onClose={() => setSelectedFixture(null)}
          language={language}
        />
      )}

      {/* Add animation keyframes */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}