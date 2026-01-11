import React, { useState } from 'react'

const defaultTeamNames = ['Ravens','Tigers','Warriors','Panthers','Bulls','Hawks','Knights','Titans']

export default function Setup({ onStart, initial }){
  const [leagueName, setLeagueName] = useState(initial?.leagueName || 'My League')
  const [numTeams, setNumTeams] = useState(initial?.numTeams || 8)
  const [seasonLength, setSeasonLength] = useState(initial?.seasonLength || 10)
  const [teamNames, setTeamNames] = useState(initial?.teamNames || defaultTeamNames.slice(0, numTeams))

  function updateTeamName(idx, val){
    const next = [...teamNames]
    next[idx] = val
    setTeamNames(next)
  }

  function handleStart(){
    const data = { leagueName, numTeams: Number(numTeams), seasonLength: Number(seasonLength), teamNames }
    onStart && onStart(data)
  }

  return (
    <div className="panel setup-panel">
      <h2>Create League</h2>
      <div style={{display:'grid',gap:12}}>
        <label>
          League Name
          <input value={leagueName} onChange={e=>setLeagueName(e.target.value)} style={{width:'100%',padding:8,marginTop:6}} />
        </label>

        <label>
          Number of Teams
          <input type="number" min={4} max={20} value={numTeams} onChange={e=>{ const v = Number(e.target.value); setNumTeams(v); setTeamNames(defaultTeamNames.slice(0,v)) }} style={{width:120,padding:8,marginTop:6}} />
        </label>

        <label>
          Season Length (weeks)
          <input type="number" min={4} max={20} value={seasonLength} onChange={e=>setSeasonLength(Number(e.target.value))} style={{width:120,padding:8,marginTop:6}} />
        </label>

        <div>
          <h4>Team Names</h4>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
            {Array.from({length:numTeams}).map((_,i) => (
              <input key={i} value={teamNames[i]||''} onChange={e=>updateTeamName(i,e.target.value)} style={{padding:8}} />
            ))}
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button className="btn primary" onClick={handleStart}>Create & Start Draft</button>
        </div>
      </div>
    </div>
  )
}
