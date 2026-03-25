import React from 'react';
import CountdownTimer from './CountdownTimer';
import ConfidenceBar from './ConfidenceBar';
import { t } from '../i18n';

const getFormResult = (fixture, teamId) => {
  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  if (!home || !away) return 'U';
  const isHome = home.id === teamId;
  if (home.winner === null && away.winner === null) return 'D';
  if (isHome) return home.winner ? 'W' : 'L';
  return away.winner ? 'W' : 'L';
};

export default function MatchCard({ fixture, onClick, language, favouriteTeams, toggleFavourite, showPreview = true }) {
  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const kickoff = new Date(fixture.fixture?.date);
  const status = fixture.fixture?.status?.short;
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(status);
  const isFinished = ['FT', 'AET', 'PEN'].includes(status);
  const elapsed = fixture.fixture?.status?.elapsed;
  const homeFav = favouriteTeams?.find(t => t.id === home?.id);
  const awayFav = favouriteTeams?.find(t => t.id === away?.id);

  const viewerCount = React.useRef(
    Math.floor(Math.random() * 800) + 100
  );

  React.useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 30) - 10;
      viewerCount.current = Math.max(50, viewerCount.current + change);
    }, 30000);
    return () => clearInterval(interval);
  }, [isLive]);

  const preview = `${home?.name} take on ${away?.name} in what promises to be an exciting encounter.`;

  return (
    <div className="match-card" onClick={() => onClick && onClick(fixture)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Status */}
        <div style={{ width: '60px', textAlign: 'center', flexShrink: 0 }}>
          {isLive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="pulse-dot" />
                <span style={{ color: '#ff4444', fontSize: '11px', fontWeight: '700' }}>{elapsed}'</span>
              </div>
            </div>
          ) : isFinished ? (
            <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>FT</span>
          ) : (
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                {kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '9px', color: '#555' }}>
                {kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* Teams */}
        <div style={{ flex: 1, padding: '0 12px' }}>
          {/* Home team */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {home?.logo && <img src={home.logo} alt={home.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />}
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#eee' }}>{home?.name}</span>
              <button
                className={`fav-btn ${homeFav ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFavourite && toggleFavourite({ id: home?.id, name: home?.name, logo: home?.logo }); }}
              >
                {homeFav ? '⭐' : '☆'}
              </button>
            </div>
            {(isLive || isFinished) && (
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                {fixture.goals?.home ?? '-'}
              </span>
            )}
          </div>

          {/* Away team */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {away?.logo && <img src={away.logo} alt={away.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />}
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#eee' }}>{away?.name}</span>
              <button
                className={`fav-btn ${awayFav ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFavourite && toggleFavourite({ id: away?.id, name: away?.name, logo: away?.logo }); }}
              >
                {awayFav ? '⭐' : '☆'}
              </button>
            </div>
            {(isLive || isFinished) && (
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                {fixture.goals?.away ?? '-'}
              </span>
            )}
          </div>
        </div>

        {/* Right side info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
          {!isLive && !isFinished && (
            <CountdownTimer targetDate={fixture.fixture?.date} compact />
          )}
          {isLive && (
            <div className="viewer-count">
              <span className="viewer-dot" />
              {viewerCount.current} {t(language, 'viewing')}
            </div>
          )}
          <span style={{ fontSize: '10px', color: '#555' }}>
            {fixture.fixture?.venue?.name || ''}
          </span>
        </div>
      </div>

      {/* Match preview */}
      {showPreview && !isLive && !isFinished && (
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          background: '#141414',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#777',
          lineHeight: '1.5',
        }}>
          {preview}
        </div>
      )}

      {/* Stats hint */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#444',
        textAlign: 'right',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <ConfidenceBar level={Math.floor(Math.random() * 3) + 2} language={language} />
        <span>📊 {t(language, 'clickForStats')}</span>
      </div>
    </div>
  );
}