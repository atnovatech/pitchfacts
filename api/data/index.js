const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { type, leagueId, fixtureId, teamId } = req.query;

  try {

    // ── TODAY ─────────────────────────────────────────
    if (type === 'today') {
      const cached = await redis.get('fixtures:today');
      if (cached) {
        return res.json(cached); // ✅ no JSON.parse
      }
      return res.json({ data: [] });
    }

    // ── LIVE ──────────────────────────────────────────
    if (type === 'live') {
      const cached = await redis.get('fixtures:live');
      if (cached) {
        return res.json(cached);
      }
      return res.json({ data: [], count: 0 });
    }

    // ── UPCOMING ──────────────────────────────────────
    if (type === 'upcoming') {
      const cached = await redis.get('fixtures:upcoming');
      if (cached) {
        return res.json(cached);
      }
      return res.json({ data: [] });
    }

    // ── PREDICTIONS ───────────────────────────────────
    if (type === 'predictions') {
      const data = await redis.get('predictions:weekly');

      if (!data) return res.json({ predictions: {} });

      if (fixtureId && data.predictions) {
        return res.json(data.predictions[fixtureId] || null);
      }

      return res.json(data);
    }

    // ── STANDINGS ─────────────────────────────────────
    if (type === 'standings') {
      const data = await redis.get('standings:all');

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
        return res.json(cached);
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
        return res.json(cached);
      }

      // fetch from API (ONLY when not cached)
      const fetchFootball = async (endpoint, params = {}) => {
        const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

        const res = await fetch(url.toString(), {
          headers: {
            'x-apisports-key': process.env.REACT_APP_FOOTBALL_API_KEY
          }
        });

        const data = await res.json();
        return data.response || [];
      };

      const injuries = await fetchFootball('/injuries', { fixture: fixtureId });

      // ✅ store as object (NO JSON.stringify)
      await redis.set(`injuries:${fixtureId}`, injuries, { ex: 7200 });

      return res.json(injuries);
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (error) {
    console.error('API data error:', error);
    return res.status(500).json({ error: error.message });
  }
};