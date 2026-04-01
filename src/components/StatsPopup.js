import React, { useState, useEffect } from 'react';
import { getH2H, getStandings, getTeamForm, getInjuries, calculateProbability, calculateConfidence } from '../services/api';
import ConfidenceBar from './ConfidenceBar';
import { t } from '../i18n';

export default function StatsPopup({ fixture, onClose, language }) {
  const [h2h, setH2h] = useState([]);
  const [standings, setStandings] = useState([]);
  const [homeForm, setHomeForm] = useState([]);
  const [awayForm, setAwayForm] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 500) + 200);

  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const leagueId = fixture.league?.id;
  const season = fixture.league?.season;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [h2hData, standingsData, homeFormData, awayFormData, injuriesData] = await Promise.all([
          getH2H(home?.id, away?.id),
          getStandings(leagueId, season),
          getTeamForm(home?.id, leagueId, season),
          getTeamForm(away?.id, leagueId, season),
          getInjuries(fixture.fixture?.id),
        ]);
        setH2h(h2hData);
        setStandings(standingsData);
        setHomeForm(homeFormData);
        setAwayForm(awayFormData);
        setInjuries(injuriesData);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [fixture]);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(v => Math.max(50, v + Math.floor(Math.random() * 20) - 8));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const prob = calculateProbability(homeForm, awayForm, h2h);
  const confidence = calculateConfidence(homeForm, awayForm, h2h);

  const getFormStr = (form, teamId) => form.slice(-6).map(f => {
    const isHome = f.teams?.home?.id === teamId;
    const winner = isHome ? f.teams?.home?.winner : f.teams?.away?.winner;
    const draw = f.teams?.home?.winner === null;
    if (draw) return 'D';
    return winner ? 'W' : 'L';
  });

  const homeFormStr = getFormStr(homeForm, home?.id);
  const awayFormStr = getFormStr(awayForm, away?.id);

  const homeWinsH2H = h2h.filter(f => f.teams?.home?.id === home?.id ? f.teams?.home?.winner : f.teams?.away?.winner).length;
  const drawsH2H = h2h.filter(f => !f.teams?.home?.winner && !f.teams?.away?.winner).length;
  const awayWinsH2H = h2h.length - homeWinsH2H - drawsH2H;

  const homeStanding = standings.find(s => s.team?.id === home?.id);
  const awayStanding = standings.find(s => s.team?.id === away?.id);

  const section = (title, children) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '12px', fontWeight: '700', color: '#888',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '12px', paddingBottom: '6px',
        borderBottom: '1px solid #252525',
      }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
          padding: '20px',
          borderRadius: '16px 16px 0 0',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '15px', right: '15px',
              background: '#252525', border: 'none', color: '#fff',
              width: '28px', height: '28px', borderRadius: '50%',
              cursor: 'pointer', fontSize: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              {fixture.league?.name} • {new Date(fixture.fixture?.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                {home?.logo && <img src={home.logo} alt={home.name} style={{ width: '50px', height: '50px', objectFit: 'contain' }} />}
                <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '5px' }}>{home?.name}</div>
                {homeStanding && <div style={{ fontSize: '10px', color: '#888' }}>#{homeStanding.rank} in league</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#888' }}>
                  {fixture.fixture?.status?.short === 'NS'
                    ? new Date(fixture.fixture?.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : `${fixture.goals?.home ?? 0} - ${fixture.goals?.away ?? 0}`}
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>
                  {fixture.fixture?.venue?.name}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                {away?.logo && <img src={away.logo} alt={away.name} style={{ width: '50px', height: '50px', objectFit: 'contain' }} />}
                <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '5px' }}>{away?.name}</div>
                {awayStanding && <div style={{ fontSize: '10px', color: '#888' }}>#{awayStanding.rank} in league</div>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ConfidenceBar level={confidence} language={language} />
            <div className="viewer-count">
              <span className="viewer-dot" />
              {viewerCount} {t(language, 'viewing')}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <>
              {/* H2H */}
              {section(t(language, 'headToHead'), (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    {[
                      { label: home?.name, value: homeWinsH2H, color: '#00c851' },
                      { label: 'Draws', value: drawsH2H, color: '#ffcc00' },
                      { label: away?.name, value: awayWinsH2H, color: '#ff4444' },
                    ].map(item => (
                      <div key={item.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', textAlign: 'center' }}>
                    Last {h2h.length} meetings
                  </div>
                  {h2h.slice(0, 5).map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '6px 0',
                      borderBottom: '1px solid #1a1a1a', fontSize: '12px',
                    }}>
                      <span style={{ color: '#888', fontSize: '10px', width: '80px' }}>
                        {new Date(f.fixture?.date).toLocaleDateString('en', { month: 'short', year: '2-digit' })}
                      </span>
                      <span style={{ color: '#ccc', flex: 1, textAlign: 'center' }}>
                        {f.teams?.home?.name} <strong style={{ color: '#fff' }}>{f.goals?.home} - {f.goals?.away}</strong> {f.teams?.away?.name}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Form */}
              {section(t(language, 'form'), (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[{ name: home?.name, form: homeFormStr }, { name: away?.name, form: awayFormStr }].map(team => (
                    <div key={team.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#888', width: '100px', textAlign: 'right' }}>{team.name}</span>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {team.form.map((r, i) => (
                          <span key={i} className={`form-dot ${r}`}>{r}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Injuries */}
              {injuries.length > 0 && section(t(language, 'injuries'), (
                <div>
                  {injuries.slice(0, 6).map((injury, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid #1a1a1a',
                      fontSize: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {injury.player?.photo && <img src={injury.player.photo} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
                        <div>
                          <div style={{ color: '#ccc' }}>{injury.player?.name}</div>
                          <div style={{ color: '#555', fontSize: '10px' }}>{injury.team?.name}</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                        background: injury.player?.reason === 'Suspended' ? '#3a1a00' : '#1a0000',
                        color: injury.player?.reason === 'Suspended' ? '#ff8800' : '#ff4444',
                      }}>
                        {injury.player?.reason || 'Injured'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              {/* League Table – Updated compact version */}
              {standings.length > 0 && section(t(language, 'leagueTable'), (
                <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '25px 1fr 30px 30px 30px 35px',
                    padding: '6px 10px',
                    background: '#141414',
                    fontSize: '10px',
                    color: '#555',
                    fontWeight: '700',
                    gap: '4px',
                  }}>
                    <span>#</span>
                    <span>Team</span>
                    <span style={{ textAlign: 'center' }}>P</span>
                    <span style={{ textAlign: 'center' }}>GD</span>
                    <span style={{ textAlign: 'center' }}>GF</span>
                    <span style={{ textAlign: 'center' }}>PTS</span>
                  </div>

                  {/* Show only teams near the match teams — 5 above and below */}
                  {(() => {
                    const homeRank = homeStanding?.rank || 1;
                    const awayRank = awayStanding?.rank || 1;
                    const minRank = Math.max(1, Math.min(homeRank, awayRank) - 2);
                    const maxRank = Math.min(standings.length, Math.max(homeRank, awayRank) + 2);
                    const visible = standings.filter(s => s.rank >= minRank && s.rank <= maxRank);

                    return visible.map((entry, i) => {
                      const isHome = entry.team?.id === home?.id;
                      const isAway = entry.team?.id === away?.id;

                      return (
                        <div
                          key={entry.team?.id || i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '25px 1fr 30px 30px 30px 35px',
                            padding: '7px 10px',
                            background: isHome ? '#001a0d'
                                      : isAway ? '#1a0000'
                                      : i % 2 === 0 ? '#1a1a1a' : '#161616',
                            borderLeft: isHome ? '3px solid #00c851'
                                      : isAway ? '3px solid #ff4444'
                                      : '3px solid transparent',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#666' }}>{entry.rank}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            {entry.team?.logo && (
                              <img src={entry.team.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                            )}
                            <span style={{
                              fontSize: '11px',
                              color: isHome ? '#00c851' : isAway ? '#ff4444' : '#ccc',
                              fontWeight: (isHome || isAway) ? '700' : '400',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {entry.team?.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>{entry.all?.played}</span>
                          <span style={{ fontSize: '11px', color: entry.goalsDiff > 0 ? '#00c851' : entry.goalsDiff < 0 ? '#ff4444' : '#888', textAlign: 'center' }}>
                            {entry.goalsDiff > 0 ? `+${entry.goalsDiff}` : entry.goalsDiff}
                          </span>
                          <span style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>{entry.goalsFor ?? '-'}</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                            {entry.points}
                          </span>
                        </div>
                      );
                    });
                  })()}

                  {/* Full table link */}
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#555' }}>
                      Showing teams around this match • View full table in league page
                    </span>
                  </div>
                </div>
              ))}

              {/* Probable outcome */}
              {section(t(language, 'outcome'), (
                <div>
                  {[
                    { label: t(language, 'homeWin'), value: prob.home, color: '#00c851' },
                    { label: t(language, 'draw'), value: prob.draw, color: '#ffcc00' },
                    { label: t(language, 'awayWin'), value: prob.away, color: '#ff4444' },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>{item.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: item.color }}>{item.value}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${item.value}%`,
                          background: item.color, borderRadius: '3px',
                          transition: 'width 1s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Affiliate CTA */}
              <button
                className="btn-affiliate"
                onClick={() => {
                  window.open('https://www.bet365.com', '_blank');
                  if (window.gtag) window.gtag('event', 'affiliate_click', { match: `${home?.name}_vs_${away?.name}` });
                }}
              >
                🎯 {t(language, 'viewOdds')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}