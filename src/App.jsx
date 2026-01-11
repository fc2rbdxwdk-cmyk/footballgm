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
import Setup from './components/Setup'
import Contracts from './components/Contracts'
import Injuries from './components/Injuries'
import { proposeTrade, loadLeague, saveLeague, createNewLeague, simulateWeek, generateProspects, markAllNotificationsRead, signDraftPick, signFreeAgent, proposeContract, setInjuryWeeks, clearInjury } from './game/api'

const VIEWS = { DASH: 'dash', ROSTER: 'roster', DRAFT: 'draft', FA: 'fa', RESULTS: 'results', SETTINGS: 'settings', TRADE: 'trade', PLAYER: 'player', HISTORY: 'history', NOTIFICATIONS: 'notifications', BOXES: 'boxes', CONTRACTS: 'contracts', INJURIES: 'injuries' }

export default function App() {
  const [league, setLeague] = useState(() => loadLeague() || createNewLeague())
  const [view, setView] = useState(VIEWS.DASH)

  useEffect(()=>{
    // if this is a new league and setup hasn't been completed show setup
    if(league && league.settings && league.settings.setupComplete === false){
      setView('setup')
    }
  }, [league])
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

  function handleCreateLeague(data){
    const l = createNewLeague({ numTeams: data.numTeams, seasonLength: data.seasonLength, teamNames: data.teamNames, leagueName: data.leagueName })
    l.settings.setupComplete = true
    // create some prospects automatically
    l.prospects = generateProspects(Math.max(6, Math.round(data.numTeams/2)))
    setLeague(l)
    saveLeague(l)
    // auto-open the draft
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
          <img src="/src/assets/logo.svg" alt="logo" className="logo" style={{cursor:'pointer'}} onClick={()=> go(VIEWS.DASH)} />
          <h1 style={{cursor:'pointer'}} onClick={()=> go(VIEWS.DASH)}>Football GM Lite</h1>
        </div>
        <nav className="nav">
          <button className="icon-btn" title="Dashboard" onClick={() => go(VIEWS.DASH)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="14" width="7" height="5"></rect></svg>
          </button>
          <button className="icon-btn" title="Roster" onClick={() => go(VIEWS.ROSTER)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3"/><path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"></path></svg>
          </button>
          <button className="icon-btn" title="Draft" onClick={handleStartDraft}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
          </button>
          <button className="icon-btn" title="Free Agents" onClick={() => go(VIEWS.FA)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button className="icon-btn" title="Trade" onClick={() => go(VIEWS.TRADE)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </button>
          <button className="icon-btn" title="Notifications" onClick={handleOpenNotifications}>{unreadCount>0 && <span className="badge">{unreadCount}</span>}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
          <button className="icon-btn" title="Boxscores" onClick={handleOpenBoxscores}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2" ry="2"/><line x1="3" y1="11" x2="21" y2="11"/></svg></button>
          <button className="icon-btn" title="History" onClick={() => go(VIEWS.HISTORY)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0-.5-5"/><polyline points="12 7 12 12 15 14"/></svg></button>
          <button className="icon-btn" title="Contracts" onClick={() => go(VIEWS.CONTRACTS)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M7 21v-4"/></svg></button>
          <button className="icon-btn" title="Injuries" onClick={() => go(VIEWS.INJURIES)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21l-8-9"/><path d="M4 21l8-9"/></svg></button>
          <button className="icon-btn" title="Settings" onClick={() => go(VIEWS.SETTINGS)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.28 18.9l.06-.06A1.65 1.65 0 0 0 2.67 17a1.65 1.65 0 0 0-.33-1.82V14a2 2 0 0 1 0-4v-.09a1.65 1.65 0 0 0 .33-1.82l-.06-.06A2 2 0 0 1 4.4 3.77l.06.06A1.65 1.65 0 0 0 6.28 4.16 1.65 1.65 0 0 0 7.79 3h.09a2 2 0 0 1 4 0h.09a1.65 1.65 0 0 0 1.51 1 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 8.21V8.3a2 2 0 0 1 0 4v.09a1.65 1.65 0 0 0-.33 1.82z"/></svg></button>
          <button className="icon-btn" title="Reset" onClick={() => { setLeague(createNewLeague()); setView(VIEWS.DASH) }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 12 3v4"/></svg></button>
        </nav>
      </header>

      <main className="container">
        {view === 'setup' && <Setup onStart={handleCreateLeague} initial={{ leagueName: league.leagueName, numTeams: (league.teams||[]).length, seasonLength: league.settings && league.settings.seasonLength, teamNames: (league.teams||[]).map(t=>t.name) }} />}
        {view === VIEWS.DASH && (
          <TeamDashboard league={league} onSimWeek={handleSimWeek} onViewRoster={() => go(VIEWS.ROSTER)} onDraft={handleStartDraft} onViewPlayer={handleViewPlayer} />
        )}
        {view === VIEWS.ROSTER && <Roster team={league.userTeam} onBack={() => go(VIEWS.DASH)} onUpdate={(t) => setLeague(l => ({ ...l, userTeam: t }))} />}
        {view === VIEWS.DRAFT && <Draft league={league} onBack={() => go(VIEWS.DASH)} onLeagueUpdate={(l) => { setLeague(l); saveLeague(l) }} />}
        {view === VIEWS.FA && <FreeAgency league={league} onSign={(player) => { const updated = signFreeAgent(JSON.parse(JSON.stringify(league)), player); setLeague(updated) }} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.RESULTS && <GameResult summary={lastResults} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.SETTINGS && <Settings settings={league.settings} onChange={handleUpdateSettings} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.TRADE && <Trade league={league} onBack={() => go(VIEWS.DASH)} onPropose={handleProposeTrade} />}
        {view === VIEWS.PLAYER && <PlayerPage player={selectedPlayer} onBack={() => go(VIEWS.DASH)} />}
        {view === VIEWS.HISTORY && <TradeHistory league={league} />}
        {view === VIEWS.BOXES && <BoxscoreHistory league={league} onOpen={(box)=>{ setLastResults({ game: box.game, week: box.week, stats: box.stats }); setView(VIEWS.RESULTS) }} />}
        {view === VIEWS.CONTRACTS && <Contracts league={league} onBack={() => go(VIEWS.DASH)} onUpdate={(action, payload) => {
          if(action === 'proposeContract'){
            const res = proposeContract(JSON.parse(JSON.stringify(league)), payload.playerId, payload.years, payload.salary, payload.signingBonus, payload.guaranteed)
            if(res.success){ setLeague(loadLeague()) } else { setLeague(loadLeague()) }
          }
        }} />}
        {view === VIEWS.INJURIES && <Injuries league={league} onBack={() => go(VIEWS.DASH)} onUpdate={(action, payload) => {
          if(action === 'setInjuryWeeks'){
            const updated = setInjuryWeeks(JSON.parse(JSON.stringify(league)), payload.playerId, payload.weeks)
            setLeague(updated)
          }
          if(action === 'clearInjury'){
            const updated = clearInjury(JSON.parse(JSON.stringify(league)), payload.playerId)
            setLeague(updated)
          }
        }} />}
      </main>

      <footer className="footer">Black & Orange theme • Minimal football management</footer>
    </div>
  )
}
