import React, { useState, useEffect } from 'react';
import { getFixturesByDate, getStandings, LEAGUES } from '../services/api';
import MatchCard from '../components/MatchCard';
import StatsPopup from '../components/StatsPopup';
import AdZone from '../components/AdZone';
import { leagueContent } from './leagueContent';

export default function LeaguePage({ leagueId, leagueName, language }) {
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const league = Object.values(LEAGUES).find(l => l.id === leagueId);
  const content = leagueContent[leagueId] || {};

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      getFixturesByDate(today),
      getStandings(leagueId, league?.season),
    ]).then(([fixturesData, standingsData]) => {
      const leagueFixtures = fixturesData.filter(
             f => f.league && f.league.id === leagueId
            );
      setFixtures(leagueFixtures?.fixtures || []);
      setStandings(standingsData);
      setLoading(false);
    });

    // Schema.org structured data
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      'name': leagueName,
      'sport': 'Soccer',
      'url': window.location.href,
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, [leagueId]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '15px' }}>
      {/* League Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
        borderRadius: '14px',
        padding: '25px',
        marginBottom: '20px',
        border: '1px solid #222',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '40px' }}>{league?.flag}</span>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>{leagueName}</h1>
            <p style={{ fontSize: '13px', color: '#888' }}>
              Season {league?.season}/{parseInt(league?.season) + 1} • Stats & Match Insights
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', background: '#1a1a1a', padding: '5px', borderRadius: '10px' }}>
        {['overview', 'fixtures', 'standings', 'preview'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px', border: 'none',
              borderRadius: '7px', cursor: 'pointer',
              background: tab === t ? '#252525' : 'transparent',
              color: tab === t ? '#fff' : '#888',
              fontSize: '12px', fontWeight: '600',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px' }}>
        <div>
          {/* Overview tab */}
          {tab === 'overview' && (
            <div>
              {content.preview && (
                <div style={{
                  background: '#1a1a1a', borderRadius: '12px',
                  padding: '20px', marginBottom: '20px',
                  border: '1px solid #252525',
                }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#00c851' }}>
                    {leagueName} — Season Preview
                  </h2>
                  <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.8' }}>
                    {content.preview}
                  </p>
                  {content.keyStories && (
                    <>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '20px 0 10px', color: '#fff' }}>
                        Key Storylines
                      </h3>
                      {content.keyStories.map((story, i) => (
                        <div key={i} style={{
                          padding: '10px', background: '#141414',
                          borderRadius: '8px', marginBottom: '8px',
                          borderLeft: '3px solid #00c851',
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '3px' }}>
                            {story.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{story.desc}</div>
                        </div>
                      ))}
                    </>
                  )}
                  {content.titleContenders && (
                    <>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '20px 0 10px', color: '#fff' }}>
                        Title Contenders
                      </h3>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {content.titleContenders.map((team, i) => (
                          <div key={i} style={{
                            background: '#141414', padding: '8px 14px',
                            borderRadius: '20px', fontSize: '12px',
                            color: i === 0 ? '#FFD700' : '#888',
                            border: `1px solid ${i === 0 ? '#FFD700' : '#222'}`,
                          }}>
                            {i === 0 ? '🏆' : `${i + 1}.`} {team}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fixtures tab */}
          {tab === 'fixtures' && (
            <div>
              {loading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : fixtures.length ? (
                fixtures.map(f => (
                  <MatchCard
                    key={f.fixture.id}
                    fixture={f}
                    onClick={setSelectedFixture}
                    language={language}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <div className="icon">📅</div>
                  <p>No fixtures today for {leagueName}</p>
                </div>
              )}
            </div>
          )}

          {/* Standings tab – UPDATED */}
          {tab === 'standings' && (
            <div style={{ background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #252525' }}>

              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr 35px 35px 35px 35px 35px 35px 40px',
                padding: '10px 15px',
                borderBottom: '1px solid #252525',
                fontSize: '11px',
                color: '#555',
                fontWeight: '700',
                textTransform: 'uppercase',
                gap: '5px',
              }}>
                <span>#</span>
                <span>Team</span>
                <span style={{ textAlign: 'center' }}>P</span>
                <span style={{ textAlign: 'center' }}>W</span>
                <span style={{ textAlign: 'center' }}>D</span>
                <span style={{ textAlign: 'center' }}>L</span>
                <span style={{ textAlign: 'center' }}>GF</span>
                <span style={{ textAlign: 'center' }}>GD</span>
                <span style={{ textAlign: 'center' }}>PTS</span>
              </div>

              {/* Table Rows */}
              {standings.map((team, i) => {
                // Zone colors for top 4, Europa, relegation
                const getZoneColor = (rank) => {
                  if (rank <= 4) return '#003d1a';   // Champions League – green
                  if (rank <= 6) return '#1a1a00';   // Europa – yellow
                  if (rank >= standings.length - 2) return '#1a0000'; // Relegation – red
                  return 'transparent';
                };

                return (
                  <div
                    key={team.team?.id || i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 1fr 35px 35px 35px 35px 35px 35px 40px',
                      padding: '10px 15px',
                      borderBottom: '1px solid #161616',
                      background: getZoneColor(team.rank),
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#222'}
                    onMouseLeave={e => e.currentTarget.style.background = getZoneColor(team.rank)}
                  >
                    {/* Rank */}
                    <span style={{
                      fontSize: '12px',
                      color: team.rank <= 4 ? '#00c851'
                           : team.rank >= standings.length - 2 ? '#ff4444'
                           : '#666',
                      fontWeight: '700',
                    }}>
                      {team.rank}
                    </span>

                    {/* Team name + logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {team.team?.logo && (
                        <img
                          src={team.team.logo}
                          alt={team.team.name}
                          style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                        />
                      )}
                      <span style={{
                        fontSize: '13px',
                        color: '#ddd',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {team.team?.name}
                      </span>
                    </div>

                    {/* Stats */}
                    {[
                      team.all?.played,
                      team.all?.win,
                      team.all?.draw,
                      team.all?.lose,
                      team.goalsFor ?? '-',
                      team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff,
                    ].map((val, idx) => (
                      <span key={idx} style={{
                        fontSize: '12px',
                        color: idx === 5 ? (team.goalsDiff > 0 ? '#00c851' : team.goalsDiff < 0 ? '#ff4444' : '#888') : '#888',
                        textAlign: 'center',
                      }}>
                        {val ?? '-'}
                      </span>
                    ))}

                    {/* Points */}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '800',
                      color: '#fff',
                      textAlign: 'center',
                    }}>
                      {team.points}
                    </span>
                  </div>
                );
              })}

              {/* Legend */}
              <div style={{
                padding: '12px 15px',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                borderTop: '1px solid #252525',
              }}>
                {[
                  { color: '#00c851', label: 'Champions League' },
                  { color: '#ffcc00', label: 'Europa League' },
                  { color: '#ff4444', label: 'Relegation' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '10px', height: '10px',
                      borderRadius: '2px',
                      background: item.color,
                    }} />
                    <span style={{ fontSize: '11px', color: '#555' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Season Preview tab (SEO content) */}
          {tab === 'preview' && content.fullPreview && (
            <div style={{
              background: '#1a1a1a', borderRadius: '12px',
              padding: '25px', border: '1px solid #252525',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: '#fff' }}>
                {leagueName} Season Preview & Analysis
              </h2>
              <div style={{ fontSize: '14px', color: '#aaa', lineHeight: '2' }}
                dangerouslySetInnerHTML={{ __html: content.fullPreview }}
              />
            </div>
          )}

          <AdZone type="banner" label="Advertisement" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <AdZone type="box" label="Advertisement" />
          <AdZone type="box" label="Advertisement" />
        </div>
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