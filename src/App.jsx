import React, { useEffect, useState } from 'react'
import TeamDashboard from './components/TeamDashboard'
import Roster from './components/Roster'
import Draft from './components/Draft'
import FreeAgency from './components/FreeAgency'
import GameResult from './components/GameResult'
import Settings from './components/Settings'
import Trade from './components/Trade'
import PlayerPage from './components/PlayerPage'
import TradeHistory from './components/TradeHistory'
import BoxscoreHistory from './components/BoxscoreHistory'
import Notifications from './components/Notifications'
import { proposeTrade, loadLeague, saveLeague, createNewLeague, simulateWeek, generateProspects, markAllNotificationsRead } from './game/api'

const VIEWS = { DASH: 'dash', ROSTER: 'roster', DRAFT: 'draft', FA: 'fa', RESULTS: 'results', SETTINGS: 'settings', TRADE: 'trade', PLAYER: 'player', HISTORY: 'history', NOTIFICATIONS: 'notifications', BOXES: 'boxes' }

export default function App() {
  const [league, setLeague] = useState(() => loadLeague() || createNewLeague())
  const [view, setView] = useState(VIEWS.DASH)
  const [lastResults, setLastResults] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const unreadCount = (league.notifications || []).filter(n=>!n.read).length

  useEffect(() => saveLeague(league), [league])

  function handleSimWeek() {
    const res = simulateWeek(league)
    setLeague(res.league)
    setLastResults(res.summary)
    setView(VIEWS.RESULTS)
  }

  function go(v) {
    setView(v)
  }

  function handleOpenNotifications(){
    const updated = markAllNotificationsRead(league)
    setLeague({ ...updated })
    setView(VIEWS.NOTIFICATIONS)
  }

  function handleExportLeague(){
    try{
      const data = JSON.stringify(league, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `league-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }catch(e){
      console.error('Export failed', e)
    }
  }

  function handleImportFile(e){
    const file = e.target.files && e.target.files[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try{
        const obj = JSON.parse(ev.target.result)
        if(obj && obj.userTeam){
          setLeague(obj)
          saveLeague(obj)
        } else {
          console.error('Invalid league file')
        }
      }catch(err){ console.error('Import failed', err) }
    }
    reader.readAsText(file)
    e.target.value = null
  }

  function handleOpenBoxscores(){
    setView(VIEWS.BOXES)
  }

  function handleStartDraft() {
    const prospects = generateProspects(4)
    setLeague(l => ({ ...l, prospects }))
    setView(VIEWS.DRAFT)
  }

  function handleUpdateSettings(newSettings){
    setLeague(l => ({ ...l, settings: { ...l.settings, ...newSettings } }))
  }

  function handleProposeTrade(offPlayerId, targetTeamName, targetPlayerId){
    const res = proposeTrade(league, league.userTeam.name, targetTeamName, offPlayerId, targetPlayerId)
    setLeague(res.league)
    return res.decision
  }

  function handleViewPlayer(player){
    setSelectedPlayer(player)
    setView(VIEWS.PLAYER)
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">
          <img src="/src/assets/logo.svg" alt="logo" className="logo" />
          <h1>Football GM Lite</h1>
        </div>
        <nav className="nav">
          <button onClick={() => go(VIEWS.DASH)}>Dashboard</button>
          <button onClick={() => go(VIEWS.ROSTER)}>Roster</button>
          <button onClick={handleStartDraft}>Draft</button>
          <button onClick={() => go(VIEWS.FA)}>Free Agency</button>
          <button onClick={() => go(VIEWS.TRADE)}>Trade</button>
          <button onClick={handleOpenNotifications}>Notifications {unreadCount>0 && <span className="badge">{unreadCount}</span>}</button>
          <button onClick={handleOpenBoxscores}>Boxscores</button>
          <button onClick={() => go(VIEWS.HISTORY)}>History</button>
          <button onClick={handleExportLeague}>Export</button>
          <label style={{display:'inline-block',marginLeft:8}} className="btn">
            Import
            <input type="file" accept="application/json" onChange={handleImportFile} style={{display:'none'}} />
          </label>
          <button onClick={() => go(VIEWS.SETTINGS)}>Settings</button>
          <button onClick={() => { setLeague(createNewLeague()); setView(VIEWS.DASH) }}>Reset</button>
        </nav>
      </header>

      <main className="container">
        {view === VIEWS.DASH && (
          <TeamDashboard league={league} onSimWeek={handleSimWeek} onViewRoster={() => go(VIEWS.ROSTER)} onDraft={handleStartDraft} onViewPlayer={handleViewPlayer} />
        )}
        {view === VIEWS.ROSTER && <Roster team={league.userTeam} onBack={() => go(VIEWS.DASH)} onUpdate={(t) => setLeague(l => ({ ...l, userTeam: t }))} />}
        {view === VIEWS.DRAFT && <Draft league={league} onBack={() => go(VIEWS.DASH)} onDraftPick={(teamName, player) => setLeague(l => ({ ...l, prospects: l.prospects.filter(p=>p.id!==player.id), userTeam: { ...l.userTeam, roster: [...l.userTeam.roster, player] } }))} />}
        {view === VIEWS.FA && <FreeAgency league={league} onSign={(player) => setLeague(l => ({ ...l, freeAgents: l.freeAgents.filter(p=>p.id!==player.id), userTeam: { ...l.userTeam, roster: [...l.userTeam.roster, player] } }))} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.RESULTS && <GameResult summary={lastResults} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.SETTINGS && <Settings settings={league.settings} onChange={handleUpdateSettings} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.TRADE && <Trade league={league} onBack={() => go(VIEWS.DASH)} onPropose={handleProposeTrade} />}
        {view === VIEWS.PLAYER && <PlayerPage player={selectedPlayer} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.HISTORY && <TradeHistory league={league} />}
        {view === VIEWS.BOXES && <BoxscoreHistory league={league} onOpen={(box)=>{ setLastResults({ game: box.game, week: box.week, stats: box.stats }); setView(VIEWS.RESULTS) }} />}
      </main>

      <footer className="footer">Black & Orange theme • Minimal football management</footer>
    </div>
  )
}
