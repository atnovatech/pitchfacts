// src/services/api.js

const BASE = ''; // empty = same origin

// ========== DATA FETCHING (from your backend) ==========
export const getFixturesByDate = async () => {
  try {
    const res = await fetch(`${BASE}/api/data?type=today`);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error('Today fixtures error', e);
    return [];
  }
};

export const getLiveFixtures = async () => {
  try {
    const res = await fetch(`${BASE}/api/data?type=live`);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
};

export const getUpcomingFixtures = async () => {
  try {
    const res = await fetch(`${BASE}/api/data?type=upcoming`);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
};

export const getStandings = async (leagueId) => {
  try {
    const res = await fetch(`${BASE}/api/data?type=standings&leagueId=${leagueId}`);
    return await res.json();
  } catch (e) {
    return [];
  }
};

export const getPrediction = async (fixtureId) => {
  try {
    const res = await fetch(`${BASE}/api/data?type=predictions&fixtureId=${fixtureId}`);
    return await res.json();
  } catch (e) {
    return null;
  }
};

export const getTeamForm = async (teamId) => {
  try {
    const res = await fetch(`${BASE}/api/data?type=team-form&teamId=${teamId}`);
    const data = await res.json();
    return data || [];
  } catch (e) {
    return [];
  }
};

export const getInjuries = async (fixtureId) => {
  try {
    const res = await fetch(`${BASE}/api/data?type=injuries&fixtureId=${fixtureId}`);
    const data = await res.json();
    return data || [];
  } catch (e) {
    return [];
  }
};

// H2H now comes from predictions cache
export const getH2H = async (team1Id, team2Id, fixtureId) => {
  const prediction = await getPrediction(fixtureId);
  return prediction?.h2h || [];
};

// ========== CALCULATION HELPERS (unchanged) ==========The fix is a weighted prediction model combining multiple factors
export const calculateProbability = (homeForm, awayForm, h2h) => {
  // ── Factor 1: Recent Form (weight 40%) ──────────────
  const getFormScore = (form) => {
    if (!form || !form.length) return 0.5;
    const pts = form.slice(-6).reduce((acc, result) => {
      if (result === 'W') return acc + 3;
      if (result === 'D') return acc + 1;
      return acc;
    }, 0);
    return pts / 18; // max 18 points from 6 games
  };

  // Form can be array of 'W'/'D'/'L' strings OR array of fixture objects
  const parseForm = (form, teamId) => {
    if (!form || !form.length) return [];
    // If it's already strings
    if (typeof form[0] === 'string') return form;
    // If it's fixture objects
    return form.slice(-6).map(f => {
      const isHome = f.teams?.home?.id === teamId;
      const winner = isHome ? f.teams?.home?.winner : f.teams?.away?.winner;
      if (winner === null || winner === undefined) return 'D';
      return winner ? 'W' : 'L';
    });
  };

  const homeFormArr = Array.isArray(homeForm) ? homeForm : [];
  const awayFormArr = Array.isArray(awayForm) ? awayForm : [];

  const homeFormScore = getFormScore(homeFormArr);
  const awayFormScore = getFormScore(awayFormArr);

  // ── Factor 2: H2H History (weight 35%) ──────────────
  let h2hHomeAdv = 0.5; // default neutral
  if (h2h && h2h.length >= 3) {
    const homeWins = h2h.filter(f => f.teams?.home?.winner).length;
    const draws    = h2h.filter(f => !f.teams?.home?.winner && !f.teams?.away?.winner).length;
    const awayWins = h2h.length - homeWins - draws;
    h2hHomeAdv = (homeWins + draws * 0.5) / h2h.length;
  }

  // ── Factor 3: Home Advantage (weight 25%) ───────────
  // Statistically home teams win ~46% of matches in top leagues
  const HOME_ADV = 0.46;

  // ── Weighted Combination ─────────────────────────────
  const formWeight  = 0.40;
  const h2hWeight   = 0.35;
  const homeAdvWeight = 0.25;

  const homeScore = (
    homeFormScore       * formWeight    +
    h2hHomeAdv          * h2hWeight     +
    HOME_ADV            * homeAdvWeight
  );

  const awayFormScoreNorm = 1 - awayFormScore;
  const awayScore = (
    awayFormScoreNorm   * formWeight    +
    (1 - h2hHomeAdv)    * h2hWeight     +
    (1 - HOME_ADV)      * homeAdvWeight
  );

  // ── Convert to percentages with draw buffer ──────────
  const total = homeScore + awayScore;
  const rawHome = Math.round((homeScore / total) * 100);
  const rawAway = Math.round((awayScore / total) * 100);

  // Draw is calculated from how close the teams are
  const closeness = 1 - Math.abs(homeScore - awayScore);
  const drawPct = Math.round(closeness * 28); // max ~28% draw probability

  // Redistribute draw % from home and away
  const homeDrawShare = rawHome / (rawHome + rawAway);
  const finalHome = Math.max(15, rawHome - Math.round(drawPct * homeDrawShare));
  const finalAway = Math.max(10, rawAway - Math.round(drawPct * (1 - homeDrawShare)));
  const finalDraw = 100 - finalHome - finalAway;

  return {
    home: Math.max(10, finalHome),
    draw: Math.max(5,  Math.abs(finalDraw)),
    away: Math.max(10, finalAway),
  };
};

export const calculateConfidence = (homeForm, awayForm, h2h) => {
  let score = 1;

  // More H2H data = higher confidence
  if (h2h?.length >= 8) score = Math.max(score, 4);
  else if (h2h?.length >= 5) score = Math.max(score, 3);
  else if (h2h?.length >= 3) score = Math.max(score, 2);

  // Form data available increases confidence
  const hasHomeForm = Array.isArray(homeForm) && homeForm.length > 0;
  const hasAwayForm = Array.isArray(awayForm) && awayForm.length > 0;
  if (hasHomeForm && hasAwayForm) score = Math.min(5, score + 1);

  // One team clearly dominant in recent form
  const getWinRate = (form) => {
    if (!form?.length) return 0.5;
    const wins = form.filter(r => r === 'W').length;
    return wins / form.length;
  };

  const homeWinRate = getWinRate(
    typeof homeForm?.[0] === 'string' ? homeForm : []
  );
  const awayWinRate = getWinRate(
    typeof awayForm?.[0] === 'string' ? awayForm : []
  );
  const formDiff = Math.abs(homeWinRate - awayWinRate);

  if (formDiff > 0.5) score = Math.min(5, score + 1);
  else if (formDiff > 0.3) score = Math.min(5, score + 0);

  return Math.min(5, Math.max(1, score));
};

export const generateMatchPreview = (homeTeam, awayTeam) => {
  const previews = [
    `${homeTeam?.name} host ${awayTeam?.name} in what promises to be an exciting encounter.`,
    `${awayTeam?.name} travel to face ${homeTeam?.name} looking to extend their unbeaten run.`,
    `All eyes are on ${homeTeam?.name} as they look to capitalize on home advantage against ${awayTeam?.name}.`,
    `${homeTeam?.name} vs ${awayTeam?.name} promises to be a tactical battle.`,
    `${awayTeam?.name} arrive in confident mood to take on ${homeTeam?.name}.`,
  ];
  return previews[Math.floor(Math.random() * previews.length)];
};

export const groupFixturesByLeague = (fixtures) => {
  if (!fixtures || !Array.isArray(fixtures)) return [];
  if (fixtures.length && fixtures[0].fixtures) return fixtures;
  if (fixtures.length && fixtures[0].fixture) {
    const grouped = {};
    fixtures.forEach(match => {
      const leagueId = match?.league?.id;
      if (!leagueId) return;
      if (!grouped[leagueId]) grouped[leagueId] = { league: match.league, fixtures: [] };
      grouped[leagueId].fixtures.push(match);
    });
    return Object.values(grouped);
  }
  return [];
};
  
export const flattenFixtures = (groupedFixtures) => {
  if (!groupedFixtures || !Array.isArray(groupedFixtures)) return [];
  if (groupedFixtures.length && groupedFixtures[0].fixture) return groupedFixtures;
  if (groupedFixtures.length && groupedFixtures[0].fixtures) {
    return groupedFixtures.flatMap(l => l.fixtures || []);
  }
  return [];
};

export const LEAGUES = {
  UCL: { id: 2, name: 'Champions League', season: 2024, flag: '🏆' },
  EPL: { id: 39, name: 'Premier League', season: 2024, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LALIGA: { id: 140, name: 'La Liga', season: 2024, flag: '🇪🇸' },
  SERIEA: { id: 135, name: 'Serie A', season: 2024, flag: '🇮🇹' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', season: 2024, flag: '🇩🇪' },
  LIGUE1: { id: 61, name: 'Ligue 1', season: 2024, flag: '🇫🇷' },
  BRASILEIRAO: { id: 71, name: 'Brasileirão', season: 2025, flag: '🇧🇷' },
  ARGENTINA: { id: 128, name: 'Liga Profesional', season: 2025, flag: '🇦🇷' },
};