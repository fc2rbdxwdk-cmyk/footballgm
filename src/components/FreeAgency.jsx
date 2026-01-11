import React from 'react'
import PlayerCard from './PlayerCard'

export default function FreeAgency({ league, onSign, onBack }){
  const fas = league.freeAgents || []
  return (
    <div className="panel fa-view">
      <div className="panel-header">
        <h2>Free Agents</h2>
        <button className="btn" onClick={onBack}>Back</button>
      </div>
      <div className="prospects-grid">
        {fas.map(p => (
          <div key={p.id} className="prospect">
            <PlayerCard player={p} />
            <button className="btn primary" onClick={()=> onSign(p)}>Sign</button>
          </div>
        ))}
      </div>
    </div>
  )
}
