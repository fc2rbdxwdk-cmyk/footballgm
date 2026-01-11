import React from 'react'
import PlayerCard from './PlayerCard'

export default function PlayerPage({ player, onBack }){
  if(!player) return null
  return (
    <div className="panel player-page">
      <div className="panel-header">
        <h2>{player.name}</h2>
        <div><button className="btn" onClick={onBack}>Back</button></div>
      </div>

      <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
        <div style={{minWidth:180}}>
          <PlayerCard player={player} />
        </div>
        <div style={{flex:1}}>
          <h3>Attributes</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
            <div>Overall</div><div>{player.overall}</div>
            <div>Position</div><div>{player.pos}</div>
            <div>Age</div><div>{player.age}</div>
            <div>Contract</div><div>{player.contract?.years}y • ${player.contract?.salary}</div>
          </div>

          <h3 style={{marginTop:12}}>Season Stats</h3>
          {player.seasonStats ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              <div>Games</div><div>{player.seasonStats.games || 0}</div>
              <div>Pass Yards</div><div>{player.seasonStats.passY || 0} ({player.seasonStats.games ? Math.round((player.seasonStats.passY||0)/player.seasonStats.games) : 0}/game)</div>
              <div>Pass TD</div><div>{player.seasonStats.passTD || 0}</div>
              <div>INT</div><div>{player.seasonStats.int || 0}</div>
              <div>Rush Yards</div><div>{player.seasonStats.rushY || 0} ({player.seasonStats.games ? Math.round((player.seasonStats.rushY||0)/player.seasonStats.games) : 0}/game)</div>
              <div>Rush TD</div><div>{player.seasonStats.rushTD || 0}</div>
              <div>Rec Yards</div><div>{player.seasonStats.recY || 0} ({player.seasonStats.games ? Math.round((player.seasonStats.recY||0)/player.seasonStats.games) : 0}/game)</div>
              <div>Rec TD</div><div>{player.seasonStats.recTD || 0}</div>
              <div>Tackles</div><div>{player.seasonStats.tackles || 0}</div>
              <div>Sacks</div><div>{player.seasonStats.sacks || 0}</div>
            </div>
          ) : (
            <div style={{color:'#BFBFBF'}}>No stats available yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
