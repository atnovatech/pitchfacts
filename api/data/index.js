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
      if (cached) {
        // cached is a string; parse it
        return res.json(JSON.parse(cached));
      }
      return res.json({ data: [] });
    }
    if (type === 'live') {
      const cached = await redis.get('fixtures:live');
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      return res.json({ data: [], count: 0 });
    }
    if (type === 'upcoming') {
      const cached = await redis.get('fixtures:upcoming');
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      return res.json({ data: [] });
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
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      return res.json([]);
    }
    if (type === 'injuries') {
      if (!fixtureId) return res.status(400).json({ error: 'Missing fixtureId' });
      const cached = await redis.get(`injuries:${fixtureId}`);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      // fetch from API on demand
      const fetchFootball = async (endpoint, params = {}) => {
        const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        const res = await fetch(url.toString(), {
          headers: { 'x-apisports-key': process.env.REACT_APP_FOOTBALL_API_KEY }
        });
        const data = await res.json();
        return data.response || [];
      };
      const injuries = await fetchFootball('/injuries', { fixture: fixtureId });
      await redis.set(`injuries:${fixtureId}`, JSON.stringify(injuries), { ex: 7200 });
      return res.json(injuries);
    }
    return res.status(400).json({ error: 'Invalid type' });
  } catch (error) {
    console.error('API data error:', error);
    return res.status(500).json({ error: error.message });
  }
};