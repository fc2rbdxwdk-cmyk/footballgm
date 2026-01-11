import React, { useState } from 'react'

export default function Settings({ settings = {}, onChange, onBack }){
  const [local, setLocal] = useState({ difficulty: settings.difficulty ?? 1, seasonLength: settings.seasonLength ?? 10, salaryCap: settings.salaryCap ?? false })

  function update(field, value){
    const next = { ...local, [field]: value }
    setLocal(next)
    onChange && onChange(next)
  }

  // trainingRisk: 0.8 conservative -> 1.2 aggressive
  if(local.trainingRisk === undefined && settings.trainingRisk !== undefined){
    setLocal(l => ({ ...l, trainingRisk: settings.trainingRisk }))
  }

  return (
    <div className="panel settings-view">
      <div className="panel-header">
        <h2>League Settings</h2>
        <div>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>

      <div style={{marginTop:12,display:'grid',gap:12}}>
        <div>
          <label style={{display:'block',fontWeight:700}}>Difficulty: {local.difficulty}</label>
          <input type="range" min="0" max="5" value={local.difficulty} onChange={e=>update('difficulty', Number(e.target.value))} />
        </div>

        <div>
          <label style={{display:'block',fontWeight:700}}>Season Length (weeks):</label>
          <input type="number" min="4" max="20" value={local.seasonLength} onChange={e=>update('seasonLength', Math.max(4, Math.min(20, Number(e.target.value))))} />
        </div>

        <div>
          <label style={{display:'flex',alignItems:'center',gap:10}}>
            <input type="checkbox" checked={local.salaryCap} onChange={e=>update('salaryCap', e.target.checked)} />
            <span style={{fontWeight:700}}>Enable Salary Cap</span>
          </label>
          <div style={{color:'#BFBFBF',marginTop:6,fontSize:13}}>Toggle a simple salary cap mechanic (placeholder).</div>
        </div>
        <div>
          <label style={{display:'block',fontWeight:700}}>Training Risk: {local.trainingRisk ?? 1}</label>
          <input type="range" min={0.7} max={1.3} step={0.05} value={local.trainingRisk ?? 1} onChange={e=>update('trainingRisk', Number(e.target.value))} />
          <div style={{color:'#BFBFBF',marginTop:6,fontSize:13}}>Lower reduces injury risk (conservative); higher increases risk (aggressive).</div>
        </div>
      </div>
    </div>
  )
}
