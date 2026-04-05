import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { languages } from '../i18n';

const leagues = [
  { name: 'UCL',        path: '/champions-league', flag: '🏆',  label: 'UCL'        },
  { name: 'EPL',        path: '/premier-league',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', label: 'EPL'        },
  { name: 'La Liga',    path: '/la-liga',           flag: '🇪🇸',  label: 'La Liga'    },
  { name: 'Serie A',    path: '/serie-a',           flag: '🇮🇹',  label: 'Serie A'    },
  { name: 'Bundesliga', path: '/bundesliga',        flag: '🇩🇪',  label: 'Bundesliga' },
  { name: 'Ligue 1',    path: '/ligue-1',           flag: '🇫🇷',  label: 'Ligue 1'    },
  { name: 'Brasil',     path: '/brasileirao',       flag: '🇧🇷',  label: 'Brasil'     },
  { name: 'Argentina',  path: '/argentina',         flag: '🇦🇷',  label: 'Argentina'  },
  { name: 'WC 2026',    path: '/world-cup-2026',   flag: '🌍',   label: 'WC 2026'    },
];

export default function Header({ language, setLanguage, favouriteTeams }) {
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const currentLang = languages.find(l => l.code === language);

  return (
    <header style={{
      background: '#111',
      borderBottom: '1px solid #222',
      position: 'sticky',
      top: 0,
      zIndex: 999,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>⚽</span>
            <span style={{ fontSize: '20px', fontWeight: '800', color: '#00c851' }}>
              Pitch<span style={{ color: '#fff' }}>Facts</span>
            </span>
          </div>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Favourites indicator */}
          {favouriteTeams?.length > 0 && (
            <div style={{
              background: '#1a1a1a',
              padding: '5px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#ffcc00',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              ⭐ {favouriteTeams.length} team{favouriteTeams.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Language selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              {currentLang?.flag} {currentLang?.name} ▾
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '5px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '10px',
                overflow: 'hidden',
                minWidth: '150px',
                zIndex: 1000,
              }}>
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangOpen(false);
                      localStorage.setItem('pf_lang', lang.code);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 15px',
                      background: language === lang.code ? '#252525' : 'transparent',
                      border: 'none',
                      color: language === lang.code ? '#00c851' : '#ccc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13px',
                    }}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* League navigation */}
      {/* League navigation */}
      <div style={{
        borderTop: '1px solid #1a1a1a',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          display: 'flex',
          padding: '0 20px',
          maxWidth: '1400px',
          margin: '0 auto',
          gap: '2px',
          minWidth: 'max-content',
        }}>
          <Link
            to="/"
            style={{
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: '600',
              color: location.pathname === '/' ? '#00c851' : '#888',
              textDecoration: 'none',
              borderBottom: location.pathname === '/' ? '2px solid #00c851' : '2px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif', fontSize: '14px' }}>🏠</span>
            <span>All</span>
          </Link>
          {leagues.map(league => (
            <Link
              key={league.path}
              to={league.path}
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '600',
                color: location.pathname === league.path ? '#00c851' : '#888',
                textDecoration: 'none',
                borderBottom: location.pathname === league.path ? '2px solid #00c851' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif', fontSize: '14px', lineHeight: 1 }}>
                {league.flag}
              </span>
              <span>{league.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}