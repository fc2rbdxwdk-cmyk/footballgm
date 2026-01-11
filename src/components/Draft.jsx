import React, { useState } from 'react'
import PlayerCard from './PlayerCard'
import { startDraft, beginDraft, tradePicks, performDraftPick, scoutProspect, getScoutReport } from '../game/api'

export default function Draft({ league, onBack, onLeagueUpdate }){
  const prospects = league.prospects || []
  const draft = league.draft || {}
  const [selectedTradeA, setSelectedTradeA] = useState(null)
  const [selectedTradeB, setSelectedTradeB] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportData, setReportData] = useState(null)

  function handleViewReport(id){
    const res = getScoutReport(league, id)
    if(res.success){ setReportTarget(id); setReportData(res) }
  }

  function handleStartDraft(){
    const updated = startDraft(JSON.parse(JSON.stringify(league)), draft?.rounds || 3)
    const begun = beginDraft(updated)
    onLeagueUpdate && onLeagueUpdate(begun)
  }

  function handleTrade(){
    if(!selectedTradeA || !selectedTradeB) return
    const cloned = JSON.parse(JSON.stringify(league))
    const res = tradePicks(cloned, selectedTradeA.id, selectedTradeB.id)
    if(res.success){ onLeagueUpdate && onLeagueUpdate(cloned) }
    setSelectedTradeA(null); setSelectedTradeB(null)
  }

  function handlePick(pick){
    // only allow selecting prospect if this pick belongs to user
    if(!league.draft || !league.draft.started) return
    if(pick.owner !== league.userTeam.name) return
    // show prospects and allow pick
  }

  // when in-draft: show current pick and allow to select a prospect if it's user's pick
  const isInDraft = draft && draft.started
  const current = draft && draft.board && draft.board[draft.currentPickIndex]

  return (
    <div className="panel draft-view">
      <div className="panel-header">
        <h2>Draft</h2>
        <button className="btn" onClick={onBack}>Close</button>
      </div>

      {!isInDraft && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <h3>Pre-Draft Lobby</h3>
              <div style={{color:'#BFBFBF'}}>You can trade draft picks before the draft starts.</div>
            </div>
            <div>
              <button className="btn primary" onClick={handleStartDraft}>Start Draft (Begin)</button>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
            <div>
              <h4>Draft Board</h4>
              <div style={{maxHeight:360,overflow:'auto'}}>
                {(draft.board||[]).map(p=> (
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:8,borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
                    <div>{p.round}.{p.pickNumber} — {p.owner}</div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn" onClick={()=> setSelectedTradeA(p)} style={{background: selectedTradeA === p ? 'rgba(255,122,0,0.12)':undefined}}>Pick A</button>
                      <button className="btn" onClick={()=> setSelectedTradeB(p)} style={{background: selectedTradeB === p ? 'rgba(255,122,0,0.12)':undefined}}>Pick B</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4>Trades</h4>
              <div style={{marginBottom:8}}>
                <div>Selected A: {selectedTradeA ? `${selectedTradeA.round}.${selectedTradeA.pickNumber} (${selectedTradeA.owner})` : '—'}</div>
                <div>Selected B: {selectedTradeB ? `${selectedTradeB.round}.${selectedTradeB.pickNumber} (${selectedTradeB.owner})` : '—'}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn primary" onClick={handleTrade}>Trade Selected Picks</button>
                <button className="btn" onClick={()=>{ setSelectedTradeA(null); setSelectedTradeB(null) }}>Clear</button>
              </div>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <h4>Prospects (Scout Grades shown)</h4>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{color:'#BFBFBF'}}>Scouting points: <strong>{league.scoutingPoints || 0}</strong></div>
              <div style={{color:'#BFBFBF',fontSize:13}}>Tip: Scouting reduces uncertainty and nudges public grade toward true ability.</div>
            </div>
            <div className="prospects-grid" style={{marginTop:8}}>
              {prospects.map(p => (
                <div key={p.id} className="prospect">
                  <PlayerCard player={{...p, overall:p.scoutGrade}} />
                  <div style={{color:'#BFBFBF',fontSize:13,marginTop:8}}>Confidence: {p.scoutConfidence}%</div>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button className="btn" onClick={()=>{
                      const cloned = JSON.parse(JSON.stringify(league))
                      // attempt to scout 5 points
                      const res = scoutProspect(cloned, p.id, 5)
                      if(res.success) onLeagueUpdate && onLeagueUpdate(cloned)
                    }}>Scout +5</button>
                    <button className="btn" onClick={()=>{
                      const cloned = JSON.parse(JSON.stringify(league))
                      const res = scoutProspect(cloned, p.id, 10)
                      if(res.success) onLeagueUpdate && onLeagueUpdate(cloned)
                    }}>Scout +10</button>
                    <button className="btn" onClick={()=> handleViewReport(p.id)}>View Report</button>
                  </div>

                  {reportTarget === p.id && reportData && (
                    <div style={{marginTop:8,background:'#0b0b0b',padding:8,borderRadius:6}}>
                      <div style={{fontSize:13,fontWeight:600}}>Scout Report</div>
                      <div style={{color:'#BFBFBF',fontSize:13}}>Grade: {reportData.grade} — Confidence: {reportData.confidence}%</div>
                      <div style={{marginTop:6}}>
                        {reportData.sources.length === 0 ? (<div style={{color:'#BFBFBF'}}>No sources yet</div>) : (
                          <ul style={{margin:0,paddingLeft:18}}>
                            {reportData.sources.map(s=> (<li key={s.id} style={{color:'#BFBFBF'}}>[{s.type}] {s.points} pts — grade {s.grade} (uncertainty {s.uncertainty})</li>))}
                          </ul>
                        )}
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isInDraft && (
        <div>
          <h3>Draft Live</h3>
          <div style={{marginBottom:8}}>
            {current ? (
              <div>
                Current Pick: {current.round}.{current.pickNumber} — Owner: {current.owner} {current.owner === league.userTeam.name && <strong> (Your pick)</strong>}
              </div>
            ) : (
              <div>Draft complete</div>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:12}}>
            <div>
              <h4>Prospects</h4>
              <div className="prospects-grid">
                {prospects.map(p => (
                  <div key={p.id} className="prospect">
                    <PlayerCard player={{...p, overall:p.scoutGrade}} />
                    <div style={{display:'flex',gap:8,marginTop:6}}>
                      {current && current.owner === league.userTeam.name ? (
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn primary" onClick={() => {
                            const cloned = JSON.parse(JSON.stringify(league))
                            const res = performDraftPick(cloned, current.id, p.id)
                            if(res.success) onLeagueUpdate && onLeagueUpdate(cloned)
                          }}>Select</button>
                          <button className="btn" onClick={()=> handleViewReport(p.id)}>View Report</button>
                        </div>
                      ) : (
                        <button className="btn" disabled>Not your pick</button>
                      )}

                      {reportTarget === p.id && reportData && (
                        <div style={{marginTop:8,background:'#0b0b0b',padding:8,borderRadius:6}}>
                          <div style={{fontSize:13,fontWeight:600}}>Scout Report</div>
                          <div style={{color:'#BFBFBF',fontSize:13}}>Grade: {reportData.grade} — Confidence: {reportData.confidence}%</div>
                          <div style={{marginTop:6}}>
                            {reportData.sources.length === 0 ? (<div style={{color:'#BFBFBF'}}>No sources yet</div>) : (
                              <ul style={{margin:0,paddingLeft:18}}>
                                {reportData.sources.map(s=> (<li key={s.id} style={{color:'#BFBFBF'}}>[{s.type}] {s.points} pts — grade {s.grade} (uncertainty {s.uncertainty})</li>))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4>Board</h4>
              <div style={{maxHeight:420,overflow:'auto'}}>
                {(draft.board||[]).map(p=> (
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:8,borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
                    <div>{p.round}.{p.pickNumber} — {p.owner} {p.playerId ? ' — PICKED' : ''}</div>
                    <div>{p.playerId ? '✓' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
