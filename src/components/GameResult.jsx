import React from 'react'

export default function GameResult({ summary, onBack }){
  if(!summary) return null
  const { game, week } = summary
  const stats = summary.stats || game.stats || { home: [], away: [] }
  return (
    <div className="panel results">
      <h2>Week {week} Results</h2>
      <div className="game-result-card">
        <div className="teams"><strong>{game.home}</strong> {game.score[0]} — {game.score[1]} <strong>{game.away}</strong></div>
        <div className="top-performers">
          <h3>Top Performers</h3>
          {game.topPlayers.map((p, i) => (
            <div key={i} className="top-player">{p.name} ({p.pos}) — {p.fantasy} fp</div>
          ))}
        </div>

        <div style={{marginTop:12}}>
          <h3>Boxscore — {game.home}</h3>
          <div style={{display:'grid',gap:6}}>
            {stats.home.map(s => (
              <div key={s.id} style={{display:'flex',justifyContent:'space-between'}}>
                <div>{s.name} <span style={{color:'#BFBFBF'}}>{s.pos}</span></div>
                <div style={{color:'#BFBFBF'}}>
                  {s.pos==='QB' && `${s.comp}/${s.att} ${s.passY} yds ${s.passTD} TD ${s.int} INT`}
                  {s.pos==='RB' && `${s.carries||0} att ${s.rushY||0} yds ${s.rushTD||0} TD • ${s.rec||0} rec ${s.recY||0} yds`}
                  {(s.pos==='WR' || s.pos==='TE') && `${s.targets||0} tgt ${s.rec||0} rec ${s.recY||0} yds ${s.recTD||0} TD`}
                  {(['OL','DL','LB','CB'].includes(s.pos) || s.tackles) && `${s.tackles||0} tkls ${s.sacks||0} sk`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop:12}}>
          <h3>Boxscore — {game.away}</h3>
          <div style={{display:'grid',gap:6}}>
            {stats.away.map(s => (
              <div key={s.id} style={{display:'flex',justifyContent:'space-between'}}>
                <div>{s.name} <span style={{color:'#BFBFBF'}}>{s.pos}</span></div>
                <div style={{color:'#BFBFBF'}}>
                  {s.pos==='QB' && `${s.comp}/${s.att} ${s.passY} yds ${s.passTD} TD ${s.int} INT`}
                  {s.pos==='RB' && `${s.carries||0} att ${s.rushY||0} yds ${s.rushTD||0} TD • ${s.rec||0} rec ${s.recY||0} yds`}
                  {(s.pos==='WR' || s.pos==='TE') && `${s.targets||0} tgt ${s.rec||0} rec ${s.recY||0} yds ${s.recTD||0} TD`}
                  {(['OL','DL','LB','CB'].includes(s.pos) || s.tackles) && `${s.tackles||0} tkls ${s.sacks||0} sk`}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <div className="actions"><button className="btn" onClick={onBack}>Back to Dashboard</button></div>
    </div>
  )
}
