import React, { useState } from 'react'

export default function Injuries({ league, onBack, onUpdate }){
  const allTeams = [...(league.teams||[]), league.userTeam].filter(Boolean)
  const injuredPlayers = []
  allTeams.forEach(t => t.roster.forEach(p => { if(p.injury && p.injury.weeks && p.injury.weeks>0) injuredPlayers.push({ player: p, team: t }) }))

  const [selected, setSelected] = useState(null)
  const [weeks, setWeeks] = useState(1)

  function handleAdjust(){
    if(!selected) return
    onUpdate && onUpdate('setInjuryWeeks', { playerId: selected.player.id, weeks: Number(weeks) })
    setSelected(null)
  }

  function handleClear(p){
    onUpdate && onUpdate('clearInjury', { playerId: p.id })
  }

  return (
    <div className="panel injuries-view">
      <div className="panel-header">
        <h2>Injuries</h2>
        <div>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {injuredPlayers.length===0 && <div style={{color:'#BFBFBF'}}>No injured players right now.</div>}
        {injuredPlayers.map((it, i) => (
          <div key={i} className="note" style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>{it.player.name} <span style={{color:'#BFBFBF',fontSize:13}}>{it.team.name}</span></div>
              <div style={{color:'#BFBFBF',fontSize:13}}>Injury: {it.player.injury.type} — {it.player.injury.weeks}w remaining</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" onClick={()=> { setSelected(it); setWeeks(it.player.injury.weeks) }}>Adjust</button>
              <button className="btn" onClick={()=> handleClear(it.player)}>Mark Recovered</button>
            </div>
          </div>
        ))}

        {selected && (
          <div className="panel" style={{marginTop:12,padding:12}}>
            <h3>Adjust Injury — {selected.player.name}</h3>
            <div>
              <label>Weeks</label>
              <input type="number" min={0} max={52} value={weeks} onChange={e=>setWeeks(Number(e.target.value))} />
            </div>
            <div style={{marginTop:8}}>
              <button className="btn primary" onClick={handleAdjust}>Save</button>
              <button className="btn" onClick={()=> setSelected(null)}>Cancel</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
