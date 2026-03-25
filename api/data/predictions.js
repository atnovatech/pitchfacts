import redis from '../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  try {
    const { fixtureId } = req.query;
    const cached = await redis.get('predictions:weekly');
    if (!cached) return res.json({ predictions: {} });

    const data = JSON.parse(cached);
    if (fixtureId && data.predictions) {
      return res.json(data.predictions[fixtureId] || null);
    }
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}