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

// Correct API key for server‑side
async function fetchFootball(endpoint, params = {}) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    console.error('❌ FOOTBALL_API_KEY is not set in environment');
    return [];
  }

  const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': apiKey }
  });
  const data = await res.json();

  // Log for debugging
  console.log(`📡 ${endpoint} → results: ${data.results}, errors: ${JSON.stringify(data.errors)}`);

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

function safeParse(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return null; }
  }
  return value;
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
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]; // 30 days

      console.log(`📅 Fetching fixtures for today: ${today} and upcoming until ${nextMonth}`);

      const [fixtures, upcoming] = await Promise.all([
        fetchFootball('/fixtures', { date: today, timezone: 'UTC' }),
        fetchFootball('/fixtures', { from: today, to: nextMonth, status: 'NS', timezone: 'UTC' }),
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

      console.log(`✅ Daily: today=${fixtures.length} matches, upcoming=${upcoming.length} matches`);
      return res.json({ success: true, task: 'daily', matchCount: fixtures.length, upcomingCount: upcoming.length });
    }

    // ── LIVE ───────────────────────────────────────────
    if (task === 'live') {
      const hour = new Date().getUTCHours();
      if (hour < 10) {
        return res.json({ success: true, skipped: true });
      }

      const liveFixtures = await fetchFootball('/fixtures', { live: 'all' });

      // Only keep matches that are really in progress
      const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE'];
      const actuallyLive = liveFixtures.filter(f =>
        LIVE_STATUSES.includes(f.fixture?.status?.short)
      );

      await redis.set('fixtures:live', JSON.stringify({
        data: actuallyLive,
        count: actuallyLive.length,
        fetchedAt: new Date().toISOString()
      }), { ex: 900 }); // 15 minutes

      // Also update today's cache with latest scores (including finished matches)
      if (liveFixtures.length > 0) {
        const todayRaw = await redis.get('fixtures:today');
        if (todayRaw) {
          const todayData = safeParse(todayRaw);
          if (todayData && todayData.data) {
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
      }

      console.log(`🔴 Live: ${actuallyLive.length} live matches, ${liveFixtures.length} total (including FT)`);
      return res.json({ success: true, liveCount: actuallyLive.length, totalFetched: liveFixtures.length });
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
      const upcomingRaw = await redis.get('fixtures:upcoming');
      if (!upcomingRaw) {
        return res.json({ success: false, reason: 'No upcoming fixtures cached' });
      }

      const upcoming = safeParse(upcomingRaw);
      if (!upcoming || !upcoming.data) {
        return res.json({ success: false, reason: 'Invalid upcoming fixtures data' });
      }

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

    // ── TEAM FORMS ─────────────────────────────────────
    if (task === 'team-forms') {
      const upcomingRaw = await redis.get('fixtures:upcoming');
      if (!upcomingRaw) {
        return res.json({ success: false, reason: 'No upcoming fixtures' });
      }

      const upcoming = safeParse(upcomingRaw);
      if (!upcoming || !upcoming.data) {
        return res.json({ success: false, reason: 'Invalid upcoming fixtures data' });
      }

      const allFixtures = upcoming.data.flatMap(l => l.fixtures || []);
      const teamIds = new Set();
      allFixtures.forEach(f => {
        if (f.teams?.home?.id) teamIds.add(f.teams.home.id);
        if (f.teams?.away?.id) teamIds.add(f.teams.away.id);
      });

      for (const teamId of teamIds) {
        try {
          const fixtures = await fetchFootball('/fixtures', { team: teamId, last: 6, status: 'FT' });
          const form = fixtures.map(f => {
            const isHome = f.teams?.home?.id === teamId;
            const winner = isHome ? f.teams?.home?.winner : f.teams?.away?.winner;
            const draw = !f.teams?.home?.winner && !f.teams?.away?.winner;
            if (draw) return 'D';
            return winner ? 'W' : 'L';
          });
          await redis.set(`team_form:${teamId}`, JSON.stringify(form), { ex: 86400 });
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          console.error(`Failed to fetch form for team ${teamId}:`, e.message);
        }
      }
      return res.json({ success: true, teamsProcessed: teamIds.size });
    }

    return res.status(400).json({ error: 'Invalid task' });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
};