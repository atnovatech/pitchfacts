import redis from '../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  try {
    const cached = await redis.get('fixtures:upcoming');
    if (cached) return res.json(JSON.parse(cached));
    return res.json({ data: [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}