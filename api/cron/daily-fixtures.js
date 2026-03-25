import redis from '../lib/redis';
import { fetchFootball, LEAGUES_CONFIG } from '../lib/football';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    // Fetch today's fixtures
    const fixtures = await fetchFootball('/fixtures', {
      date: today,
      timezone: 'UTC',
    });

    // Group by league
    const grouped = {};
    fixtures.forEach((match) => {
      const leagueId = match.league?.id;
      if (!leagueId) return;
      if (!grouped[leagueId]) {
        grouped[leagueId] = {
          league: {
            ...match.league,
            flag: LEAGUES_CONFIG[leagueId]?.flag || '⚽',
          },
          fixtures: [],
        };
      }
      grouped[leagueId].fixtures.push(match);
    });

    await redis.set(
      'fixtures:today',
      JSON.stringify({ data: Object.values(grouped), date: today }),
      { ex: 93600 } // 26 hours
    );

    // Also fetch upcoming (next 7 days) for the upcoming tab
    const nextWeek = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split('T')[0];
    const upcoming = await fetchFootball('/fixtures', {
      from: today,
      to: nextWeek,
      status: 'NS',
      timezone: 'UTC',
    });

    const upcomingGrouped = {};
    upcoming.forEach((match) => {
      const leagueId = match.league?.id;
      if (!leagueId) return;
      if (!upcomingGrouped[leagueId]) {
        upcomingGrouped[leagueId] = {
          league: {
            ...match.league,
            flag: LEAGUES_CONFIG[leagueId]?.flag || '⚽',
          },
          fixtures: [],
        };
      }
      upcomingGrouped[leagueId].fixtures.push(match);
    });

    await redis.set(
      'fixtures:upcoming',
      JSON.stringify({ data: Object.values(upcomingGrouped) }),
      { ex: 93600 }
    );

    console.log(`✅ Daily fixtures: ${fixtures.length} matches`);
    return res.json({ success: true, matchCount: fixtures.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}