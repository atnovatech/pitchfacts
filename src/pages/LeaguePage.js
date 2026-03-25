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

          {/* Standings tab */}
          {tab === 'standings' && (
            <div style={{ background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '15px', borderBottom: '1px solid #252525', fontSize: '14px', fontWeight: '700' }}>
                {leagueName} Standings
              </div>
              {standings.slice(0, 20).map((team, i) => (
                <div key={team.team?.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 15px',
                  borderBottom: '1px solid #1a1a1a',
                  background: i % 2 === 0 ? '#1a1a1a' : '#161616',
                }}>
                  <span style={{ width: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                    {team.rank}
                  </span>
                  {team.team?.logo && (
                    <img src={team.team.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                  )}
                  <span style={{ flex: 1, fontSize: '13px', color: '#ddd' }}>{team.team?.name}</span>
                  <span style={{ fontSize: '12px', color: '#888', width: '25px', textAlign: 'center' }}>{team.all?.played}</span>
                  <span style={{ fontSize: '12px', color: '#888', width: '25px', textAlign: 'center' }}>{team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#00c851', width: '30px', textAlign: 'center' }}>
                    {team.points}
                  </span>
                </div>
              ))}
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