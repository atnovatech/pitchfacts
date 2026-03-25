import redis from '../lib/redis';
import { fetchFootball } from '../lib/football';

// Priority leagues order (higher priority = earlier in the list)
const PRIORITY = [2, 39, 140, 135, 78, 61, 71, 128];

function calculateConfidence(homeWins, awayWins, total) {
  const diff = Math.abs(homeWins - awayWins);
  const ratio = diff / total;
  if (ratio >= 0.7) return 5;
  if (ratio >= 0.5) return 4;
  if (ratio >= 0.3) return 3;
  if (ratio >= 0.15) return 2;
  return 1;
}

export default async function handler(req, res) {
  // Security: verify cron secret
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

    // 2. Sort by priority leagues and take top 20
    const sorted = allFixtures.sort((a, b) => {
      const aIdx = PRIORITY.indexOf(a.league?.id);
      const bIdx = PRIORITY.indexOf(b.league?.id);
      return aIdx - bIdx;
    });
    const top20 = sorted.slice(0, 20);

    const predictions = {};
    let callsUsed = 0;

    for (const fixture of top20) {
      const homeId = fixture.teams?.home?.id;
      const awayId = fixture.teams?.away?.id;
      const fixtureId = fixture.fixture?.id;
      if (!homeId || !awayId || !fixtureId) continue;

      try {
        const h2h = await fetchFootball('/fixtures/headtohead', {
          h2h: `${homeId}-${awayId}`,
          last: 10,
        });
        callsUsed++;

        const homeWins = h2h.filter(f => {
          if (f.teams?.home?.id === homeId) return f.teams?.home?.winner;
          return f.teams?.away?.winner;
        }).length;
        const draws = h2h.filter(f => !f.teams?.home?.winner && !f.teams?.away?.winner).length;
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
        await new Promise(r => setTimeout(r, 200)); // rate limit safety
      } catch (e) {
        console.error(`H2H failed for ${homeId} vs ${awayId}`, e);
      }
    }

    // 3. Store predictions for 8 days
    await redis.set(
      'predictions:weekly',
      JSON.stringify({
        predictions,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 8 * 86400000).toISOString(),
        callsUsed,
      }),
      { ex: 691200 } // 8 days
    );

    console.log(`✅ Weekly predictions: ${Object.keys(predictions).length} matches, ${callsUsed} calls`);
    return res.json({ success: true, predictionsCount: Object.keys(predictions).length, callsUsed });
  } catch (error) {
    console.error('Weekly predictions cron failed:', error);
    return res.status(500).json({ error: error.message });
  }
}