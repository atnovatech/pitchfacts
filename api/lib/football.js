const API_KEY = process.env.REACT_APP_FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const fetchFootball = async (endpoint, params = {}) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY }
  });
  const data = await res.json();
  return data.response || [];
};

const LEAGUE_IDS = [2, 39, 140, 135, 78, 61, 71, 128];

const LEAGUES_CONFIG = {
  2:   { name: 'Champions League', season: 2024, flag: '🏆' },
  39:  { name: 'Premier League',   season: 2024, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  140: { name: 'La Liga',          season: 2024, flag: '🇪🇸' },
  135: { name: 'Serie A',          season: 2024, flag: '🇮🇹' },
  78:  { name: 'Bundesliga',       season: 2024, flag: '🇩🇪' },
  61:  { name: 'Ligue 1',          season: 2024, flag: '🇫🇷' },
  71:  { name: 'Brasileirão',      season: 2025, flag: '🇧🇷' },
  128: { name: 'Liga Profesional', season: 2025, flag: '🇦🇷' },
};

module.exports = { fetchFootball, LEAGUE_IDS, LEAGUES_CONFIG };