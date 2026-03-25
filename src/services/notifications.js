export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendNotification = (title, body, icon = '/favicon.ico') => {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon });
};

export const checkFavouriteMatches = (fixtures, favouriteTeams) => {
  if (!favouriteTeams.length) return;
  const now = new Date();
  fixtures.forEach(fixture => {
    const kickoff = new Date(fixture.fixture.date);
    const minutesUntil = (kickoff - now) / 60000;
    const homeTeam = fixture.teams.home;
    const awayTeam = fixture.teams.away;
    const isFav = favouriteTeams.find(t => t.id === homeTeam.id || t.id === awayTeam.id);
    if (isFav && minutesUntil > 0 && minutesUntil <= 15) {
      sendNotification(
        '⚽ Match Starting Soon!',
        `${homeTeam.name} vs ${awayTeam.name} kicks off in ${Math.round(minutesUntil)} minutes!`
      );
    }
  });
};
