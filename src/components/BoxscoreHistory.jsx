import React from 'react'

export default function BoxscoreHistory({ league, onOpen }){
  const boxes = league.recentBoxscores || []
  return (
    <div className="panel boxscore-history">
      <div className="panel-header"><h2>Boxscore History</h2></div>
      <div style={{display:'grid',gap:8,marginTop:8}}>
        {boxes.map(b => (
          <div key={b.id} className="history-item" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>Week {b.week}: {b.game.home} {b.game.score[0]} — {b.game.score[1]} {b.game.away}</div>
              <div style={{color:'#BFBFBF',fontSize:12}}>{new Date(b.game.time || Date.now()).toLocaleString()}</div>
            </div>
            <div>
              <button className="btn" onClick={()=> onOpen && onOpen(b)}>View</button>
            </div>
          </div>
        ))}
        {boxes.length === 0 && <div style={{color:'#BFBFBF'}}>No boxscores yet.</div>}
      </div>
    </div>
  )
}
