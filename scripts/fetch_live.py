import requests
import json
import os
from datetime import datetime
from upstash_redis import Redis

redis = Redis(
    url=os.environ['UPSTASH_REDIS_REST_URL'],
    token=os.environ['UPSTASH_REDIS_REST_TOKEN']
)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.sofascore.com/',
    'Origin': 'https://www.sofascore.com',
}

BASE = 'https://api.sofascore.com/api/v1'

LIVE_STATUSES = ['inprogress']

# Sofascore tournament IDs for our leagues
TOURNAMENTS = {
    2:   7,    # UCL
    39:  17,   # EPL
    140: 8,    # La Liga
    135: 23,   # Serie A
    78:  35,   # Bundesliga
    61:  34,   # Ligue 1
    71:  325,  # Brasileirao
    128: 155,  # Argentina
}

LEAGUE_INFO = {
    2:   {'name': 'Champions League', 'flag': '🏆'},
    39:  {'name': 'Premier League',   'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
    140: {'name': 'La Liga',           'flag': '🇪🇸'},
    135: {'name': 'Serie A',           'flag': '🇮🇹'},
    78:  {'name': 'Bundesliga',        'flag': '🇩🇪'},
    61:  {'name': 'Ligue 1',           'flag': '🇫🇷'},
    71:  {'name': 'Brasileirão',       'flag': '🇧🇷'},
    128: {'name': 'Liga Profesional',  'flag': '🇦🇷'},
}

def fetch(url):
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code == 200:
            return res.json()
        print(f'⚠️ Status {res.status_code} for {url}')
        return {}
    except Exception as e:
        print(f'❌ Failed: {url} — {e}')
        return {}

def normalize_event(event, league_id):
    status_type = event.get('status', {}).get('type', 'notstarted')
    time_info = event.get('time', {})
    
    status_map = {
        'notstarted':  'NS',
        'inprogress':  '1H',
        'finished':    'FT',
        'halftime':    'HT',
        'postponed':   'PST',
        'canceled':    'CANC',
        'extra_time':  'ET',
        'penalties':   'P',
    }

    home = event.get('homeTeam', {})
    away = event.get('awayTeam', {})
    home_score = event.get('homeScore', {})
    away_score = event.get('awayScore', {})
    
    home_goals = home_score.get('current')
    away_goals = away_score.get('current')
    is_finished = status_type == 'finished'

    return {
        'fixture': {
            'id': event.get('id'),
            'date': datetime.utcfromtimestamp(
                event.get('startTimestamp', 0)
            ).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'status': {
                'short': status_map.get(status_type, 'NS'),
                'elapsed': time_info.get('played'),
            },
            'venue': {
                'name': event.get('venue', {}).get('name', '')
            }
        },
        'league': {
            'id': league_id,
            'name': LEAGUE_INFO[league_id]['name'],
            'flag': LEAGUE_INFO[league_id]['flag'],
        },
        'teams': {
            'home': {
                'id': home.get('id'),
                'name': home.get('name'),
                'logo': f"https://api.sofascore.com/api/v1/team/{home.get('id')}/image",
                'winner': (home_goals > away_goals) if is_finished and home_goals is not None else None,
            },
            'away': {
                'id': away.get('id'),
                'name': away.get('name'),
                'logo': f"https://api.sofascore.com/api/v1/team/{away.get('id')}/image",
                'winner': (away_goals > home_goals) if is_finished and away_goals is not None else None,
            }
        },
        'goals': {
            'home': home_goals,
            'away': away_goals,
        }
    }

def get_live_matches():
    live_matches = []

    for league_id, tournament_id in TOURNAMENTS.items():
        url = f'{BASE}/sport/football/events/live'
        data = fetch(url)
        events = data.get('events', [])

        # Filter for our tournaments only
        for event in events:
            t_id = event.get('tournament', {}).get('uniqueTournament', {}).get('id')
            status = event.get('status', {}).get('type', '')

            if t_id == tournament_id and status == 'inprogress':
                live_matches.append(normalize_event(event, league_id))

        break  # Only need one call — Sofascore returns ALL live events

    return live_matches

def update_today_cache_with_live(live_matches):
    """Update today's fixtures cache with current live scores"""
    try:
        today_raw = redis.get('fixtures:today')
        if not today_raw:
            return

        today_data = json.loads(today_raw) if isinstance(today_raw, str) else today_raw
        if not today_data or not today_data.get('data'):
            return

        live_by_id = {m['fixture']['id']: m for m in live_matches}

        for league_group in today_data['data']:
            league_group['fixtures'] = [
                live_by_id.get(f['fixture']['id'], f)
                for f in league_group.get('fixtures', [])
            ]

        redis.set(
            'fixtures:today',
            json.dumps(today_data),
            ex=93600
        )
        print(f'✅ Updated today cache with {len(live_matches)} live scores')

    except Exception as e:
        print(f'❌ Failed to update today cache: {e}')

def main():
    hour = datetime.utcnow().hour
    
    # Skip if outside match hours (saves GitHub Actions minutes)
    if hour < 10 or hour > 23:
        print(f'⏭️ Skipping — UTC hour {hour} outside match hours')
        return

    print(f'🔴 Fetching live scores at {datetime.utcnow().isoformat()}')

    live_matches = get_live_matches()

    # Store live cache (expires in 20 min)
    redis.set('fixtures:live', json.dumps({
        'data': live_matches,
        'count': len(live_matches),
        'fetchedAt': datetime.utcnow().isoformat() + 'Z',
        'source': 'sofascore'
    }), ex=1200)

    # Update today's fixtures with live scores
    if live_matches:
        update_today_cache_with_live(live_matches)

    print(f'✅ Live matches stored: {len(live_matches)}')

if __name__ == '__main__':
    main()