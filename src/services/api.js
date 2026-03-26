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

// ========== CALCULATION HELPERS (unchanged) ==========
export const calculateProbability = (form1, form2, h2h) => {
  if (h2h && h2h.length) {
    const homeWins = h2h.filter(f => f.teams?.home?.winner).length;
    const draws = h2h.filter(f => !f.teams?.home?.winner && !f.teams?.away?.winner).length;
    const awayWins = h2h.length - homeWins - draws;
    const total = h2h.length;
    return {
      home: Math.round((homeWins / total) * 100),
      draw: Math.round((draws / total) * 100),
      away: Math.round((awayWins / total) * 100),
    };
  }
  return { home: 40, draw: 25, away: 35 };
};

export const calculateConfidence = (form1, form2, h2h) => {
  if (!h2h?.length) return 2;
  const homeWins = h2h.filter(f => f.teams?.home?.winner).length;
  const awayWins = h2h.filter(f => f.teams?.away?.winner).length;
  const total = h2h.length;
  const diff = Math.abs(homeWins - awayWins) / total;
  if (diff >= 0.7) return 5;
  if (diff >= 0.5) return 4;
  if (diff >= 0.3) return 3;
  if (diff >= 0.15) return 2;
  return 1;
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