import React, { useState, useMemo } from 'react'
import { getCapProjection } from '../game/api'

export default function Contracts({ league, onBack, onUpdate }){
  const team = league.userTeam || {}
  const roster = team.roster || []
  const projection = useMemo(()=> getCapProjection(league, 3), [league])
  const [selected, setSelected] = useState(null)
  const [years, setYears] = useState(2)
  const [salary, setSalary] = useState(4000)
  const [bonus, setBonus] = useState(2000)
  const [guaranteed, setGuaranteed] = useState(2000)

  function totalSalaryForYear(yearOffset){
    // naive projection: current contracts for all players
    return roster.reduce((s,p)=> s + ((p.contract && p.contract.salary) || 0), 0)
  }

  function handlePropose(){
    if(!selected) return
    onUpdate && onUpdate('proposeContract', { playerId: selected.id, years: Number(years), salary: Number(salary), signingBonus: Number(bonus), guaranteed: Number(guaranteed) })
    setSelected(null)
  }

  const capAmount = league.settings?.salaryCapAmount || 0
  const firstYearPayrollIfProposed = (()=>{
    if(!selected) return projection[0]?.payroll || 0
    const current = projection[0]?.payroll || 0
    const amort = Math.round((Number(bonus) || 0)/Math.max(1, Number(years) || 1))
    return current + amort + (Number(salary) || 0)
  })()
  const overCap = capAmount > 0 && firstYearPayrollIfProposed > capAmount


  return (
    <div className="panel contracts-view">
      <div className="panel-header">
        <h2>Contracts & Budget</h2>
        <div>
          <button className="btn" onClick={onBack}>Close</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16,marginTop:12}}>
        <div>
          <h3>Your Roster</h3>
          <div className="roster-grid">
            {roster.map(p => (
              <div key={p.id} className="player-card" style={{padding:10}} onClick={() => { setSelected(p); setYears(p.contract?.years || 2); setSalary(p.contract?.salary||4000) }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>{p.name}</div>
                    <div style={{color:'#BFBFBF',fontSize:13}}>{p.pos} · OVR {p.overall}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700}}>${(p.contract?.salary||0).toLocaleString()}</div>
                    <div style={{color:'#BFBFBF',fontSize:13}}>{p.contract?.years} yrs</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="panel" style={{padding:12}}>
            <h3>Team Budget</h3>
            <div style={{color:'#BFBFBF',marginTop:6}}>Balance: <strong>${Number(team.balance||0).toLocaleString()}</strong></div>
            <div style={{marginTop:8,color:'#BFBFBF'}}>Projected payroll:</div>
            <div style={{marginTop:8}}>
              {projection.map(p => (
                <div key={p.season} style={{display:'flex',justifyContent:'space-between'}}>
                  <div style={{color:'#BFBFBF'}}>Season {p.season}</div>
                  <div><strong>${p.payroll.toLocaleString()}</strong></div>
                </div>
              ))}
              {league.settings && league.settings.salaryCapAmount && (
                <div style={{marginTop:8,color:'#BFBFBF'}}>Salary Cap: <strong>${league.settings.salaryCapAmount.toLocaleString()}</strong></div>
              )}
            </div>
          </div>

          <div className="panel" style={{padding:12,marginTop:12}}>
            <h3>Negotiate Contract</h3>
            {selected ? (
              <div>
                <div style={{fontWeight:700}}>{selected.name}</div>
                <div style={{marginTop:8}}>
                  <label style={{display:'block'}}>Years</label>
                  <input type="number" min={1} max={5} value={years} onChange={e=>setYears(Number(e.target.value))} />
                </div>
                <div style={{marginTop:8}}>
                  <label style={{display:'block'}}>Annual Salary</label>
                  <input type="number" min={500} step={500} value={salary} onChange={e=>setSalary(Number(e.target.value))} />
                </div>
                <div style={{marginTop:8}}>
                  <label style={{display:'block'}}>Signing Bonus</label>
                  <input type="number" min={0} step={500} value={bonus} onChange={e=>setBonus(Number(e.target.value))} />
                </div>
                <div style={{marginTop:8}}>
                  <label style={{display:'block'}}>Guaranteed</label>
                  <input type="number" min={0} step={500} value={guaranteed} onChange={e=>setGuaranteed(Number(e.target.value))} />
                </div>
                <div style={{marginTop:12,display:'flex',gap:8,flexDirection:'column'}}>
                  {overCap && <div style={{color:'#FFCC00',fontWeight:700}}>Warning: this contract would push payroll over the salary cap for next season.</div>}
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn primary" onClick={handlePropose}>Propose Contract</button>
                    <button className="btn" onClick={()=> setSelected(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{color:'#BFBFBF'}}>Select a player to negotiate their contract.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
