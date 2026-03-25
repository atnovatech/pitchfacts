import redis from '../lib/redis';
import { fetchFootball } from '../lib/football';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const hour = now.getUTCHours();
    // Only run between 10:00 and 23:59 UTC (peak match hours)
    if (hour < 10) {
      return res.json({ success: true, skipped: true });
    }

    const liveFixtures = await fetchFootball('/fixtures', { live: 'all' });

    await redis.set(
      'fixtures:live',
      JSON.stringify({ data: liveFixtures, count: liveFixtures.length }),
      { ex: 1200 } // 20 minutes
    );

    // If there are live matches, also update today's cache with scores
    if (liveFixtures.length > 0) {
      const todayCache = await redis.get('fixtures:today');
      if (todayCache) {
        const todayData = JSON.parse(todayCache);
        liveFixtures.forEach((liveMatch) => {
          const id = liveMatch.fixture?.id;
          todayData.data.forEach((group) => {
            group.fixtures = group.fixtures.map((m) =>
              m.fixture?.id === id ? liveMatch : m
            );
          });
        });
        await redis.set('fixtures:today', JSON.stringify(todayData), {
          ex: 93600,
        });
      }
    }

    console.log(`✅ Live scores: ${liveFixtures.length} matches`);
    return res.json({ success: true, liveCount: liveFixtures.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}