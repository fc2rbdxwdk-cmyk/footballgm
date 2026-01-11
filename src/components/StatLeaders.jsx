import React, { useMemo, useState } from 'react'

const POS_ICON = { QB: '🏈', RB: '🏃', WR: '✋', TE: '🤝', OL: '🛡️', DL: '💪', LB: '🎯', CB: '🧤' }

export default function StatLeaders({ league }){
  const [scope, setScope] = useState('season')
  const [weeks, setWeeks] = useState(3)

  const allPlayers = useMemo(()=>{
    const arr = []
    ;(league.teams||[]).forEach(t=> t.roster.forEach(p=> arr.push({ ...p, team: t.name })))
    ;(league.userTeam?.roster||[]).forEach(p=> arr.push({ ...p, team: league.userTeam.name }))
    return arr
  }, [league])

  // derive stats based on scope
  function getStatValue(player, statKey){
    if(scope === 'season') return player.seasonStats ? (player.seasonStats[statKey] || 0) : 0
    // last N weeks: aggregate from recentBoxscores
    const boxes = league.recentBoxscores || []
    const slice = boxes.slice(0, weeks)
    let sum = 0
    slice.forEach(b => {
      const teamStats = (b.stats.home || []).concat(b.stats.away || [])
      const p = teamStats.find(s=> s.id === player.id)
      if(p) sum += (p[statKey] || 0)
    })
    return sum
  }

  function topBy(statKey, label){
    const ranked = allPlayers.map(p=> ({ player: p, val: getStatValue(p, statKey) || 0 })).sort((a,b)=> b.val-a.val).slice(0,5)
    return (
      <div className="panel leaders">
        <h4>{label}</h4>
        {ranked.map(r=> (
          <div key={r.player.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{fontSize:18}}>{POS_ICON[r.player.pos] || '•'}</div>
              <div><div style={{fontWeight:700}}>{r.player.name}</div><div style={{color:'#BFBFBF',fontSize:12}}>{r.player.team} • {r.player.pos}</div></div>
            </div>
            <div style={{fontWeight:700}}>{Math.round(r.val)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:8}}>
        <label style={{fontWeight:700}}>Scope:</label>
        <select value={scope} onChange={e=>setScope(e.target.value)}>
          <option value="season">Season</option>
          <option value="last">Last N Weeks</option>
        </select>
        {scope==='last' && (
          <label style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:'#BFBFBF'}}>Weeks:</span>
            <input type="number" min="1" max="12" value={weeks} onChange={e=>setWeeks(Number(e.target.value))} style={{width:60,padding:6}} />
          </label>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
        {topBy('passY', 'Passing Yards')}
        {topBy('rushY', 'Rushing Yards')}
        {topBy('recY', 'Receiving Yards')}
        {topBy('tackles', 'Tackles')}
        {topBy('sacks', 'Sacks')}
      </div>
    </div>
  )
}
