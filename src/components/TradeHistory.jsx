import React from 'react'

export default function TradeHistory({ league }){
  const history = league.tradeHistory || []
  return (
    <div className="panel trade-history">
      <h3>Trade History</h3>
      <div style={{display:'grid',gap:8,marginTop:8}}>
        {history.map(h => (
          <div key={h.id} className="history-item">
            <div style={{fontWeight:700}}>{h.teamA} ↔ {h.teamB}</div>
            <div style={{color:'#BFBFBF',fontSize:13}}>{new Date(h.time).toLocaleString()}</div>
            <div style={{marginTop:6}}>{h.gave?.name} ↔ {h.received?.name}</div>
          </div>
        ))}
        {history.length===0 && <div style={{color:'#BFBFBF'}}>No trades yet.</div>}
      </div>
    </div>
  )
}
