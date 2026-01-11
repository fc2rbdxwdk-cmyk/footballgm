import React, { useState } from 'react'
import PlayerCard from './PlayerCard'

export default function Trade({ league, onBack, onPropose }){
  const user = league.userTeam
  const opponents = league.teams.filter(t=>t.name !== user.name)
  const [myPlayerId, setMyPlayerId] = useState(null)
  const [oppTeam, setOppTeam] = useState(opponents[0]?.name || null)
  const [oppPlayerId, setOppPlayerId] = useState(null)
  const [result, setResult] = useState(null)

  function handlePropose(){
    if(!myPlayerId || !oppTeam || !oppPlayerId) return
    const decision = onPropose(myPlayerId, oppTeam, oppPlayerId)
    setResult(decision)
  }

  return (
    <div className="panel trade-view">
      <div className="panel-header">
        <h2>Propose Trade (1-for-1)</h2>
        <div>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
        <div>
          <h3>Your Players</h3>
          <div className="roster-grid">
            {user.roster.map(p=> (
              <div key={p.id} onClick={()=>setMyPlayerId(p.id)} style={{cursor:'pointer',outline: myPlayerId===p.id ? '2px solid var(--orange)':'none'}}>
                <PlayerCard player={p} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>Target Team</h3>
          <select value={oppTeam} onChange={e=>{ setOppTeam(e.target.value); setOppPlayerId(null); setResult(null) }}>
            {opponents.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
          <div style={{marginTop:8}}>
            <h4>Players</h4>
            <div className="prospects-grid">
              {(league.teams.find(t=>t.name===oppTeam)?.roster||[]).map(p => (
                <div key={p.id} onClick={()=>setOppPlayerId(p.id)} style={{cursor:'pointer',outline: oppPlayerId===p.id ? '2px solid var(--orange)':'none'}}>
                  <PlayerCard player={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="actions" style={{marginTop:12}}>
        <button className="btn primary" onClick={handlePropose}>Propose Trade</button>
        {result && (
          <div style={{marginLeft:12,color: result.accepted ? 'lightgreen' : '#FF7A00'}}>{result.reason}</div>
        )}
      </div>
    </div>
  )
}
