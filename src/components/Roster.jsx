import React from 'react'
import PlayerCard from './PlayerCard'

export default function Roster({ team, onBack, onUpdate }){
  const updatePlayer = (id, patch) => {
    const next = { ...team, roster: team.roster.map(p => p.id===id ? { ...p, ...patch } : p) }
    onUpdate && onUpdate(next)
  }

  const promoteToggle = (p) => {
    updatePlayer(p.id, { starter: !p.starter })
  }

  const setOverall = (p, val) => {
    const v = Math.max(40, Math.min(99, Number(val) || p.overall))
    updatePlayer(p.id, { overall: v })
  }

  return (
    <div className="panel roster-view">
      <div className="panel-header">
        <h2>{team.name} Roster</h2>
        <div>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>
      <div className="roster-grid">
        {team.roster.map(p => (
          <div key={p.id} style={{display:'flex',flexDirection:'column',gap:8}}>
            <PlayerCard player={p} />
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btn" onClick={()=>promoteToggle(p)}>{p.starter ? 'Unpromote' : 'Promote'}</button>
              <label style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{color:'#BFBFBF'}}>OVR</span>
                <input type="number" value={p.overall} onChange={e=>setOverall(p,e.target.value)} style={{width:80,padding:6,borderRadius:6,border:'1px solid rgba(255,255,255,0.04)',background:'transparent',color:'white'}} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
