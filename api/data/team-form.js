import redis from '../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

  const { teamId } = req.query;
  if (!teamId) {
    return res.status(400).json({ error: 'Missing teamId' });
  }

  try {
    const cached = await redis.get(`team_form:${teamId}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    return res.json([]); // fallback
  } catch (error) {
    console.error('Failed to fetch team form:', error);
    return res.status(500).json({ error: error.message });
  }
}