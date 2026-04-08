// api/lib/football.js
// Football-data.org client – optimized single‑call approach

const FD_BASE = 'https://api.football-data.org/v4';
const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// Map football-data.org competition codes to league IDs
const COMPETITION_MAP = {
  'CL':  { leagueId: 2,   name: 'Champions League', flag: '🏆'  },
  'PL':  { leagueId: 39,  name: 'Premier League',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'PD':  { leagueId: 140, name: 'La Liga',           flag: '🇪🇸'  },
  'SA':  { leagueId: 135, name: 'Serie A',           flag: '🇮🇹'  },
  'BL1': { leagueId: 78,  name: 'Bundesliga',        flag: '🇩🇪'  },
  'FL1': { leagueId: 61,  name: 'Ligue 1',           flag: '🇫🇷'  },
};

// TheSportsDB league info (Brazil / Argentina)
// id       = TheSportsDB league ID (for standings + eventsnextleague)
// leagueId = internal ID used in PitchFacts grouped output
const SPORTSDB_LEAGUES = {
  BRASILEIRAO: { id: '4351', leagueId: 71,  name: 'Brasileirão',     flag: '🇧🇷', season: '2025' },
  ARGENTINA:   { id: '4406', leagueId: 128, name: 'Liga Profesional', flag: '🇦🇷', season: '2025' },
};

// Keep COMPETITIONS for backwards compatibility
const COMPETITIONS = {
  UCL:        { id: 'CL',  name: 'Champions League', flag: '🏆',  leagueId: 2   },
  EPL:        { id: 'PL',  name: 'Premier League',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueId: 39  },
  LALIGA:     { id: 'PD',  name: 'La Liga',           flag: '🇪🇸',  leagueId: 140 },
  SERIEA:     { id: 'SA',  name: 'Serie A',           flag: '🇮🇹',  leagueId: 135 },
  BUNDESLIGA: { id: 'BL1', name: 'Bundesliga',        flag: '🇩🇪',  leagueId: 78  },
  LIGUE1:     { id: 'FL1', name: 'Ligue 1',           flag: '🇫🇷',  leagueId: 61  },
};

async function fetchFD(endpoint) {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) {
    console.error('❌ FOOTBALL_DATA_KEY not set');
    return null;
  }
  const res = await fetch(`${FD_BASE}${endpoint}`, {
    headers: { 'X-Auth-Token': key }
  });
  if (!res.ok) {
    console.error(`❌ FD API error: ${res.status} for ${endpoint}`);
    return null;
  }
  return res.json();
}

async function fetchSportsDB(endpoint) {
  try {
    const res = await fetch(`${SPORTS_DB_BASE}${endpoint}`);
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`❌ SportsDB error: ${e.message}`);
    return null;
  }
}

function normalizeMatch(match) {
  const code = match.competition?.code;
  const comp = COMPETITION_MAP[code];
  if (!comp) return null;

  const statusMap = {
    'SCHEDULED': 'NS', 'TIMED': 'NS',
    'IN_PLAY': '1H', 'PAUSED': 'HT',
    'FINISHED': 'FT', 'SUSPENDED': 'SUSP',
    'POSTPONED': 'PST', 'CANCELLED': 'CANC',
  };

  return {
    fixture: {
      id: match.id,
      date: match.utcDate,
      status: {
        short: statusMap[match.status] || 'NS',
        elapsed: null,
      },
      venue: { name: match.venue || '' }
    },
    league: {
      id: comp.leagueId,
      name: comp.name,
      flag: comp.flag,
    },
    teams: {
      home: {
        id: match.homeTeam?.id,
        name: match.homeTeam?.name || match.homeTeam?.shortName,
        logo: match.homeTeam?.crest,
        winner: match.score?.winner === 'HOME_TEAM' ? true
              : match.score?.winner === 'AWAY_TEAM' ? false
              : match.score?.winner === 'DRAW' ? false : null,
      },
      away: {
        id: match.awayTeam?.id,
        name: match.awayTeam?.name || match.awayTeam?.shortName,
        logo: match.awayTeam?.crest,
        winner: match.score?.winner === 'AWAY_TEAM' ? true
              : match.score?.winner === 'HOME_TEAM' ? false
              : match.score?.winner === 'DRAW' ? false : null,
      }
    },
    goals: {
      home: match.score?.fullTime?.home ?? null,
      away: match.score?.fullTime?.away ?? null,
    }
  };
}

function normalizeSportsDBEvent(event, comp) {
  const homeScore = parseInt(event.intHomeScore);
  const awayScore = parseInt(event.intAwayScore);
  const isFinished = event.strStatus === 'Match Finished';
  const isLive = event.strStatus === 'In Progress';

  let statusShort = 'NS';
  if (isFinished) statusShort = 'FT';
  else if (isLive) statusShort = '1H';

  return {
    fixture: {
      id: parseInt(event.idEvent),
      // Use strTimestamp when available (already UTC), else build from date+time
      date: event.strTimestamp
        ? event.strTimestamp.replace(' ', 'T') + 'Z'
        : event.dateEvent + 'T' + (event.strTime || '00:00:00') + 'Z',
      status: { short: statusShort, elapsed: null },
      venue: { name: event.strVenue || '' }
    },
    league: {
      id: comp.leagueId,
      name: comp.name,
      flag: comp.flag,
    },
    teams: {
      home: {
        id: parseInt(event.idHomeTeam),
        name: event.strHomeTeam,
        logo: event.strHomeTeamBadge || '',
        winner: isFinished ? homeScore > awayScore : null,
      },
      away: {
        id: parseInt(event.idAwayTeam),
        name: event.strAwayTeam,
        logo: event.strAwayTeamBadge || '',
        winner: isFinished ? awayScore > homeScore : null,
      }
    },
    goals: {
      home: isFinished ? homeScore : null,
      away: isFinished ? awayScore : null,
    }
  };
}

function groupByLeague(matches) {
  const grouped = {};
  matches.forEach(match => {
    if (!match) return;
    const leagueId = match.league?.id;
    if (!leagueId) return;
    if (!grouped[leagueId]) {
      grouped[leagueId] = { league: match.league, fixtures: [] };
    }
    grouped[leagueId].fixtures.push(match);
  });
  return Object.values(grouped);
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY'S FIXTURES
// FD: one call for all European leagues for today's date
// SportsDB: eventsday.php per league (Brazil/Argentina)
//           Falls back to eventsnextleague.php filtered to today if eventsday empty
// ─────────────────────────────────────────────────────────────────────────────
async function getTodayFixtures() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Fetching today (${today}) — 1 FD call`);

  const data = await fetchFD(`/matches?dateFrom=${today}&dateTo=${today}`);
  const fdMatches = (data?.matches || []).map(m => normalizeMatch(m)).filter(Boolean);
  console.log(`✅ FD today: ${fdMatches.length} matches`);

  // Brazil + Argentina from TheSportsDB
  const sdbMatches = [];
  for (const comp of Object.values(SPORTSDB_LEAGUES)) {
    // Primary: eventsday.php  (league id via l= param)
    let events = [];
    const dayData = await fetchSportsDB(`/eventsday.php?d=${today}&l=${comp.id}`);
    events = dayData?.events || [];
    console.log(`✅ SportsDB ${comp.name} eventsday: ${events.length} matches`);

    // Fallback: eventsnextleague.php — filter to today
    if (events.length === 0) {
      console.log(`⚠️  ${comp.name}: eventsday empty, trying eventsnextleague...`);
      // ✅ FIX: use eventsnextleague.php (league endpoint), NOT eventsnext.php (team endpoint)
      const nextData = await fetchSportsDB(`/eventsnextleague.php?id=${comp.id}`);
      const allNext = nextData?.events || [];
      events = allNext.filter(e => e.dateEvent === today);
      console.log(`✅ SportsDB ${comp.name} fallback filtered: ${events.length} matches for today`);
    }

    events.forEach(e => sdbMatches.push(normalizeSportsDBEvent(e, comp)));
  }

  return groupByLeague([...fdMatches, ...sdbMatches]);
}

// ─────────────────────────────────────────────────────────────────────────────
// UPCOMING FIXTURES (next 30 days)
// FD: one call for all European leagues
// SportsDB: eventsnextleague.php (correct league endpoint — fixes Bolton garbage)
// ─────────────────────────────────────────────────────────────────────────────
async function getUpcomingFixtures() {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  console.log(`📆 Fetching upcoming (${today} → ${future}) — 1 FD call`);

  const data = await fetchFD(`/matches?dateFrom=${today}&dateTo=${future}&status=SCHEDULED`);
  const fdMatches = (data?.matches || []).map(m => normalizeMatch(m)).filter(Boolean);
  console.log(`✅ FD upcoming: ${fdMatches.length} matches`);

  // Brazil + Argentina upcoming
  const sdbMatches = [];
  for (const comp of Object.values(SPORTSDB_LEAGUES)) {
    // ✅ FIX: was /eventsnext.php?id= (team endpoint) → now /eventsnextleague.php?id= (league endpoint)
    const sdbData = await fetchSportsDB(`/eventsnextleague.php?id=${comp.id}`);
    const events = sdbData?.events || [];
    console.log(`✅ SportsDB ${comp.name} upcoming: ${events.length} matches`);

    // Filter to only show within 30-day window + only this league's matches
    const filtered = events.filter(e => {
      if (!e.dateEvent) return false;
      // Extra guard: confirm the event actually belongs to this league
      if (e.idLeague && e.idLeague !== comp.id) return false;
      return e.dateEvent >= today && e.dateEvent <= future;
    });
    console.log(`  → ${comp.name} filtered to window: ${filtered.length}`);
    filtered.forEach(e => sdbMatches.push(normalizeSportsDBEvent(e, comp)));
  }

  return groupByLeague([...fdMatches, ...sdbMatches]);
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDINGS (all leagues)
// ─────────────────────────────────────────────────────────────────────────────
async function getAllStandings() {
  const allStandings = {};

  // European leagues from football-data.org
  for (const [code, comp] of Object.entries(COMPETITION_MAP)) {
    try {
      console.log(`📊 Fetching standings: ${comp.name}...`);
      const data = await fetchFD(`/competitions/${code}/standings`);

      if (data?.standings) {
        const table = data.standings.find(s => s.type === 'TOTAL')?.table
                   || data.standings[0]?.table
                   || [];

        allStandings[comp.leagueId] = table.map(entry => ({
          rank: entry.position,
          team: {
            id: entry.team.id,
            name: entry.team.name,
            logo: entry.team.crest,
          },
          points: entry.points,
          goalsDiff: entry.goalDifference,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          form: entry.form || '',
          all: {
            played: entry.playedGames,
            win: entry.won,
            draw: entry.draw,
            lose: entry.lost,
          }
        }));
        console.log(`  ✅ ${comp.name}: ${allStandings[comp.leagueId].length} teams`);
      }

      // 7 second gap to stay within 10 req/min
      await new Promise(r => setTimeout(r, 7000));

    } catch (e) {
      console.error(`  ❌ ${comp.name} standings failed:`, e.message);
      await new Promise(r => setTimeout(r, 7000));
    }
  }

  // Brazil + Argentina from TheSportsDB
  for (const comp of Object.values(SPORTSDB_LEAGUES)) {
    try {
      console.log(`📊 SportsDB standings: ${comp.name} ${comp.season}...`);
      const data = await fetchSportsDB(`/lookuptable.php?l=${comp.id}&s=${comp.season}`);

      if (data?.table?.length > 0) {
        allStandings[comp.leagueId] = data.table.map(entry => ({
          rank: parseInt(entry.intRank) || 0,
          team: {
            id: entry.idTeam ? parseInt(entry.idTeam) : null,
            name: entry.strTeam,
            logo: entry.strTeamBadge || '',
          },
          points: parseInt(entry.intPoints) || 0,
          goalsDiff: (parseInt(entry.intGoalsFor) - parseInt(entry.intGoalsAgainst)) || 0,
          goalsFor: parseInt(entry.intGoalsFor) || 0,
          goalsAgainst: parseInt(entry.intGoalsAgainst) || 0,
          form: entry.strForm || '',
          all: {
            played: parseInt(entry.intPlayed) || 0,
            win: parseInt(entry.intWin) || 0,
            draw: parseInt(entry.intDraw) || 0,
            lose: parseInt(entry.intLoss) || 0,
          }
        }));
        console.log(`  ✅ ${comp.name}: ${allStandings[comp.leagueId].length} teams`);
      } else {
        console.log(`  ⚠️ ${comp.name}: no data (season may not have started)`);
      }
    } catch (e) {
      console.error(`  ❌ ${comp.name} SportsDB standings failed:`, e.message);
    }
  }

  return allStandings;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM FORM
// ─────────────────────────────────────────────────────────────────────────────
async function getTeamForm(teamId) {
  try {
    const data = await fetchFD(`/teams/${teamId}/matches?status=FINISHED&limit=6`);
    const matches = data?.matches || [];
    return matches.map(match => {
      const isHome = match.homeTeam?.id === teamId;
      const winner = match.score?.winner;
      if (winner === 'DRAW') return 'D';
      if (isHome) return winner === 'HOME_TEAM' ? 'W' : 'L';
      return winner === 'AWAY_TEAM' ? 'W' : 'L';
    });
  } catch (e) {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD TO HEAD
// ─────────────────────────────────────────────────────────────────────────────
async function getH2H(homeTeamName, awayTeamName) {
  try {
    const query = encodeURIComponent(`${homeTeamName} vs ${awayTeamName}`);
    const data = await fetchSportsDB(`/searchevents.php?e=${query}`);
    const events = data?.event || [];

    return events.slice(0, 10).map(e => {
      const homeGoals = parseInt(e.intHomeScore) || 0;
      const awayGoals = parseInt(e.intAwayScore) || 0;
      const isFinished = e.strStatus === 'Match Finished';
      return {
        fixture: {
          id: e.idEvent,
          date: e.dateEvent + 'T00:00:00Z',
          status: { short: isFinished ? 'FT' : 'NS' }
        },
        teams: {
          home: {
            id: e.idHomeTeam,
            name: e.strHomeTeam,
            winner: isFinished ? homeGoals > awayGoals : null,
          },
          away: {
            id: e.idAwayTeam,
            name: e.strAwayTeam,
            winner: isFinished ? awayGoals > homeGoals : null,
          }
        },
        goals: {
          home: isFinished ? homeGoals : null,
          away: isFinished ? awayGoals : null,
        }
      };
    });
  } catch (e) {
    console.error(`H2H failed: ${e.message}`);
    return [];
  }
}

module.exports = {
  getTodayFixtures,
  getUpcomingFixtures,
  getAllStandings,
  getTeamForm,
  getH2H,
  COMPETITIONS,
  COMPETITION_MAP,
  SPORTSDB_LEAGUES,
  fetchFD,
  fetchSportsDB,
};