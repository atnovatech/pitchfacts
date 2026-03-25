
import axios from 'axios';

const API_KEY = process.env.REACT_APP_FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'x-apisports-key': API_KEY }
});

export const LEAGUES = {
  UCL: { id: 2, name: 'Champions League', season: 2024, flag: '🏆' },
  EPL: { id: 39, name: 'Premier League', season: 2024, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LALIGA: { id: 140, name: 'La Liga', season: 2024, flag: '🇪🇸' },
  SERIEA: { id: 135, name: 'Serie A', season: 2024, flag: '🇮🇹' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', season: 2024, flag: '🇩🇪' },
  LIGUE1: { id: 61, name: 'Ligue 1', season: 2024, flag: '🇫🇷' },
  BRASILEIRAO: { id: 71, name: 'Brasileirão', season: 2025, flag: '🇧🇷' },
  ARGENTINA: { id: 128, name: 'Liga Profesional', season: 2025, flag: '🇦🇷' },
  WC2026: { id: 1, name: 'FIFA World Cup', season: 2026, flag: '🌍' },
  WCQ_UEFA: { id: 32, name: 'WC Qualifiers UEFA', season: 2025, flag: '🇪🇺' },
  WCQ_CONMEBOL: { id: 29, name: 'WC Qualifiers CONMEBOL', season: 2025, flag: '🌎' },
  WCQ_AFC: { id: 30, name: 'WC Qualifiers AFC', season: 2025, flag: '🌏' },
};

const cache = {};
//const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const cachedGet = async (url, params) => {
  const key = url + JSON.stringify(params);
  const now = Date.now();
  if (cache[key] && now - cache[key].time < CACHE_DURATION) {
    return cache[key].data;
  }
  const res = await api.get(url, { params });
  cache[key] = { data: res.data, time: now };
  return res.data;
};

export const getFixturesByDate = async (date) => {
  try {
    const data = await cachedGet('/fixtures', {
      date,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    return data.response || [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getLiveFixtures = async () => {
  try {
    const data = await cachedGet('/fixtures', { live: 'all' });
    return data.response || [];
  } catch (e) { return []; }
};

export const getUpcomingFixtures = async () => {
  try {
    const data = await cachedGet('/fixtures', {
      next: 50
    });

    return data.response || [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getH2H = async (team1Id, team2Id) => {
  try {
    const data = await cachedGet('/fixtures/headtohead', {
      h2h: `${team1Id}-${team2Id}`,
      last: 10
    });
    return data.response || [];
  } catch (e) { return []; }
};

export const getStandings = async (leagueId, season) => {
  try {
    const data = await cachedGet('/standings', { league: leagueId, season });
    return data.response?.[0]?.league?.standings?.[0] || [];
  } catch (e) { return []; }
};

export const getTeamForm = async (teamId, leagueId, season) => {
  try {
    const data = await cachedGet('/fixtures', {
      team: teamId,
      league: leagueId,
      season,
      last: 6,
      status: 'FT'
    });
    return data.response || [];
  } catch (e) { return []; }
};

export const getInjuries = async (fixtureId) => {
  try {
    const data = await cachedGet('/injuries', { fixture: fixtureId });
    return data.response || [];
  } catch (e) { return []; }
};

export const getFixtureStats = async (fixtureId) => {
  try {
    const data = await cachedGet('/fixtures/statistics', { fixture: fixtureId });
    return data.response || [];
  } catch (e) { return []; }
};

export const calculateConfidence = (form1, form2, h2h) => {
  let score = 0;
  const getPoints = (results) => results.slice(-5).reduce((acc, f) => {
    const status = f.fixture?.status?.short;
    if (status === 'FT') {
      const home = f.teams?.home;
      const away = f.teams?.away;
      if (home?.winner) acc += 3;
      else if (!home?.winner && !away?.winner) acc += 1;
    }
    return acc;
  }, 0);
  const pts1 = getPoints(form1);
  const pts2 = getPoints(form2);
  const diff = Math.abs(pts1 - pts2);
  if (diff >= 8) score = 5;
  else if (diff >= 6) score = 4;
  else if (diff >= 4) score = 3;
  else if (diff >= 2) score = 2;
  else score = 1;
  return score;
};

export const calculateProbability = (form1, form2, h2h) => {
  const homeWins = h2h.filter(f => f.teams?.home?.winner).length;
  const draws = h2h.filter(f => !f.teams?.home?.winner && !f.teams?.away?.winner).length;
  const awayWins = h2h.filter(f => f.teams?.away?.winner).length;
  const total = h2h.length || 1;
  return {
    home: Math.round((homeWins / total) * 100),
    draw: Math.round((draws / total) * 100),
    away: Math.round((awayWins / total) * 100),
  };
};

export const generateMatchPreview = (homeTeam, awayTeam, homeForm, awayForm) => {
  const homeWins = homeForm.filter(f => f.teams?.home?.winner || f.teams?.away?.id === homeTeam.id).length;
  const awayWins = awayForm.filter(f => f.teams?.away?.winner || f.teams?.home?.id === awayTeam.id).length;
  const previews = [
    `${homeTeam.name} host ${awayTeam.name} in a crucial clash that could shake up the league standings.`,
    `${awayTeam.name} travel to face ${homeTeam.name} looking to extend their unbeaten run on the road.`,
    `All eyes are on ${homeTeam.name} as they look to capitalize on home advantage against ${awayTeam.name}.`,
    `${homeTeam.name} vs ${awayTeam.name} promises to be a tactical battle between two well-matched sides.`,
    `${awayTeam.name} arrive in confident mood to take on ${homeTeam.name} in this highly anticipated fixture.`,
  ];
  return previews[Math.floor(Math.random() * previews.length)];
};
// Helper function to convert flat API response to grouped format
export const groupFixturesByLeague = (fixtures) => {
  if (!fixtures || !Array.isArray(fixtures)) return [];
  
  // Check if it's already grouped format
  if (fixtures.length > 0 && fixtures[0].fixtures) {
    return fixtures;
  }
  
  // Check if it's flat format
  if (fixtures.length > 0 && fixtures[0].fixture) {
    const grouped = {};
    fixtures.forEach(match => {
      if (match && match.league && match.league.id) {
        const leagueId = match.league.id;
        if (!grouped[leagueId]) {
          grouped[leagueId] = {
            league: match.league,
            fixtures: []
          };
        }
        grouped[leagueId].fixtures.push(match);
      }
    });
    return Object.values(grouped);
  }
  
  return [];
};

// Helper function to flatten grouped format to flat format
export const flattenFixtures = (groupedFixtures) => {
  if (!groupedFixtures || !Array.isArray(groupedFixtures)) return [];
  
  // Check if it's already flat format
  if (groupedFixtures.length > 0 && groupedFixtures[0].fixture) {
    return groupedFixtures;
  }
  
  // Check if it's grouped format
  if (groupedFixtures.length > 0 && groupedFixtures[0].fixtures) {
    const flattened = [];
    groupedFixtures.forEach(leagueGroup => {
      if (leagueGroup.fixtures && Array.isArray(leagueGroup.fixtures)) {
        flattened.push(...leagueGroup.fixtures);
      }
    });
    return flattened;
  }
  
  return [];
};