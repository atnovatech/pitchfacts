import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LeaguePage from './pages/LeaguePage';
import WorldCupPage from './pages/WorldCupPage';
import EmailSubscribe from './components/EmailSubscribe';
import './App.css';

function App() {
  const [language, setLanguage] = useState('en');
  const [favouriteTeams, setFavouriteTeams] = useState(
    JSON.parse(localStorage.getItem('pf_favourites') || '[]')
  );

  const toggleFavourite = (team) => {
    const exists = favouriteTeams.find(t => t.id === team.id);
    let updated;
    if (exists) {
      updated = favouriteTeams.filter(t => t.id !== team.id);
    } else {
      updated = [...favouriteTeams, team];
    }
    setFavouriteTeams(updated);
    localStorage.setItem('pf_favourites', JSON.stringify(updated));
  };

  return (
    <Router>
      <div className="app">
        <Header language={language} setLanguage={setLanguage} favouriteTeams={favouriteTeams} />
        <Routes>
          <Route path="/" element={<HomePage language={language} favouriteTeams={favouriteTeams} toggleFavourite={toggleFavourite} />} />
          <Route path="/premier-league" element={<LeaguePage leagueId={39} leagueName="Premier League" language={language} />} />
          <Route path="/la-liga" element={<LeaguePage leagueId={140} leagueName="La Liga" language={language} />} />
          <Route path="/champions-league" element={<LeaguePage leagueId={2} leagueName="Champions League" language={language} />} />
          <Route path="/serie-a" element={<LeaguePage leagueId={135} leagueName="Serie A" language={language} />} />
          <Route path="/bundesliga" element={<LeaguePage leagueId={78} leagueName="Bundesliga" language={language} />} />
          <Route path="/ligue-1" element={<LeaguePage leagueId={61} leagueName="Ligue 1" language={language} />} />
          <Route path="/brasileirao" element={<LeaguePage leagueId={71} leagueName="Brasileirão" language={language} />} />
          <Route path="/argentina" element={<LeaguePage leagueId={128} leagueName="Liga Profesional" language={language} />} />
          <Route path="/world-cup-2026" element={<WorldCupPage language={language} />} />
        </Routes>
        <EmailSubscribe language={language} />
      </div>
    </Router>
  );
}

export default App;