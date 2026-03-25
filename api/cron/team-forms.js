import redis from '../lib/redis';
import { fetchFootball } from '../lib/football';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Get upcoming fixtures from Redis (cached by daily-fixtures)
    const upcomingCache = await redis.get('fixtures:upcoming');
    if (!upcomingCache) {
      return res.json({ success: false, reason: 'No upcoming fixtures cached' });
    }

    const upcoming = JSON.parse(upcomingCache);
    const allFixtures = upcoming.data.flatMap(league => league.fixtures || []);

    // 2. Extract unique team IDs
    const teamIdsSet = new Set();
    allFixtures.forEach(f => {
      if (f.teams?.home?.id) teamIdsSet.add(f.teams.home.id);
      if (f.teams?.away?.id) teamIdsSet.add(f.teams.away.id);
    });

    const allTeamIds = Array.from(teamIdsSet);
    console.log(`🔄 Fetching form for ${allTeamIds.length} teams`);

    let callsUsed = 0;

    for (const teamId of allTeamIds) {
      try {
        const fixtures = await fetchFootball('/fixtures', {
          team: teamId,
          last: 6,
          status: 'FT',
        });

        const form = fixtures.map(f => {
          const isHome = f.teams?.home?.id === teamId;
          const winner = isHome ? f.teams?.home?.winner : f.teams?.away?.winner;
          const draw = !f.teams?.home?.winner && !f.teams?.away?.winner;
          if (draw) return 'D';
          return winner ? 'W' : 'L';
        });

        await redis.set(`team_form:${teamId}`, JSON.stringify(form), { ex: 86400 });
        callsUsed++;
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`Failed to fetch form for team ${teamId}:`, e);
      }
    }

    console.log(`✅ Team forms updated: ${callsUsed} API calls`);
    return res.json({ success: true, teamsProcessed: allTeamIds.length, callsUsed });
  } catch (error) {
    console.error('Team forms cron failed:', error);
    return res.status(500).json({ error: error.message });
  }
}