import React from 'react'

// Simple playoff bracket visualization component
export default function PlayoffsBracket({ league, bracket, onSimSeries, onManualAdvance }){
  if(!bracket) bracket = league && league.settings && league.settings.playoffSize ? generatePlaceholderBracket(league) : null

  return (
    <div className="playoffs-bracket">
      <h2>Playoffs</h2>
      {bracket && <div className="bracket-grid">
        {bracket.matchups.map((m, idx) => (
          <div key={idx} className="matchup-card">
            <div className="seed">{m.seedHome} vs {m.seedAway}</div>
            <div className="teams">
              <div className="team home">{m.home}</div>
              <div className="team away">{m.away}</div>
            </div>
            <div className="actions">
              <button className="btn small" onClick={() => onSimSeries && onSimSeries(m)}>Sim Series</button>
              <button className="btn small" onClick={() => onManualAdvance && onManualAdvance(m)}>Advance Manually</button>
            </div>
          </div>
        ))}
      </div>}
      {!bracket && <div>No playoff bracket available.</div>}
    </div>
  )
}

function generatePlaceholderBracket(league){
  const size = (league.settings && league.settings.playoffSize) || 4
  const seeds = (league.teams || []).slice(0, size).map(t=> t.name)
  const matchups = []
  for(let i=0;i<Math.floor(size/2);i++){
    const home = seeds[i]
    const away = seeds[size - 1 - i]
    matchups.push({ home, away, seedHome: i+1, seedAway: size - i })
  }
  return { size, matchups, seeds }
}
