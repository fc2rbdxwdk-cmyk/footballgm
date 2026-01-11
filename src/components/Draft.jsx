import React from 'react'
import PlayerCard from './PlayerCard'

export default function Draft({ league, onBack, onDraftPick }){
  const prospects = league.prospects || []
  return (
    <div className="panel draft-view">
      <div className="panel-header">
        <h2>Draft</h2>
        <button className="btn" onClick={onBack}>Close</button>
      </div>
      <div className="prospects-grid">
        {prospects.map(p => (
          <div key={p.id} className="prospect">
            <PlayerCard player={p} />
            <button className="btn primary" onClick={()=> onDraftPick(league.userTeam.name, p)}>Draft</button>
          </div>
        ))}
      </div>
    </div>
  )
}
