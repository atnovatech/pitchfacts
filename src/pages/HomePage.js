import React, { useState, useEffect } from 'react';
import TodayTab from '../components/TodayTab';
import LiveTab from '../components/LiveTab';
import UpcomingTab from '../components/UpcomingTab';
import StatsTab from '../components/StatsTab';
import WorldCupBanner from '../components/WorldCupBanner';
import FeaturedMatches from '../components/FeaturedMatches';
import AdZone from '../components/AdZone';
import { getLiveFixtures } from '../services/api';
import { requestNotificationPermission, checkFavouriteMatches } from '../services/notifications';
import { t } from '../i18n';

export default function HomePage({ language, favouriteTeams, toggleFavourite }) {
  const [activeTab, setActiveTab] = useState('today');
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    requestNotificationPermission();
    const checkLive = async () => {
      const live = await getLiveFixtures();
      setLiveCount(live.length);
      checkFavouriteMatches(live, favouriteTeams);
    };
    checkLive();
    const interval = setInterval(checkLive, 60000);
    return () => clearInterval(interval);
  }, [favouriteTeams]);

  const tabs = [
    { id: 'today', label: t(language, 'today'), icon: '📅' },
    { id: 'live', label: t(language, 'live'), icon: '🔴', isLive: true, count: liveCount },
    { id: 'upcoming', label: t(language, 'upcoming'), icon: '🗓' },
    { id: 'stats', label: t(language, 'stats'), icon: '📊' },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '15px' }}>
      {/* World Cup Banner */}
      <WorldCupBanner language={language} />

      {/* Featured Matches */}
      <FeaturedMatches language={language} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px',
        gap: '20px',
      }}>
        {/* Main content */}
        <div>
          {/* Tabs */}
          <div className="tabs-container">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (window.gtag) window.gtag('event', 'tab_switch', { tab: tab.id });
                }}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.isLive ? 'live-tab-btn' : ''}`}
              >
                {tab.isLive ? (
                  <>
                    {tab.count > 0 && <span className="pulse-dot" />}
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{
                        background: '#ff4444',
                        color: '#fff',
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: '700',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </>
                ) : (
                  <>{tab.icon} {tab.label}</>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'today' && (
            <TodayTab
              language={language}
              favouriteTeams={favouriteTeams}
              toggleFavourite={toggleFavourite}
            />
          )}
          {activeTab === 'live' && (
            <LiveTab
              language={language}
              favouriteTeams={favouriteTeams}
              toggleFavourite={toggleFavourite}
            />
          )}
          {activeTab === 'upcoming' && (
            <UpcomingTab
              language={language}
              favouriteTeams={favouriteTeams}
              toggleFavourite={toggleFavourite}
            />
          )}
          {activeTab === 'stats' && (
            <StatsTab
              language={language}
              favouriteTeams={favouriteTeams}
              toggleFavourite={toggleFavourite}
            />
          )}

          {/* Bottom ad */}
          <AdZone type="banner" label="Advertisement" />
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <AdZone type="box" label="Advertisement" />
          <AdZone type="small" label="Advertisement" />
          <AdZone type="box" label="Advertisement" />
        </div>
      </div>
    </div>
  );
}