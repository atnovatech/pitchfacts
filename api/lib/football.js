// api/lib/football.js
// Football-data.org client

const FD_BASE = 'https://api.football-data.org/v4';
const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// football-data.org competition IDs
const COMPETITIONS = {
  UCL:        { id: 'CL',  name: 'Champions League', flag: '🏆',  leagueId: 2   },
  EPL:        { id: 'PL',  name: 'Premier League',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueId: 39  },
  LALIGA:     { id: 'PD',  name: 'La Liga',           flag: '🇪🇸',  leagueId: 140 },
  SERIEA:     { id: 'SA',  name: 'Serie A',           flag: '🇮🇹',  leagueId: 135 },
  BUNDESLIGA: { id: 'BL1', name: 'Bundesliga',        flag: '🇩🇪',  leagueId: 78  },
  LIGUE1:     { id: 'FL1', name: 'Ligue 1',           flag: '🇫🇷',  leagueId: 61  },
};

// TheSportsDB league IDs for H2H and Brazil/Argentina
const SPORTSDB_LEAGUES = {
  UCL:        { id: '4480', name: 'Champions League', flag: '🏆',  leagueId: 2   },
  EPL:        { id: '4328', name: 'Premier League',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueId: 39  },
  LALIGA:     { id: '4335', name: 'La Liga',           flag: '🇪🇸',  leagueId: 140 },
  SERIEA:     { id: '4332', name: 'Serie A',           flag: '🇮🇹',  leagueId: 135 },
  BUNDESLIGA: { id: '4331', name: 'Bundesliga',        flag: '🇩🇪',  leagueId: 78  },
  LIGUE1:     { id: '4334', name: 'Ligue 1',           flag: '🇫🇷',  leagueId: 61  },
  BRASILEIRAO:{ id: '4351', name: 'Brasileirão',       flag: '🇧🇷',  leagueId: 71  },
  ARGENTINA:  { id: '4406', name: 'Liga Profesional',  flag: '🇦🇷',  leagueId: 128 },
};

// Fetch from football-data.org
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

// Fetch from TheSportsDB (no key needed)
async function fetchSportsDB(endpoint) {
  const res = await fetch(`${SPORTS_DB_BASE}${endpoint}`);
  if (!res.ok) return null;
  return res.json();
}

// Normalize football-data.org match to your existing format
function normalizeMatch(match, competition) {
  const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? null;
  const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? null;

  const statusMap = {
    'SCHEDULED':  'NS',
    'TIMED':      'NS',
    'IN_PLAY':    '1H',
    'PAUSED':     'HT',
    'FINISHED':   'FT',
    'SUSPENDED':  'SUSP',
    'POSTPONED':  'PST',
    'CANCELLED':  'CANC',
  };

  return {
    fixture: {
      id: match.id,
      date: match.utcDate,
      status: {
        short: statusMap[match.status] || 'NS',
        elapsed: match.minute || null,
      },
      venue: {
        name: match.venue || '',
      }
    },
    league: {
      id: competition.leagueId,
      name: competition.name,
      flag: competition.flag,
    },
    teams: {
      home: {
        id: match.homeTeam?.id,
        name: match.homeTeam?.name,
        shortName: match.homeTeam?.shortName,
        logo: match.homeTeam?.crest,
        winner: match.score?.winner === 'HOME_TEAM' ? true 
              : match.score?.winner === 'DRAW' ? false 
              : match.score?.winner === 'AWAY_TEAM' ? false : null,
      },
      away: {
        id: match.awayTeam?.id,
        name: match.awayTeam?.name,
        shortName: match.awayTeam?.shortName,
        logo: match.awayTeam?.crest,
        winner: match.score?.winner === 'AWAY_TEAM' ? true
              : match.score?.winner === 'DRAW' ? false
              : match.score?.winner === 'HOME_TEAM' ? false : null,
      }
    },
    goals: {
      home: homeScore,
      away: awayScore,
    }
  };
}

// Normalize TheSportsDB event format
function normalizeSportsDBEvent(event, comp) {
  const homeScore = parseInt(event.intHomeScore);
  const awayScore = parseInt(event.intAwayScore);
  const isFinished = event.strStatus === 'Match Finished';

  return {
    fixture: {
      id: parseInt(event.idEvent),
      date: event.dateEvent + 'T' + (event.strTime || '00:00:00') + 'Z',
      status: {
        short: isFinished ? 'FT' : 'NS',
        elapsed: null,
      },
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

// Get standings from TheSportsDB for leagues not covered by football-data.org
async function getSportsDBStandings(leagueId, seasonYear) {
  let sportsDbId = null;
  if (leagueId === 71) sportsDbId = SPORTSDB_LEAGUES.BRASILEIRAO.id;
  else if (leagueId === 128) sportsDbId = SPORTSDB_LEAGUES.ARGENTINA.id;
  else return [];

  const endpoint = `/lookuptable.php?l=${sportsDbId}&s=${seasonYear}`;
  const data = await fetchSportsDB(endpoint);
  if (!data || !data.table) return [];

  return data.table.map(entry => ({
    rank: parseInt(entry.intRank),
    team: {
      id: entry.idTeam ? parseInt(entry.idTeam) : null,
      name: entry.strTeam,
      logo: entry.strTeamBadge || '',
    },
    points: parseInt(entry.intPoints),
    goalsDiff: (parseInt(entry.intGoalsFor) - parseInt(entry.intGoalsAgainst)) || 0,
    all: {
      played: parseInt(entry.intPlayed),
      win: parseInt(entry.intWin),
      draw: parseInt(entry.intDraw),
      lose: parseInt(entry.intLoss),
    }
  }));
}

// Get today's fixtures from all competitions
async function getTodayFixtures() {
  const today = new Date().toISOString().split('T')[0];
  const grouped = {};

  for (const comp of Object.values(COMPETITIONS)) {
    try {
      const data = await fetchFD(
        `/competitions/${comp.id}/matches?dateFrom=${today}&dateTo=${today}`
      );

      if (data?.matches?.length > 0) {
        grouped[comp.leagueId] = {
          league: {
            id: comp.leagueId,
            name: comp.name,
            flag: comp.flag,
          },
          fixtures: data.matches.map(m => normalizeMatch(m, comp))
        };
      }

      // Rate limit: 10 req/min — wait 7 seconds between calls
      await new Promise(r => setTimeout(r, 7000));

    } catch (e) {
      console.error(`Today fixtures failed for ${comp.name}:`, e.message);
    }
  }

  // Also get TheSportsDB leagues (Brazil, Argentina)
  for (const comp of [SPORTSDB_LEAGUES.BRASILEIRAO, SPORTSDB_LEAGUES.ARGENTINA]) {
    try {
      const data = await fetchSportsDB(`/eventsday.php?d=${today}&l=${comp.id}`);
      const events = data?.events || [];

      if (events.length > 0) {
        grouped[comp.leagueId] = {
          league: {
            id: comp.leagueId,
            name: comp.name,
            flag: comp.flag,
          },
          fixtures: events.map(e => normalizeSportsDBEvent(e, comp))
        };
      }
    } catch (e) {
      console.error(`SportsDB today failed for ${comp.name}:`, e.message);
    }
  }

  return Object.values(grouped);
}

// Get upcoming fixtures (next 30 days)
async function getUpcomingFixtures() {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const grouped = {};

  for (const comp of Object.values(COMPETITIONS)) {
    try {
      const data = await fetchFD(
        `/competitions/${comp.id}/matches?dateFrom=${today}&dateTo=${future}&status=SCHEDULED`
      );

      if (data?.matches?.length > 0) {
        grouped[comp.leagueId] = {
          league: {
            id: comp.leagueId,
            name: comp.name,
            flag: comp.flag,
          },
          fixtures: data.matches.map(m => normalizeMatch(m, comp))
        };
      }

      await new Promise(r => setTimeout(r, 7000));

    } catch (e) {
      console.error(`Upcoming failed for ${comp.name}:`, e.message);
    }
  }

  return Object.values(grouped);
}

// Get standings for all competitions
async function getAllStandings() {
  const allStandings = {};

  // European leagues from football-data.org
  for (const comp of Object.values(COMPETITIONS)) {
    try {
      const data = await fetchFD(`/competitions/${comp.id}/standings`);

      if (data?.standings?.[0]?.table) {
        allStandings[comp.leagueId] = data.standings[0].table.map(entry => ({
          rank: entry.position,
          team: {
            id: entry.team.id,
            name: entry.team.name,
            logo: entry.team.crest,
          },
          points: entry.points,
          goalsDiff: entry.goalDifference,
          all: {
            played: entry.playedGames,
            win: entry.won,
            draw: entry.draw,
            lose: entry.lost,
          }
        }));
      }

      await new Promise(r => setTimeout(r, 7000)); // rate limit

    } catch (e) {
      console.error(`Standings failed for ${comp.name}:`, e.message);
    }
  }

  // Brazilian and Argentine standings from TheSportsDB
  for (const leagueId of [71, 128]) {
    try {
      const standings = await getSportsDBStandings(leagueId, 2025);
      if (standings.length) {
        allStandings[leagueId] = standings;
      }
    } catch (e) {
      console.error(`SportsDB standings failed for league ${leagueId}:`, e.message);
    }
  }

  return allStandings;
}

// Get team form (last 6 results)
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

// Get H2H from TheSportsDB
async function getH2H(homeTeamName, awayTeamName) {
  try {
    const encoded = encodeURIComponent(`${homeTeamName} vs ${awayTeamName}`);
    const data = await fetchSportsDB(`/searchevents.php?e=${encoded}`);
    const events = data?.event || [];

    return events.slice(0, 10).map(e => ({
      fixture: {
        id: e.idEvent,
        date: e.dateEvent + 'T' + (e.strTime || '00:00:00') + 'Z',
        status: { short: e.strStatus === 'Match Finished' ? 'FT' : 'NS' }
      },
      teams: {
        home: {
          id: e.idHomeTeam,
          name: e.strHomeTeam,
          winner: parseInt(e.intHomeScore) > parseInt(e.intAwayScore) ? true
                : parseInt(e.intHomeScore) === parseInt(e.intAwayScore) ? false : false,
        },
        away: {
          id: e.idAwayTeam,
          name: e.strAwayTeam,
          winner: parseInt(e.intAwayScore) > parseInt(e.intHomeScore) ? true
                : parseInt(e.intHomeScore) === parseInt(e.intAwayScore) ? false : false,
        }
      },
      goals: {
        home: parseInt(e.intHomeScore) || null,
        away: parseInt(e.intAwayScore) || null,
      }
    }));
  } catch (e) {
    return [];
  }
}

module.exports = {
  getTodayFixtures,
  getUpcomingFixtures,
  getAllStandings,
  getTeamForm,
  getH2H,
  getSportsDBStandings,
  COMPETITIONS,
  SPORTSDB_LEAGUES,
  fetchFD,
  fetchSportsDB,
};