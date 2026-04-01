const { Redis } = require('@upstash/redis');
const {
  getTodayFixtures,
  getUpcomingFixtures,
  getAllStandings,
  getTeamForm,
  getH2H,
} = require('../lib/football');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PRIORITY = [2, 39, 140, 135, 78, 61, 71, 128];

function calculateConfidence(homeWins, awayWins, total) {
  const diff = Math.abs(homeWins - awayWins) / total;
  if (diff >= 0.7) return 5;
  if (diff >= 0.5) return 4;
  if (diff >= 0.3) return 3;
  if (diff >= 0.15) return 2;
  return 1;
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

    // ── DAILY ─────────────────────────────────────────
    if (task === 'daily') {
      console.log('📅 Running daily fixtures fetch...');

      const [todayFixtures, upcomingFixtures] = await Promise.all([
        getTodayFixtures(),
        getUpcomingFixtures(),
      ]);

      await Promise.all([
        redis.set('fixtures:today', JSON.stringify({
          data: todayFixtures,
          date: new Date().toISOString().split('T')[0],
          fetchedAt: new Date().toISOString(),
          source: 'football-data.org + thesportsdb'
        }), { ex: 93600 }),

        redis.set('fixtures:upcoming', JSON.stringify({
          data: upcomingFixtures,
          fetchedAt: new Date().toISOString(),
          source: 'football-data.org'
        }), { ex: 93600 }),
      ]);

      const todayCount = todayFixtures.reduce((sum, l) => sum + l.fixtures.length, 0);
      const upcomingCount = upcomingFixtures.reduce((sum, l) => sum + l.fixtures.length, 0);

      console.log(`✅ Daily: ${todayCount} today, ${upcomingCount} upcoming`);
      return res.json({
        success: true,
        task: 'daily',
        todayMatches: todayCount,
        upcomingMatches: upcomingCount,
      });
    }

    // ── LIVE ──────────────────────────────────────────
    // Live scores come from Python/GitHub Actions
    // This task just filters today's cache for in-play matches
    if (task === 'live') {
      const todayRaw = await redis.get('fixtures:today');
      if (!todayRaw) {
        return res.json({ success: true, liveCount: 0, note: 'No today cache' });
      }

      const todayData = safeParse(todayRaw);
      if (!todayData?.data) {
        return res.json({ success: true, liveCount: 0 });
      }

      const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE'];
      const liveMatches = [];

      todayData.data.forEach(leagueGroup => {
        leagueGroup.fixtures?.forEach(f => {
          if (LIVE_STATUSES.includes(f.fixture?.status?.short)) {
            liveMatches.push(f);
          }
        });
      });

      await redis.set('fixtures:live', JSON.stringify({
        data: liveMatches,
        count: liveMatches.length,
        fetchedAt: new Date().toISOString(),
      }), { ex: 900 });

      return res.json({ success: true, liveCount: liveMatches.length });
    }

    // ── STANDINGS ─────────────────────────────────────
    if (task === 'standings') {
      console.log('📊 Fetching standings...');

      const allStandings = await getAllStandings();

      await redis.set('standings:all', JSON.stringify({
        data: allStandings,
        fetchedAt: new Date().toISOString(),
        source: 'football-data.org'
      }), { ex: 604800 });

      return res.json({
        success: true,
        leagues: Object.keys(allStandings).length,
      });
    }

    // ── WEEKLY PREDICTIONS ────────────────────────────
    if (task === 'weekly') {
      console.log('🔮 Running weekly predictions...');

      const upcomingRaw = await redis.get('fixtures:upcoming');
      if (!upcomingRaw) {
        return res.json({ success: false, reason: 'No upcoming fixtures in cache. Run daily first.' });
      }

      const upcoming = safeParse(upcomingRaw);
      if (!upcoming?.data) {
        return res.json({ success: false, reason: 'Invalid upcoming data' });
      }

      const allFixtures = upcoming.data.flatMap(l => l.fixtures || []);
      const sorted = allFixtures.sort((a, b) =>
        PRIORITY.indexOf(a.league?.id) - PRIORITY.indexOf(b.league?.id)
      );
      const top20 = sorted.slice(0, 20);

      const predictions = {};
      let callsUsed = 0;

      for (const fixture of top20) {
        const homeName = fixture.teams?.home?.name;
        const awayName = fixture.teams?.away?.name;
        const fixtureId = fixture.fixture?.id;

        if (!homeName || !awayName) continue;

        try {
          // Get H2H from TheSportsDB (free, no limit)
          const h2h = await getH2H(homeName, awayName);
          callsUsed++;

          const homeWins = h2h.filter(f => f.teams?.home?.winner).length;
          const draws = h2h.filter(f =>
            !f.teams?.home?.winner && !f.teams?.away?.winner
          ).length;
          const awayWins = h2h.length - homeWins - draws;
          const total = h2h.length || 1;

          predictions[fixtureId] = {
            fixtureId,
            homeTeam: homeName,
            awayTeam: awayName,
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

          // TheSportsDB has no rate limit but be polite
          await new Promise(r => setTimeout(r, 500));

        } catch (e) {
          console.error(`H2H failed for ${homeName} vs ${awayName}:`, e.message);
        }
      }

      await redis.set('predictions:weekly', JSON.stringify({
        predictions,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 8 * 86400000).toISOString(),
        callsUsed,
        source: 'thesportsdb'
      }), { ex: 691200 });

      return res.json({
        success: true,
        predictionsCount: Object.keys(predictions).length,
        callsUsed,
      });
    }

    // ── TEAM FORMS ────────────────────────────────────
    if (task === 'team-forms') {
      console.log('📈 Fetching team forms...');

      const upcomingRaw = await redis.get('fixtures:upcoming');
      if (!upcomingRaw) {
        return res.json({ success: false, reason: 'No upcoming fixtures' });
      }

      const upcoming = safeParse(upcomingRaw);
      if (!upcoming?.data) {
        return res.json({ success: false, reason: 'Invalid data' });
      }

      const allFixtures = upcoming.data.flatMap(l => l.fixtures || []);
      const teamIds = new Set();

      allFixtures.forEach(f => {
        if (f.teams?.home?.id) teamIds.add(f.teams.home.id);
        if (f.teams?.away?.id) teamIds.add(f.teams.away.id);
      });

      let processed = 0;

      for (const teamId of teamIds) {
        try {
          const form = await getTeamForm(teamId);

          await redis.set(
            `team_form:${teamId}`,
            JSON.stringify(form),
            { ex: 86400 }
          );

          processed++;
          // Respect 10 req/min rate limit
          await new Promise(r => setTimeout(r, 7000));

        } catch (e) {
          console.error(`Form failed for team ${teamId}:`, e.message);
        }
      }

      return res.json({ success: true, teamsProcessed: processed });
    }

    // ── DEBUG ─────────────────────────────────────────
    if (task === 'debug') {
      const key = process.env.FOOTBALL_DATA_KEY;
      const res2 = await fetch('https://api.football-data.org/v4/competitions', {
        headers: { 'X-Auth-Token': key }
      });
      const data = await res2.json();

      return res.json({
        keyPresent: !!key,
        keyFirst4: key ? key.substring(0, 4) + '...' : 'MISSING',
        competitions: data.competitions?.map(c => ({ id: c.code, name: c.name })) || [],
        error: data.message || null,
      });
    }

    return res.status(400).json({ error: 'Invalid task' });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
};