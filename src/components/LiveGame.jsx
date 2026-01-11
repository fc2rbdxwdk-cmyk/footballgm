import React, { useEffect, useState, useRef } from 'react'

function sample(arr){ return arr[Math.floor(Math.random()*arr.length)] }

export default function LiveGame({ summary, onClose }){
  const [plays, setPlays] = useState([])
  const [idx, setIdx] = useState(0)
  const timer = useRef(null)

  useEffect(()=>{
    if(!summary) return
    const { stats } = summary
    const pool = (stats.home||[]).concat(stats.away||[])
    const generated = []
    const playTypes = ['pass','rush','sack','int','fg','td']
    for(let i=0;i<18;i++){
      const p = sample(pool)
      if(!p) continue
      const pt = sample(playTypes)
      let text = ''
      if(pt==='pass') text = `${p.name} catches pass for ${Math.max(3, Math.round((p.recY||10)/(Math.max(1,p.rec||1))))} yds`
      else if(pt==='rush') text = `${p.name} rushes for ${Math.max(1, Math.round((p.rushY||10)/(Math.max(1,p.carries||1))))} yds`
      else if(pt==='sack') text = `Quarterback sacked by ${p.name}`
      else if(pt==='int') text = `Interception by ${p.name}`
      else if(pt==='fg') text = `Field goal good by ${p.name}`
      else text = `Touchdown! ${p.name} scores` 
      generated.push({ text, player: p, side: (stats.home||[]).find(s=>s.id===p.id)?'home':'away' })
    }
    setPlays(generated)
    setIdx(0)
  }, [summary])

  useEffect(()=>{
    // autoplay plays
    if(plays.length===0) return
    timer.current = setInterval(()=>{
      setIdx(i => {
        if(i+1 >= plays.length){ clearInterval(timer.current); return i }
        return i+1
      })
    }, 1200)
    return ()=> clearInterval(timer.current)
  }, [plays])

  if(!summary) return null
  const top = summary.game.topPlayers || []
  const home = { name: summary.game.home, score: summary.game.score[0] }
  const away = { name: summary.game.away, score: summary.game.score[1] }

  return (
    <div className="livegame-modal">
      <div className="livegame">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><strong>{home.name}</strong> {home.score}</div>
          <div className="live-controls">
            <button className="btn" onClick={()=>{ setIdx(0); clearInterval(timer.current); }}>Restart</button>
            <button className="btn" onClick={()=>{ clearInterval(timer.current); setIdx(i=>Math.min(plays.length-1,i+1)) }}>Next</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
          <div><strong>{away.name}</strong> {away.score}</div>
        </div>

        <div className="field" aria-hidden>
          <div className="field-play">{plays[idx] && plays[idx].text}</div>
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
