import redis from '../lib/redis';
import { fetchFootball, LEAGUE_IDS, LEAGUES_CONFIG } from '../lib/football';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const allStandings = {};
    for (const leagueId of LEAGUE_IDS) {
      const config = LEAGUES_CONFIG[leagueId];
      try {
        const data = await fetchFootball('/standings', {
          league: leagueId,
          season: config.season,
        });
        allStandings[leagueId] = data[0]?.league?.standings?.[0] || [];
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        console.error(`Standings failed for league ${leagueId}`, e);
      }
    }
    await redis.set('standings:all', JSON.stringify({ data: allStandings }), {
      ex: 604800, // 7 days
    });
    return res.json({ success: true, leagues: Object.keys(allStandings).length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}