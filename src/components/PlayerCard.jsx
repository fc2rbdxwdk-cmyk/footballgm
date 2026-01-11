import React from 'react'

function MiniJersey({ teamColor, number }){
  const bg = teamColor || '#333'
  return (
    <div className="mini-jersey" style={{background:bg}}>
      <div className="jersey-number">{number}</div>
    </div>
  )
}

export default function PlayerCard({ player, onClick }){
  const number = (player.id || '').slice(-2).replace(/[^0-9]/g,'') || Math.floor((player.overall||60)%99)
  const teamColor = player.teamColor || '#222'
  return (
    <div className="card player-card" onClick={onClick} style={{cursor: onClick ? 'pointer': 'default'}}>
      <div className="player-top">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <MiniJersey teamColor={teamColor} number={number} />
          <div>
            <div className="player-name">{player.name}</div>
            <div className="player-pos">{player.pos} · {player.age} {player.injury && player.injury.weeks>0 && <span style={{color:'#FF7A00',marginLeft:8}}>Injured {player.injury.weeks}w</span>}</div>
          </div>
        </div>
      </div>
      {player.starter && <div className="starter-badge">Starter</div>}
      <div className="player-body">
        <div className="rating">OVR {player.overall}</div>
        <div className="contract">{player.contract?.years}y • ${player.contract?.salary}</div>
      </div>
    </div>
  )
}
