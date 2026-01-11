import React from 'react'
import PlayerCard from './PlayerCard'
import StatLeaders from './StatLeaders'

export default function TeamDashboard({ league, onSimWeek, onViewRoster, onDraft, onViewPlayer }){
  const team = league.userTeam
  const nextGame = { opponent: 'TBD', date: `Week ${league.week}` }
  const topPlayers = team.roster.slice(0,3)

  return (
    <div className="dashboard">
      <div className="panel next-game">
        <h2>Next Game</h2>
        <div className="game-card">
          <div>{nextGame.date}</div>
          <div className="opp">vs {team.roster[0] ? league.teams[1].name : 'TBD'}</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={onSimWeek}>Sim Week</button>
          <button className="btn" onClick={onViewRoster}>View Roster</button>
          <button className="btn" onClick={onDraft}>Draft</button>
        </div>
      </div>

      <div className="panel record">
        <h2>Team Record</h2>
        <div className="record-stats">{team.record?.w}-{team.record?.l}</div>
        <div className="points">PF {team.pointsFor || 0} • PA {team.pointsAgainst || 0}</div>
      </div>

      <div className="panel key-players">
        <h2>Key Players</h2>
        <div className="players-grid">
          {topPlayers.map(p=> <div key={p.id} onClick={()=> onViewPlayer && onViewPlayer(p)}><PlayerCard player={p} /></div>)}
        </div>
      </div>
      <div className="panel">
        <h2>Stat Leaders</h2>
        <StatLeaders league={league} />
      </div>
      <div className="panel">
        <h3>Notifications</h3>
        <div style={{color:'#BFBFBF'}}>{(league.notifications && league.notifications[0]?.text) || 'No notifications'}</div>
      </div>
    </div>
  )
}
