import redis from '../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

  try {
    const { leagueId } = req.query;
    const cached = await redis.get('standings:all');
    if (!cached) return res.json([]);

    const data = JSON.parse(cached);
    if (leagueId) return res.json(data.data?.[leagueId] || []);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}