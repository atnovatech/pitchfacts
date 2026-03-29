const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Helper to safely parse Redis values (stored as strings)
function safeParse(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
  return value; // if already an object, return as is
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { type, leagueId, fixtureId, teamId } = req.query;

  try {
    // ── TODAY ─────────────────────────────────────────
    if (type === 'today') {
      const cached = await redis.get('fixtures:today');
      if (cached) {
        const parsed = safeParse(cached);
        return res.json(parsed || { data: [] });
      }
      return res.json({ data: [] });
    }

    // ── LIVE ──────────────────────────────────────────
    if (type === 'live') {
      const cached = await redis.get('fixtures:live');
      if (cached) {
        const parsed = safeParse(cached);
        return res.json(parsed || { data: [], count: 0 });
      }
      return res.json({ data: [], count: 0 });
    }

    // ── UPCOMING ──────────────────────────────────────
    if (type === 'upcoming') {
      const cached = await redis.get('fixtures:upcoming');
      if (cached) {
        const parsed = safeParse(cached);
        return res.json(parsed || { data: [] });
      }
      return res.json({ data: [] });
    }

    // ── PREDICTIONS ───────────────────────────────────
    if (type === 'predictions') {
      const cached = await redis.get('predictions:weekly');
      if (!cached) return res.json({ predictions: {} });
      const data = safeParse(cached);
      if (!data) return res.json({ predictions: {} });
      if (fixtureId && data.predictions) {
        return res.json(data.predictions[fixtureId] || null);
      }
      return res.json(data);
    }

    // ── STANDINGS ─────────────────────────────────────
    if (type === 'standings') {
      const cached = await redis.get('standings:all');
      if (!cached) return res.json([]);
      const data = safeParse(cached);
      if (!data) return res.json([]);
      if (leagueId) {
        return res.json(data.data?.[leagueId] || []);
      }
      return res.json(data);
    }

    // ── TEAM FORM ─────────────────────────────────────
    if (type === 'team-form') {
      if (!teamId) return res.status(400).json({ error: 'Missing teamId' });
      const cached = await redis.get(`team_form:${teamId}`);
      if (cached) {
        const parsed = safeParse(cached);
        return res.json(parsed || []);
      }
      return res.json([]);
    }

    // ── INJURIES ──────────────────────────────────────
    if (type === 'injuries') {
      if (!fixtureId) {
        return res.status(400).json({ error: 'Missing fixtureId' });
      }

      const cached = await redis.get(`injuries:${fixtureId}`);
      if (cached) {
        const parsed = safeParse(cached);
        return res.json(parsed || []);
      }

      // Use server-side API key (FOOTBALL_API_KEY, not REACT_APP_)
      const apiKey = process.env.FOOTBALL_API_KEY;
      if (!apiKey) {
        console.error('❌ FOOTBALL_API_KEY not set');
        return res.json([]);
      }

      const url = `https://v3.football.api-sports.io/injuries?fixture=${fixtureId}`;
      const apiRes = await fetch(url, {
        headers: { 'x-apisports-key': apiKey }
      });
      const data = await apiRes.json();
      const injuries = data.response || [];

      // Store as object (Redis client will stringify automatically)
      await redis.set(`injuries:${fixtureId}`, injuries, { ex: 7200 });
      return res.json(injuries);
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (error) {
    console.error('API data error:', error);
    return res.status(500).json({ error: error.message });
  }
};