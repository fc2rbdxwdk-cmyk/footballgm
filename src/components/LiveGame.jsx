import React, { useEffect, useState, useRef } from 'react'

function sample(arr){ return arr[Math.floor(Math.random()*arr.length)] }

function posForRole(pos){
  // simple field x,y positions [0..100]
  if(pos==='QB') return { x:10, y:50 }
  if(pos==='RB') return { x:30, y:50 }
  if(pos==='WR') return { x:30, y:20 }
  if(pos==='TE') return { x:30, y:40 }
  if(pos==='OL') return { x:20, y:50 }
  if(pos==='DL') return { x:40, y:50 }
  if(pos==='LB') return { x:35, y:50 }
  return { x:50, y:50 }
}

export default function LiveGame({ summary, onClose }){
  const [plays, setPlays] = useState([])
  const [idx, setIdx] = useState(0)
  const timer = useRef(null)
  const [ballX, setBallX] = useState(10)

  useEffect(()=>{
    if(!summary) return
    const { stats } = summary
    const pool = (stats.home||[]).concat(stats.away||[])
    const generated = []
    const playTypes = ['pass','rush','sack','int','fg','td']
    let lineOfScrimmage = 25
    for(let i=0;i<18;i++){
      const p = sample(pool)
      if(!p) continue
      const pt = sample(playTypes)
      let text = ''
      let yards = Math.max(1, Math.round((p.recY||10)/(Math.max(1,p.rec||1))))
      if(pt==='pass') { text = `${p.name} catches pass for ${yards} yds`; lineOfScrimmage += yards }
      else if(pt==='rush') { text = `${p.name} rushes for ${yards} yds`; lineOfScrimmage += yards }
      else if(pt==='sack') { text = `Quarterback sacked by ${p.name}`; lineOfScrimmage -= 5 }
      else if(pt==='int') { text = `Interception by ${p.name}`; lineOfScrimmage -= 10 }
      else if(pt==='fg') { text = `Field goal good by ${p.name}`; }
      else { text = `Touchdown! ${p.name} scores`; lineOfScrimmage = 100 }
      lineOfScrimmage = Math.max(0, Math.min(100, lineOfScrimmage))
      generated.push({ text, player: p, side: (stats.home||[]).find(s=>s.id===p.id)?'home':'away', loc: lineOfScrimmage, playType: pt })
    }
    setPlays(generated)
    setIdx(0)
    setBallX(10)
  }, [summary])

  useEffect(()=>{
    // autoplay plays and animate ball toward loc
    if(plays.length===0) return
    clearInterval(timer.current)
    timer.current = setInterval(()=>{
      setIdx(i => {
        const next = Math.min(plays.length-1, i+1)
        const targetX = (plays[next] && plays[next].loc) ? (10 + (plays[next].loc/100)*80) : 10
        // animate ball to target
        setBallX(targetX)
        if(next >= plays.length-1){ clearInterval(timer.current); return next }
        return next
      })
    }, 1300)
    return ()=> clearInterval(timer.current)
  }, [plays])

  if(!summary) return null
  const stats = summary.stats || summary.game.stats || { home: [], away: [] }
  const players = (stats.home||[]).concat(stats.away||[])

  return (
    <div className="livegame-modal">
      <div className="livegame">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><strong>{summary.game.home}</strong> {summary.game.score[0]}</div>
          <div className="live-controls">
            <button className="btn" onClick={()=>{ setIdx(0); clearInterval(timer.current); setBallX(10) }}>Restart</button>
            <button className="btn" onClick={()=>{ clearInterval(timer.current); setIdx(i=>Math.min(plays.length-1,i+1)) }}>Next</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
          <div><strong>{summary.game.away}</strong> {summary.game.score[1]}</div>
        </div>

        <div className="field" role="img" aria-label="Live field">
          <div className="yard-lines">
            {Array.from({length:11}).map((_,i)=> (<div key={i} className="yard" style={{left:`${i*10}%`}}>{100 - i*10}</div>))}
          </div>

          <div className="players-on-field">
            {players.map(p => {
              const pos = posForRole(p.pos)
              const left = `${pos.x}%`
              const top = `${pos.y}%`
              return (
                <div key={p.id} className={`field-player ${p.pos.toLowerCase()}`} style={{left,top,background:p.teamColor}} title={`${p.name} (${p.pos})`}>
                  <div className="fp-name">{p.name.split(' ')[0]}</div>
                </div>
              )
            })}
          </div>

          <div className="ball" style={{left:`${ballX}%`}}>🏈</div>

          <div className="field-play big">{plays[idx] && plays[idx].text}</div>
          <div className="play-index">Play {idx+1} / {plays.length}</div>
        </div>

        <div className="play-list">
          {plays.map((pl,i)=> (
            <div key={i} className={`play ${i===idx? 'active': ''}`}>{i+1}. {pl.text}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
