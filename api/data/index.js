const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { type, leagueId, fixtureId, teamId } = req.query;

  try {
    if (type === 'today') {
      const cached = await redis.get('fixtures:today');
      return res.json(cached ? JSON.parse(cached) : { data: [] });
    }
    if (type === 'live') {
      const cached = await redis.get('fixtures:live');
      return res.json(cached ? JSON.parse(cached) : { data: [], count: 0 });
    }
    if (type === 'upcoming') {
      const cached = await redis.get('fixtures:upcoming');
      return res.json(cached ? JSON.parse(cached) : { data: [] });
    }
    if (type === 'predictions') {
      const cached = await redis.get('predictions:weekly');
      if (!cached) return res.json({ predictions: {} });
      const data = JSON.parse(cached);
      if (fixtureId && data.predictions) {
        return res.json(data.predictions[fixtureId] || null);
      }
      return res.json(data);
    }
    if (type === 'standings') {
      const cached = await redis.get('standings:all');
      if (!cached) return res.json([]);
      const data = JSON.parse(cached);
      if (leagueId) return res.json(data.data?.[leagueId] || []);
      return res.json(data);
    }
    if (type === 'team-form') {
      if (!teamId) return res.status(400).json({ error: 'Missing teamId' });
      const cached = await redis.get(`team_form:${teamId}`);
      return res.json(cached ? JSON.parse(cached) : []);
    }
    if (type === 'injuries') {
      if (!fixtureId) return res.status(400).json({ error: 'Missing fixtureId' });
      const cached = await redis.get(`injuries:${fixtureId}`);
      if (cached) return res.json(JSON.parse(cached));

      // Fetch on demand — only for injuries (rare call)
      const response = await fetch(
        `https://v3.football.api-sports.io/injuries?fixture=${fixtureId}`,
        { headers: { 'x-apisports-key': process.env.REACT_APP_FOOTBALL_API_KEY } }
      );
      const data = await response.json();
      const injuries = data.response || [];
      await redis.set(`injuries:${fixtureId}`, JSON.stringify(injuries), { ex: 7200 });
      return res.json(injuries);
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (error) {
    console.error('API data error:', error);
    return res.status(500).json({ error: error.message });
  }
};