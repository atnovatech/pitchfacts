const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LEAGUES_CONFIG = {
  2:   { name: 'Champions League', season: 2024, flag: '🏆' },
  39:  { name: 'Premier League',   season: 2024, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  140: { name: 'La Liga',          season: 2024, flag: '🇪🇸' },
  135: { name: 'Serie A',          season: 2024, flag: '🇮🇹' },
  78:  { name: 'Bundesliga',       season: 2024, flag: '🇩🇪' },
  61:  { name: 'Ligue 1',          season: 2024, flag: '🇫🇷' },
  71:  { name: 'Brasileirão',      season: 2025, flag: '🇧🇷' },
  128: { name: 'Liga Profesional', season: 2025, flag: '🇦🇷' },
};

const PRIORITY = [2, 39, 140, 135, 78, 61, 71, 128];

async function fetchFootball(endpoint, params = {}) {
  const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': process.env.REACT_APP_FOOTBALL_API_KEY }
  });
  const data = await res.json();
  return data.response || [];
}

function calculateConfidence(homeWins, awayWins, total) {
  const diff = Math.abs(homeWins - awayWins);
  const ratio = diff / total;
  if (ratio >= 0.7) return 5;
  if (ratio >= 0.5) return 4;
  if (ratio >= 0.3) return 3;
  if (ratio >= 0.15) return 2;
  return 1;
}

function getFlag(leagueId) {
  return LEAGUES_CONFIG[leagueId]?.flag || '⚽';
}

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { task } = req.query;

  try {
    // ── DAILY ──────────────────────────────────────────
    if (task === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const [fixtures, upcoming] = await Promise.all([
        fetchFootball('/fixtures', { date: today, timezone: 'UTC' }),
        fetchFootball('/fixtures', { from: today, to: nextWeek, status: 'NS', timezone: 'UTC' }),
      ]);

      const group = (arr) => {
        const grouped = {};
        arr.forEach(match => {
          const leagueId = match.league?.id;
          if (!leagueId) return;
          if (!grouped[leagueId]) {
            grouped[leagueId] = {
              league: { ...match.league, flag: getFlag(leagueId) },
              fixtures: []
            };
          }
          grouped[leagueId].fixtures.push(match);
        });
        return Object.values(grouped);
      };

      await Promise.all([
        redis.set('fixtures:today', JSON.stringify({
          data: group(fixtures), date: today,
          fetchedAt: new Date().toISOString()
        }), { ex: 93600 }),
        redis.set('fixtures:upcoming', JSON.stringify({
          data: group(upcoming),
          fetchedAt: new Date().toISOString()
        }), { ex: 93600 }),
      ]);

      return res.json({ success: true, task: 'daily', matchCount: fixtures.length });
    }

    // ── LIVE ───────────────────────────────────────────
    if (task === 'live') {
      const hour = new Date().getUTCHours();
      if (hour < 10) {
        return res.json({ success: true, skipped: true, reason: 'Outside match hours' });
      }

      const liveFixtures = await fetchFootball('/fixtures', { live: 'all' });

      await redis.set('fixtures:live', JSON.stringify({
        data: liveFixtures,
        count: liveFixtures.length,
        fetchedAt: new Date().toISOString()
      }), { ex: 1200 });

      if (liveFixtures.length > 0) {
        const todayCache = await redis.get('fixtures:today');
        if (todayCache) {
          const todayData = JSON.parse(todayCache);
          liveFixtures.forEach(liveMatch => {
            const id = liveMatch.fixture?.id;
            todayData.data.forEach(group => {
              group.fixtures = group.fixtures.map(m =>
                m.fixture?.id === id ? liveMatch : m
              );
            });
          });
          await redis.set('fixtures:today', JSON.stringify(todayData), { ex: 93600 });
        }
      }

      return res.json({ success: true, liveCount: liveFixtures.length });
    }

    // ── STANDINGS ──────────────────────────────────────
    if (task === 'standings') {
      const allStandings = {};
      for (const [leagueId, config] of Object.entries(LEAGUES_CONFIG)) {
        try {
          const data = await fetchFootball('/standings', {
            league: leagueId,
            season: config.season
          });
          allStandings[leagueId] = data[0]?.league?.standings?.[0] || [];
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.error(`Standings failed for ${leagueId}`);
        }
      }
      await redis.set('standings:all', JSON.stringify({
        data: allStandings,
        fetchedAt: new Date().toISOString()
      }), { ex: 604800 });
      return res.json({ success: true, leagues: Object.keys(allStandings).length });
    }

    // ── WEEKLY PREDICTIONS ─────────────────────────────
    if (task === 'weekly') {
      const upcomingCache = await redis.get('fixtures:upcoming');
      if (!upcomingCache) {
        return res.json({ success: false, reason: 'No upcoming fixtures cached' });
      }

      const upcoming = JSON.parse(upcomingCache);
      const allFixtures = upcoming.data.flatMap(l => l.fixtures || []);
      const sorted = allFixtures.sort((a, b) =>
        PRIORITY.indexOf(a.league?.id) - PRIORITY.indexOf(b.league?.id)
      );
      const top20 = sorted.slice(0, 20);

      const predictions = {};
      let callsUsed = 0;

      for (const fixture of top20) {
        const homeId = fixture.teams?.home?.id;
        const awayId = fixture.teams?.away?.id;
        const fixtureId = fixture.fixture?.id;
        if (!homeId || !awayId) continue;

        try {
          const h2h = await fetchFootball('/fixtures/headtohead', {
            h2h: `${homeId}-${awayId}`,
            last: 10
          });
          callsUsed++;

          const homeWins = h2h.filter(f =>
            f.teams?.home?.id === homeId
              ? f.teams?.home?.winner
              : f.teams?.away?.winner
          ).length;
          const draws = h2h.filter(f =>
            !f.teams?.home?.winner && !f.teams?.away?.winner
          ).length;
          const awayWins = h2h.length - homeWins - draws;
          const total = h2h.length || 1;

          predictions[fixtureId] = {
            fixtureId,
            homeTeam: fixture.teams?.home?.name,
            awayTeam: fixture.teams?.away?.name,
            date: fixture.fixture?.date,
            leagueId: fixture.league?.id,
            h2h: h2h.slice(0, 10),
            probability: {
              home: Math.round((homeWins / total) * 100),
              draw: Math.round((draws / total) * 100),
              away: Math.round((awayWins / total) * 100),
            },
            confidence: calculateConfidence(homeWins, awayWins, total),
            calculatedAt: new Date().toISOString(),
          };

          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          console.error(`H2H failed for fixture ${fixtureId}:`, e.message);
        }
      }

      await redis.set('predictions:weekly', JSON.stringify({
        predictions,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 8 * 86400000).toISOString(),
        callsUsed,
      }), { ex: 691200 });

      return res.json({
        success: true,
        predictionsCount: Object.keys(predictions).length,
        callsUsed
      });
    }

    return res.status(400).json({ error: 'Invalid task' });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
};