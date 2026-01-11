// Simple game logic API: persistence, generate prospects, simulate games, transactions

const STORAGE_KEY = 'fgm_league_v1'

function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 9) }

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export function loadLeague() {
  try {
    if (typeof localStorage === 'undefined') {
      // node/test environment fallback
      globalThis.__FGM_INMEM__ = globalThis.__FGM_INMEM__ || {}
      const v = globalThis.__FGM_INMEM__[STORAGE_KEY]
      return v ? JSON.parse(v) : null
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  }
  catch { return null }
}

export function saveLeague(league) {
  try{
    if (typeof localStorage === 'undefined'){
      globalThis.__FGM_INMEM__ = globalThis.__FGM_INMEM__ || {}
      globalThis.__FGM_INMEM__[STORAGE_KEY] = JSON.stringify(league)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(league))
  }catch(e){
    // ignore in environments without localStorage
  }
}

const TEAM_COLORS = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf']

const FIRSTS = ["Alex","Jordan","Taylor","Chris","Drew","Sam","Cody","Blake","Evan","Ryan","Logan","Kyle","Mason","Sean","Tyler","Derek","Noah","Liam","Oliver","Ethan"]
const LASTS = ["Johnson","Smith","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Garcia","Martinez","Robinson","Clark","Rodriguez"]
function randomName(){ return `${sample(FIRSTS)} ${sample(LASTS)}` }

function makePlayer(name, pos='RB', overall=70, age=24, teamColor = '#444', salaryOverride) {
  const n = name || randomName()
  // add positional attributes and hidden traits
  const attributes = {
    speed: randInt(40, 95),
    strength: randInt(40,95),
    awareness: randInt(40,95),
    hands: randInt(40,95),
    coverage: randInt(40,95),
    durability: randInt(40,95)
  }
  const hiddenTraits = {
    injuryProne: Math.random() < 0.08,
    clutch: Math.random() < 0.12,
    consistency: Math.random() < 0.7,
    leader: Math.random() < 0.15
  }
  return { id: uid('p_'), name: n, pos, overall, age, attributes, hiddenTraits, contract: { years: 2, salary: salaryOverride || randInt(4000,12000), signingBonus:0, guaranteed:0, startSeason: null }, starter: false, injury: null, teamColor, seasonStats: { games:0, passY:0, passTD:0, int:0, rushY:0, rushTD:0, recY:0, recTD:0, tackles:0, sacks:0 } }
}

function makeTeam(name, color) {
  const roster = Array.from({ length: 12 }).map((_, i) => makePlayer(null, ['QB','RB','WR','TE','OL','DL','LB','CB'][i%8], randInt(60,80), randInt(20,34), color))
  // mark first few as starters (simple rule)
  roster.slice(0,4).forEach(p=> p.starter = true)
  return { name, color, roster, record: { w:0,l:0 }, pointsFor:0, pointsAgainst:0, playedOpponents: [] }
}

export function createNewLeague({ numTeams = 8, seasonLength = 10, teamNames = ['Ravens','Tigers','Warriors','Panthers','Bulls','Hawks','Knights','Titans'], leagueName = 'My League' } = {}) {
  // clamp numTeams and pick teamNames
  numTeams = Math.max(4, Math.min(20, Number(numTeams)))
  const names = teamNames.slice(0, numTeams)
  const teams = names.map((n, i) => makeTeam(n, TEAM_COLORS[i % TEAM_COLORS.length]))
  // assign simple AI personas to teams (influences trade acceptance & drafting). User team is balanced by default.
  const personaOptions = ['win-now','balanced','rebuild']
  teams.forEach((t, idx) => {
    t.persona = { style: idx===0 ? 'balanced' : sample(personaOptions), aggressiveness: idx===0 ? 0.5 : (0.3 + Math.random()*0.7) }
  })
  const userTeam = { ...teams[0], balance: 100000 }
  // ensure every player's teamColor set
  teams.forEach(t => t.roster.forEach(p => p.teamColor = t.color))
  userTeam.roster.forEach(p=> p.teamColor = userTeam.color)

  const freeAgents = Array.from({length:Math.max(8, Math.round(numTeams*1.2))}).map((_,i)=> makePlayer(null, sample(['QB','RB','WR','TE']), randInt(55,78), randInt(21,33)))
  const prospects = Array.from({length:Math.max(10, Math.round(numTeams*1.5))}).map((_,i)=> makePlayer(null, sample(['QB','RB','WR','TE']), randInt(60,85), randInt(19,22)))
  // convert prospects to scouting-aware prospects
  const scoutedProspects = prospects.map(p => ({ id: p.id, name: p.name, pos: p.pos, trueOverall: p.overall, scoutGrade: Math.round(p.overall + randInt(-6,6)), scoutConfidence: 25, scoutHistory: [], age: p.age, archetype: sample(['workhorse','speedster','positional-blocker']), bustProbability: Math.max(0.02, (80 - p.overall)/180) }))
  // assign conferences and divisions (simple split)
  const confNames = ['East','West']
  teams.forEach((t, idx) => { t.conference = confNames[idx % confNames.length]; t.division = `Division ${Math.floor(idx/confNames.length)+1}` })
  return { teams, userTeam, freeAgents, prospects: scoutedProspects, leagueName, settings: { difficulty: 1, seasonLength, salaryCap: true, salaryCapAmount: 100000, trainingRisk: 1, setupComplete: false, playoffSize: Math.min(4, numTeams), playoffSeriesLength: 1, playoffByConference: numTeams >= 6 }, week: 1, season: 1, phase: 'offseason', deadMoney: 0, tradeHistory: [], notifications: [], scoutingPoints: 10 }
}

export function addNotification(league, text){
  const note = { id: uid('n_'), text, time: Date.now() }
  const noteWithRead = { ...note, read: false }
  league.notifications = league.notifications || []
  league.notifications.unshift(noteWithRead)
  // keep recent
  league.notifications = league.notifications.slice(0,50)
  saveLeague(league)
  return note
}

export function advanceInjuries(league){
  const allTeams = [...(league.teams||[]), league.userTeam].filter(Boolean)
  allTeams.forEach(team => team.roster.forEach(p => {
    if(p.injury && p.injury.weeks && p.injury.weeks > 0){
      p.injury.weeks = Math.max(0, p.injury.weeks - 1)
      if(p.injury.weeks === 0){
        p.injury = null
        addNotification(league, `${p.name} has recovered from injury.`)
      }
    }
  }))
  saveLeague(league)
  return league
}

function injurePlayer(player, severity){
  if(!player) return null
  const map = { minor: [1,2], moderate: [3,6], severe: [7,16] }
  const range = map[severity] || map.minor
  const weeks = randInt(range[0], range[1])
  player.injury = { type: severity, weeks }
  return player
}

function maybeRandomInjuriesForTeam(team, difficulty, trainingRisk = 1){
  const injured = []
  const roster = team.roster || []
  roster.forEach(p=>{
    if(p.injury && p.injury.weeks>0) return
    // base chance influenced by age and wear
    const ageFactor = Math.max(0, (p.age - 24)) / 40
    const wear = Math.max(0, (80 - (p.overall||60))) / 200
    const base = 0.01 // 1% base chance per game
    let chance = base + ageFactor*0.02 + wear*0.02 + difficulty*0.004
    // trainingRisk <1 reduces chance (conservative), >1 increases (aggressive)
    chance = chance * (trainingRisk || 1)
    if(Math.random() < chance){
      const r = Math.random()
      const severity = r < 0.6 ? 'minor' : (r < 0.9 ? 'moderate' : 'severe')
      injurePlayer(p, severity)
      injured.push({ player: p, severity })
    }
  })
  return injured
}

export function markAllNotificationsRead(league){
  league.notifications = (league.notifications || []).map(n=> ({ ...n, read: true }))
  saveLeague(league)
  return league
}

export function getPlayerById(league, id){
  const all = []
  ;(league.teams||[]).forEach(t=> t.roster.forEach(p=> all.push({...p, team: t.name})))
  ;(league.userTeam?.roster||[]).forEach(p=> all.push({...p, team: league.userTeam.name}))
  ;(league.freeAgents||[]).forEach(p=> all.push({...p, team: 'Free Agent'}))
  ;(league.prospects||[]).forEach(p=> all.push({...p, team: 'Prospect'}))
  return all.find(p=>p.id===id) || null
}

// Draft utilities
export function createDraftBoard(league, rounds = 3){
  const teams = [ ...(league.teams||[]), league.userTeam ].map(t=> t.name)
  const board = []
  for(let r=1;r<=rounds;r++){
    for(let i=0;i<teams.length;i++){
      const pickNumber = (r-1) * teams.length + (i+1)
      board.push({ id: uid('pick_'), round: r, pickNumber, owner: teams[i], originalOwner: teams[i], playerId: null, locked: false })
    }
  }
  return board
}

export function startDraft(league, rounds = 3){
  league.draft = league.draft || {}
  league.draft.rounds = rounds
  league.draft.board = createDraftBoard(league, rounds)
  league.draft.started = false
  league.draft.currentPickIndex = 0
  saveLeague(league)
  return league
}

export function tradePicks(league, pickIdA, pickIdB){
  // only allowed before draft starts
  if(league.draft && league.draft.started) return { success:false, reason: 'Draft already started' }
  const a = (league.draft && league.draft.board||[]).find(p=>p.id===pickIdA)
  const b = (league.draft && league.draft.board||[]).find(p=>p.id===pickIdB)
  if(!a || !b) return { success:false, reason: 'Pick not found' }

  // If either owner is an AI team (not user), evaluate acceptance for that owner
  function pickValue(pick){
    // value is higher for earlier picks; include round/pickNumber
    return 1000 / (pick.pickNumber) + (30 - pick.round)
  }

  const difficulty = (league.settings && league.settings.difficulty) || 1
  // check acceptance for owner of A receiving B
  const ownerA = a.owner
  const ownerB = b.owner

  let accept = true
  // if ownerB is not the same as owner of A (i.e., a trade will affect AI), do a simple evaluation
  if(ownerB !== ownerA){
    const valForB = pickValue(b) - pickValue(a)
    // tolerance influenced by difficulty: higher difficulty -> less willing to accept bad deals
    const tolerance = 20 * (1 + difficulty * 0.5)
    if(valForB < -tolerance) accept = false
  }

  if(!accept) return { success:false, reason: 'Offer declined by AI' }

  // swap owners
  const tmp = a.owner
  a.owner = b.owner
  b.owner = tmp
  saveLeague(league)
  addNotification(league, `Picks traded: ${a.round}.${a.pickNumber} ↔ ${b.round}.${b.pickNumber}`)
  return { success:true }
}

export function aiSelectProspect(league, teamName){
  const team = (league.teams||[]).find(t=>t.name===teamName) || (league.userTeam && league.userTeam.name === teamName ? league.userTeam : null)
  if(!team) return null
  // simple AI ranking: public scoutGrade, youth bonus for rebuild persona, position need bonus
  const persona = team.persona || { style: 'balanced', aggressiveness: 0.5 }
  function posNeedBonus(p){
    const count = (team.roster||[]).filter(x=>x.pos===p.pos).length
    return Math.max(0, 2 - count) * 20
  }
  const ranked = (league.prospects||[]).map(p=>{
    let score = (p.scoutGrade || p.trueOverall || 60) * 2
    if(persona.style === 'rebuild') score += (30 - (p.age||21)) * 3
    if(persona.style === 'win-now') score += ((p.age||25) - 24) * 1.5
    score += posNeedBonus(p)
    score -= p.bustProbability * 50
    return { id: p.id, score }
  }).sort((a,b)=> b.score - a.score)
  return ranked.length ? ranked[0].id : null
}

export function beginDraft(league){
  if(!league.draft || !league.draft.board) startDraft(league, league.draft?.rounds || 3)
  league.draft.started = true
  league.draft.currentPickIndex = 0

  // auto-pick for AI teams until it becomes the user's pick or draft completes
  function current(){ return (league.draft && league.draft.board && league.draft.board[league.draft.currentPickIndex]) || null }
  let cp = current()
  const userName = league.userTeam && league.userTeam.name
  while(cp && cp.owner !== userName){
    const chosen = aiSelectProspect(league, cp.owner) || (league.prospects && league.prospects[0] && league.prospects[0].id)
    if(!chosen) break
    performDraftPick(league, cp.id, chosen)
    cp = current()
  }

  saveLeague(league)
  return league
}

export function currentPick(league){
  return (league.draft && league.draft.board && league.draft.board[league.draft.currentPickIndex]) || null
}

export function performDraftPick(league, pickId, playerId){
  if(!league.draft || !league.draft.started) return { success:false, reason: 'Draft not started' }
  const pick = league.draft.board.find(p=>p.id===pickId)
  if(!pick) return { success:false, reason: 'Pick not found' }
  if(pick.playerId) return { success:false, reason: 'Pick already used' }
  // assign player
  pick.playerId = playerId
  // move player from prospects to owner's roster
  const player = league.prospects.find(p=>p.id===playerId)
  if(!player) return { success:false, reason: 'Player not found' }
  // find owning team object
  const teamObj = (league.teams||[]).find(t=>t.name===pick.owner) || (league.userTeam && league.userTeam.name === pick.owner ? league.userTeam : null)
  if(!teamObj) return { success:false, reason: 'Team not found' }
  // reveal true overall (we set actual True overall earlier) and convert to player object
  const newPlayer = { ...player, overall: player.trueOverall, contract: { years: 2, salary: Math.round(4000 + (player.trueOverall-60)*120), signingBonus:0, guaranteed:0, startSeason: league.season || 1 }, starter: false }
  teamObj.roster.push(newPlayer)
  // remove from prospects
  league.prospects = league.prospects.filter(p=>p.id !== playerId)
  // advance current pick
  league.draft.currentPickIndex = Math.min(league.draft.board.length-1, (league.draft.currentPickIndex||0) + 1)
  saveLeague(league)
  addNotification(league, `${teamObj.name} selected ${newPlayer.name} (${newPlayer.pos}) with pick ${pick.round}.${pick.pickNumber}`)
  return { success:true }
}

export function draftBoardForTeam(league, teamName){
  return (league.draft && league.draft.board || []).filter(p=> p.owner === teamName)
} 

export function scoutProspect(league, prospectId, points){
  league.scoutingPoints = league.scoutingPoints || 0
  if(points > league.scoutingPoints) return { success:false, reason: 'Not enough scouting points' }
  league.scoutingPoints -= points
  const p = (league.prospects||[]).find(x=>x.id === prospectId)
  if(!p) return { success:false, reason: 'Prospect not found' }
  // reduce scoutConfidence and adjust scoutGrade toward trueOverall
  const reduction = Math.min(20, points * 2)
  p.scoutConfidence = Math.max(5, p.scoutConfidence - reduction)
  // nudge scoutGrade toward trueOverall
  const delta = Math.round((p.trueOverall - p.scoutGrade) * (reduction / 100))
  p.scoutGrade = p.scoutGrade + delta
  // record scouting source entry
  p.scoutHistory = p.scoutHistory || []
  p.scoutHistory.push({ id: uid('sh_'), points, type: points >= 10 ? 'national' : 'regional', grade: p.scoutGrade, uncertainty: p.scoutConfidence, ts: Date.now() })
  addNotification(league, `Scouted ${p.name}: confidence now ${p.scoutConfidence}%`) 
  saveLeague(league)
  return { success:true }
}

export function generateProspects(count = 4) {
  // Returns prospects with hidden trueOverall and public scoutGrade +/- confidence
  const positions = ['QB','RB','WR','TE','OL','DL','LB','CB']
  const archetypes = ['workhorse','speedster','speedy','positional-blocker','coverage-specialist','big-play-wr','dual-threat-qb']
  return Array.from({length:count}).map((_,i)=>{
    const pos = sample(positions)
    const trueOverall = randInt(58,92)
    // scouting adds noise; scouts give a grade and confidence
    const confidence = Math.max(5, Math.min(35, Math.round((Math.random()*0.25 + 0.05)*100))) // percent
    const grade = Math.round(trueOverall + randInt(-Math.round(12*confidence/100), Math.round(12*confidence/100)))
    const bustProbability = Math.max(0.02, (80 - trueOverall) / 180) // higher for lower trueOverall
    const archetype = sample(archetypes)
    return { id: uid('pr_'), name: `Rookie ${uid('')}`, pos, trueOverall, scoutGrade: grade, scoutConfidence: confidence, scoutHistory: [], age: randInt(19,22), archetype, bustProbability }
  })
} 

export function getScoutReport(league, prospectId){
  const p = (league.prospects||[]).find(x=>x.id === prospectId)
  if(!p) return { success:false, reason: 'Prospect not found' }
  // we keep `scoutConfidence` as uncertainty (lower = better); report flips to conventional confidence (higher=better)
  const confidence = Math.max(0, Math.min(100, 100 - (p.scoutConfidence || 25)))
  return { success:true, grade: p.scoutGrade, confidence, sources: p.scoutHistory || [] }
}

export function setPhase(league, phase){
  league.phase = phase
  saveLeague(league)
  addNotification(league, `Phase changed to ${phase}`)
  return league
}

export function ensureFreeAgents(league, minCount = 8){
  league.freeAgents = league.freeAgents || []
  while(league.freeAgents.length < minCount){
    league.freeAgents.push(makePlayer(null, sample(['QB','RB','WR','TE']), randInt(55,78)))
  }
  saveLeague(league)
  return league
}

function teamStrength(team) {
  if(!team || !team.roster) return 60
  const avg = Math.round(team.roster.reduce((s,p)=>s+p.overall,0)/Math.max(1,team.roster.length))
  return avg
}

export function simulateGame(home, away, difficulty=1) {
  const hStr = teamStrength(home) + randInt(-10,10)
  const aStr = teamStrength(away) + randInt(-10,10)
  const hScore = Math.max(0, Math.round((hStr/10) + randInt(7,28) - difficulty))
  const aScore = Math.max(0, Math.round((aStr/10) + randInt(7,28) - difficulty))

  // Team-level attempt and target distribution model
  function distributeTeamStats(team, teamStr, oppStr){
    const roster = team.roster || []
    const passAttBase = randInt(28,44)
    const passAttempts = Math.max(10, Math.round(passAttBase * (teamStr/(teamStr+oppStr))))
    const rushAttBase = randInt(28,44)
    const rushAttempts = Math.max(8, Math.round(rushAttBase * (oppStr/(teamStr+oppStr))))

    // compute weights for targets: WR>TE>RB
    const weights = roster.map(p => {
      const base = p.overall || 60
      const posMult = p.pos==='WR' ? 1.2 : p.pos==='TE' ? 0.9 : p.pos==='RB' ? 0.6 : 0.4
      return Math.max(0.1, base * posMult)
    })
    const totalWeight = weights.reduce((s,w)=>s+w,0) || 1

    // distribute targets and carries
    const totalTargets = Math.max(6, Math.round(passAttempts * (0.55 + Math.random()*0.08)))
    const totalCarries = Math.max(10, Math.round(rushAttempts * (0.9 + Math.random()*0.2)))

    // find QB (first QB) to assign attempts
    const qbs = roster.filter(p=>p.pos==='QB')
    const qb = qbs[0]

    const perPlayerStats = roster.map((p, idx) => {
      const s = { name: p.name, id: p.id, pos: p.pos }
      // targets share
      const tShare = Math.max(0.01, weights[idx] / totalWeight)
      const targets = Math.round(totalTargets * tShare * (0.8 + Math.random()*0.4))
      // carries share more for RBs
      const carryWeight = p.pos==='RB' ? (p.overall||60) : 0
      // we'll distribute carries later for RBs
      s.targets = targets
      // receptions based on catch rate
      const catchRate = Math.min(0.98, 0.4 + (p.overall-60)/120 + Math.random()*0.15)
      s.rec = Math.round(s.targets * catchRate)

      // yards per catch/attempt
      if(p.pos==='QB'){
        // QB stats will be assigned after collecting team comps
      } else if(p.pos==='RB'){
        s.catches = s.rec
        const ypr = 3 + (p.overall-60)/10 + (Math.random()*3)
        s.recY = Math.round(s.rec * ypr)
      } else if(p.pos==='WR' || p.pos==='TE'){
        const ypr = 7 + (p.overall-60)/8 + (Math.random()*6 - 2)
        s.recY = Math.round(s.rec * ypr)
      } else {
        // defensive
        s.tackles = Math.round((p.overall||60)/10 * (1 + Math.random()*0.8))
        s.sacks = Math.round(Math.max(0, (p.overall-72)/22 * Math.random()))
      }
      return s
    })

    // distribute carries to RBs proportionally
    const rbs = roster.map((p, idx) => ({ p, idx })).filter(x=>x.p.pos==='RB')
    const rbTotalWeight = rbs.reduce((s,x)=> s + (x.p.overall||60), 0) || 1
    rbs.forEach(x => {
      const share = (x.p.overall||60) / rbTotalWeight
      const carries = Math.round(totalCarries * share * (0.7 + Math.random()*0.6))
      perPlayerStats[x.idx].carries = carries
      const ypc = 3 + (x.p.overall-60)/10 + (Math.random()*2)
      perPlayerStats[x.idx].rushY = Math.round(carries * ypc)
      perPlayerStats[x.idx].rushTD = Math.round(perPlayerStats[x.idx].rushY / randInt(80,260))
    })

    // QB: set attempts to passAttempts and comps based on team targets and completion rate
    if(qb){
      const qIdx = roster.findIndex(p=>p.id===qb.id)
      const att = passAttempts
      const compRate = 0.45 + ((qb.overall||60)-60)*0.006 + (Math.random()*0.06 - 0.02)
      const comp = Math.round(att * Math.min(0.9, Math.max(0.3, compRate)))
      const ypa = 6 + ((qb.overall||60)-60)/8 + (Math.random()*3 - 1)
      const passY = Math.round(comp * ypa)
      const passTD = Math.round(passY / randInt(140,260))
      const ints = Math.max(0, Math.round(randInt(0,3) - ((qb.overall||60)-60)/26))
      perPlayerStats[qIdx].att = att
      perPlayerStats[qIdx].comp = comp
      perPlayerStats[qIdx].passY = passY
      perPlayerStats[qIdx].passTD = passTD
      perPlayerStats[qIdx].int = ints
      perPlayerStats[qIdx].fantasy = passY/25 + passTD*4 - ints*2
    }

    // compute fantasy for others
    perPlayerStats.forEach(s => {
      if(s.pos === 'RB') s.fantasy = (s.rushY||0)/10 + (s.rushTD||0)*6 + (s.recY||0)/10
      if(s.pos === 'WR' || s.pos === 'TE') s.fantasy = (s.recY||0)/10 + (s.recTD||0)*6
      if(s.pos !== 'QB' && s.pos!=='RB' && s.pos!=='WR' && s.pos!=='TE') s.fantasy = (s.tackles||0) + (s.sacks||0)*4
    })

    return perPlayerStats
  }

  const homeStats = distributeTeamStats(home, hStr, aStr)
  const awayStats = distributeTeamStats(away, aStr, hStr)

  // apply stats to player season totals
  function applyStatsToRoster(team, stats){
    stats.forEach(s => {
      const pl = team.roster.find(x=>x.id===s.id)
      if(!pl) return
      pl.seasonStats = pl.seasonStats || { games:0, passY:0, passTD:0, int:0, rushY:0, rushTD:0, recY:0, recTD:0, tackles:0, sacks:0 }
      pl.seasonStats.games = (pl.seasonStats.games || 0) + 1
      pl.seasonStats.passY = (pl.seasonStats.passY || 0) + (s.passY || 0)
      pl.seasonStats.passTD = (pl.seasonStats.passTD || 0) + (s.passTD || 0)
      pl.seasonStats.int = (pl.seasonStats.int || 0) + (s.int || 0)
      pl.seasonStats.rushY = (pl.seasonStats.rushY || 0) + (s.rushY || 0)
      pl.seasonStats.rushTD = (pl.seasonStats.rushTD || 0) + (s.rushTD || 0)
      pl.seasonStats.recY = (pl.seasonStats.recY || 0) + (s.recY || 0)
      pl.seasonStats.recTD = (pl.seasonStats.recTD || 0) + (s.recTD || 0)
      pl.seasonStats.tackles = (pl.seasonStats.tackles || 0) + (s.tackles || 0)
      pl.seasonStats.sacks = (pl.seasonStats.sacks || 0) + (s.sacks || 0)
    })
  }

  applyStatsToRoster(home, homeStats)
  applyStatsToRoster(away, awayStats)

  // choose top performers by fantasy
  const top = [...homeStats, ...awayStats].sort((a,b)=> (b.fantasy||0)-(a.fantasy||0)).slice(0,3).map(s=> ({ name: s.name, pos: s.pos, fantasy: Math.round(s.fantasy||0) }))

  return { home: home.name, away: away.name, score: [hScore,aScore], topPlayers: top, stats: { home: homeStats, away: awayStats } }
}

export function simulateWeek(league) {
  // For simplicity, user team plays one opponent; other teams have randomized results
  const nextLeague = JSON.parse(JSON.stringify(league))
  const { teams, userTeam, settings } = nextLeague
  // advance existing injuries (healing week-by-week)
  advanceInjuries(nextLeague)
  // if season is over, don't simulate further
  const seasonLength = (nextLeague.settings && nextLeague.settings.seasonLength) || 10
  if(nextLeague.week > seasonLength) return { league: nextLeague, summary: null }
  // pick an opponent the user hasn't played yet if possible
  userTeam.playedOpponents = userTeam.playedOpponents || []
  let candidates = teams.filter(t=>t.name !== userTeam.name && !userTeam.playedOpponents.includes(t.name))
  if(candidates.length === 0){ userTeam.playedOpponents = []; candidates = teams.filter(t=>t.name !== userTeam.name) }
  const opp = sample(candidates)
  const game = simulateGame(userTeam, opp, settings.difficulty)
  // apply results
  const [hs, as] = game.score
  const userWon = hs > as
  userTeam.record = userTeam.record || {w:0,l:0}
  opp.record = opp.record || {w:0,l:0}
  if(userWon){ userTeam.record.w +=1; opp.record.l +=1 } else { userTeam.record.l +=1; opp.record.w +=1 }
  userTeam.pointsFor += hs; userTeam.pointsAgainst += as
  opp.pointsFor += as; opp.pointsAgainst += hs
  // mark played opponent for scheduling variety
  userTeam.playedOpponents = userTeam.playedOpponents || []
  if(!userTeam.playedOpponents.includes(opp.name)) userTeam.playedOpponents.push(opp.name)

  // simulate other matchups roughly
  teams.filter(t=> t.name !== userTeam.name && t.name !== opp.name).forEach(t=>{
    const other = sample(teams.filter(x=>x.name!==t.name))
    if(other.name === userTeam.name) return
    const s1 = teamStrength(t)+randInt(-8,8)
    const s2 = teamStrength(other)+randInt(-8,8)
    const sc1 = Math.round((s1/10)+randInt(7,28)-settings.difficulty)
    const sc2 = Math.round((s2/10)+randInt(7,28)-settings.difficulty)
    if(sc1>sc2){ t.record.w+=1; other.record.l+=1 } else { t.record.l+=1; other.record.w+=1 }
    t.pointsFor += sc1; t.pointsAgainst += sc2
    other.pointsFor += sc2; other.pointsAgainst += sc1
  })

  nextLeague.week = (nextLeague.week || 1) + 1
  // persist recent boxscores
  nextLeague.recentBoxscores = nextLeague.recentBoxscores || []
  nextLeague.recentBoxscores.unshift({ id: uid('bs_'), week: nextLeague.week, game, stats: game.stats, season: nextLeague.season })
  nextLeague.recentBoxscores = nextLeague.recentBoxscores.slice(0,12)
  // persist full past games for head-to-head and SoS calculations
  nextLeague.pastGames = nextLeague.pastGames || []
  nextLeague.pastGames.push({ id: uid('pg_'), week: nextLeague.week, home: game.home, away: game.away, score: game.score, season: nextLeague.season })
  // apply random injuries after games
  const trainingRisk = (nextLeague.settings && nextLeague.settings.trainingRisk) || 1
  const injuredHome = maybeRandomInjuriesForTeam(userTeam, settings.difficulty, trainingRisk)
  const injuredAway = maybeRandomInjuriesForTeam(opp, settings.difficulty, trainingRisk)
  injuredHome.concat(injuredAway).forEach(x => addNotification(nextLeague, `${x.player.name} suffered a ${x.severity} injury (${x.player.injury.weeks}w)`))

  saveLeague(nextLeague)
  const summary = { game, week: nextLeague.week, stats: game.stats }
  return { league: nextLeague, summary }
}

export function updateRoster(team, roster) {
  team.roster = roster
  return team
}

export function signFreeAgent(league, player) {
  const cost = (player.contract && player.contract.salary) || 0
  league.userTeam.balance = league.userTeam.balance || 0
  if(cost > league.userTeam.balance){
    addNotification(league, `Unable to sign ${player.name}. Insufficient funds ($${(league.userTeam.balance||0).toLocaleString()})`)
    saveLeague(league)
    return league
  }
  // remove from free agents only after confirming funds
  league.freeAgents = league.freeAgents.filter(p=>p.id !== player.id)
  league.userTeam.balance -= cost
  player.teamColor = league.userTeam.color
  league.userTeam.roster.push(player)
  addNotification(league, `${player.name} signed for $${cost.toLocaleString()}. New balance: $${(league.userTeam.balance||0).toLocaleString()}`)
  saveLeague(league)
  return league
}

export function signDraftPick(league, player) {
  // cheaper signing bonus for rookies
  const cost = Math.round(((player.contract && player.contract.salary) || 2000) * 0.5)
  league.prospects = (league.prospects || []).filter(p=>p.id !== player.id)
  league.userTeam.balance = league.userTeam.balance || 0
  if(cost > league.userTeam.balance){
    addNotification(league, `Unable to sign draft pick ${player.name}. Insufficient funds ($${(league.userTeam.balance||0).toLocaleString()})`)
    saveLeague(league)
    return league
  }
  league.userTeam.balance -= cost
  player.teamColor = league.userTeam.color
  league.userTeam.roster.push(player)
  addNotification(league, `${player.name} (draft) signed for $${cost.toLocaleString()}. New balance: $${(league.userTeam.balance||0).toLocaleString()}`)
  saveLeague(league)
  return league
}

export function proposeContract(league, playerId, years, salary, signingBonus = null, guaranteed = null){
  // propose/accept a contract with signing bonus and guarantees
  const p = getPlayerById(league, playerId)
  if(!p) return { success:false, reason: 'Player not found' }
  signingBonus = signingBonus == null ? Math.round(salary * 0.5) : Number(signingBonus)
  guaranteed = guaranteed == null ? signingBonus : Number(guaranteed)

  league.userTeam.balance = league.userTeam.balance || 0
  if(signingBonus > league.userTeam.balance){
    addNotification(league, `Unable to sign ${p.name}. Insufficient funds for signing bonus ($${(league.userTeam.balance||0).toLocaleString()})`)
    saveLeague(league)
    return { success:false, reason: 'Insufficient funds' }
  }

  league.userTeam.balance -= signingBonus
  // find player reference in roster to update
  const pl = (league.userTeam.roster||[]).find(x=>x.id===playerId)
  const startSeason = league.season || 1
  if(pl){ pl.contract = { years: Number(years), salary: Number(salary), signingBonus: signingBonus, guaranteed: guaranteed, startSeason } }
  addNotification(league, `${p.name} signed ${years}y @ $${Number(salary).toLocaleString()} (bonus $${signingBonus.toLocaleString()}, guaranteed $${guaranteed.toLocaleString()}). New balance: $${(league.userTeam.balance||0).toLocaleString()}`)
  saveLeague(league)
  return { success:true }
}

export function calculateDeadMoney(league, playerId, season = league.season || 1){
  const pl = getPlayerById(league, playerId)
  if(!pl || !pl.contract) return 0
  const c = pl.contract
  const yearsElapsed = Math.max(0, (season - (c.startSeason || season)))
  const remainingYears = Math.max(0, c.years - yearsElapsed)
  if(!c.signingBonus || c.signingBonus === 0) return 0
  const amort = c.signingBonus / c.years
  const dead = Math.round(amort * remainingYears)
  return dead
}

export function releasePlayer(league, playerId){
  // remove from roster, apply dead money to league.deadMoney
  league.deadMoney = league.deadMoney || 0
  const dead = calculateDeadMoney(league, playerId, league.season || 1)
  league.deadMoney += dead
  // remove player from user's roster if present
  league.userTeam = league.userTeam || {}
  league.userTeam.roster = league.userTeam.roster || []
  league.userTeam.roster = league.userTeam.roster.filter(p => p.id !== playerId)
  addNotification(league, `Released player; $${dead.toLocaleString()} dead money added.`)
  saveLeague(league)
  return { league, dead }
}

export function restructureContract(league, playerId, newSalary, convertToBonus = 0){
  // convert up to convertToBonus of future salary into signing bonus spread across remaining years
  const pl = (league.userTeam && league.userTeam.roster||[]).find(p=>p.id===playerId)
  if(!pl || !pl.contract) return { success:false, reason: 'Player not found' }
  const c = pl.contract
  const remainingYears = c.years - Math.max(0, (league.season || 1) - (c.startSeason || league.season || 1))
  if(remainingYears <= 0) return { success:false, reason: 'No remaining years' }
  const bonus = Math.min(convertToBonus, newSalary)
  // increase signing bonus and adjust salary
  c.signingBonus = (c.signingBonus || 0) + bonus
  c.salary = Number(newSalary)
  // no immediate cash change, but increases future cap amortization
  addNotification(league, `${pl.name} contract restructured: new salary $${Number(newSalary).toLocaleString()}, bonus $${bonus.toLocaleString()}`)
  saveLeague(league)
  return { success:true }
}

export function getCapProjection(league, seasons = 3){
  const out = []
  const baseSeason = league.season || 1
  for(let s=0;s<seasons;s++){
    const seasonYear = baseSeason + s
    let payroll = 0
    // include roster salaries
    const allPlayers = []
    ;(league.teams||[]).forEach(t=> t.roster.forEach(p=> allPlayers.push(p)))
    league.userTeam && league.userTeam.roster && league.userTeam.roster.forEach(p=> allPlayers.push(p))
    allPlayers.forEach(p=>{
      const c = p.contract || {}
      payroll += (c.salary || 0)
      // amortization of signing bonus for this season
      if(c.signingBonus && c.years){
        const yearsElapsed = Math.max(0, (seasonYear - (c.startSeason || seasonYear)))
        if(yearsElapsed < c.years){
          payroll += Math.round((c.signingBonus || 0) / c.years)
        }
      }
    })
    // add standing dead money for this season
    if(s===0) payroll += (league.deadMoney || 0)
    out.push({ season: seasonYear, payroll })
  }
  return out
}

export function agePlayersByOneSeason(league){
  ;(league.teams||[]).forEach(t=> t.roster.forEach(p => { p.age = (p.age || 20) + 1; if(p.age > 30) p.overall = Math.max(40, p.overall - randInt(0,3)) }))
  league.userTeam && league.userTeam.roster && league.userTeam.roster.forEach(p => { p.age = (p.age || 20) + 1; if(p.age > 30) p.overall = Math.max(40, p.overall - randInt(0,3)) })
  saveLeague(league)
  return league
}

export function advanceSeason(league){
  league.season = (league.season || 1) + 1
  league.week = 1
  agePlayersByOneSeason(league)
  // small chance of retirements (if age>38 and low overall)
  ;(league.teams||[]).forEach(t=> t.roster = t.roster.filter(p => !(p.age>38 && p.overall<55) ))
  if(league.userTeam && league.userTeam.roster) league.userTeam.roster = league.userTeam.roster.filter(p => !(p.age>38 && p.overall<55))
  addNotification(league, `Season advanced to ${league.season}. Players aged and retirements processed.`)
  saveLeague(league)
  return league
}

export function setInjuryWeeks(league, playerId, weeks){
  // find the player reference inside teams, userTeam, freeAgents or prospects
  const teamRosters = (league.teams||[]).map(t=> t.roster || [])
  const lists = [ ...teamRosters, league.userTeam?.roster || [], league.freeAgents || [], league.prospects || [] ]
  let pl = null
  for(const lst of lists){
    if(!Array.isArray(lst)) continue
    const found = lst.find(p=>p.id === playerId)
    if(found){ pl = found; break }
  }
  if(!pl) return league
  // set injury weeks; if 0 => clear injury
  if(weeks <= 0){
    pl.injury = null
    addNotification(league, `${pl.name} has been marked recovered.`)
  } else {
    pl.injury = pl.injury || { type: 'unknown', weeks:0 }
    pl.injury.weeks = Number(weeks)
    addNotification(league, `${pl.name} injury updated: ${pl.injury.weeks}w`)
  }
  saveLeague(league)
  return league
}

export function clearInjury(league, playerId){
  return setInjuryWeeks(league, playerId, 0)
}

export function tradePlayers(league, teamAName, playerAId, teamBName, playerBId) {
  const tA = league.teams.find(t=>t.name===teamAName)
  const tB = league.teams.find(t=>t.name===teamBName)
  if(!tA||!tB) return league
  const pAIdx = tA.roster.findIndex(p=>p.id===playerAId)
  const pBIdx = tB.roster.findIndex(p=>p.id===playerBId)
  if(pAIdx<0 || pBIdx<0) return league
  const pA = tA.roster.splice(pAIdx,1)[0]
  const pB = tB.roster.splice(pBIdx,1)[0]
  tA.roster.push(pB); tB.roster.push(pA)
  league.tradeHistory = league.tradeHistory || []
  league.tradeHistory.unshift({ id: uid('tr_'), time: Date.now(), teamA: tA.name, teamB: tB.name, gave: pA, received: pB })
  addNotification(league, `${tA.name} and ${tB.name} completed trade: ${pA.name} ↔ ${pB.name}`)
  saveLeague(league)
  return league
}

export function playerValueForTeam(league, team, p){
  // compute a numeric valuation of player `p` for `team` (higher is better)
  if(!p) return 0
  const base = (p.overall || p.scoutGrade || 60) * 10
  // youth premium: younger players add future value, but not absurdly
  const age = p.age || 24
  const youthBonus = Math.max(0, 28 - age) * 6
  // positional need bonus: fewer players at pos => higher value
  function countAtPos(team, pos){ return (team.roster||[]).filter(x=> x.pos === pos).length }
  const needBonus = Math.max(0, 2 - countAtPos(team, p.pos)) * 110
  // durability penalty for injury-prone players
  const durability = p.hiddenTraits && p.hiddenTraits.injuryProne ? -60 : 0
  // cost effect: prefer players whose expected annual cost is reasonable
  const c = p.contract || {}
  const annualCost = (c.salary || 0) + ((c.signingBonus && c.years) ? Math.round((c.signingBonus || 0) / Math.max(1, c.years)) : 0)
  const costPenalty = Math.round(Math.min(400, annualCost / 30)) // scaled small penalty
  const value = base + youthBonus + needBonus + durability - costPenalty
  return Math.round(value)
}

export function evaluateTrade(league, offeringTeamName, receivingTeamName, offeringPlayerId, receivingPlayerId) {
  const offeringTeam = league.teams.find(t=>t.name===offeringTeamName) || (league.userTeam.name===offeringTeamName?league.userTeam:null)
  const receivingTeam = league.teams.find(t=>t.name===receivingTeamName) || (league.userTeam.name===receivingTeamName?league.userTeam:null)
  if(!offeringTeam || !receivingTeam) return { accepted:false, reason: 'Team not found' }
  const pOff = (offeringTeam.roster||[]).find(p=>p.id===offeringPlayerId)
  const pRec = (receivingTeam.roster||[]).find(p=>p.id===receivingPlayerId)
  if(!pOff || !pRec) return { accepted:false, reason: 'Player not found' }

  // compute value from each team's perspective using playerValueForTeam (includes positional need & cost)
  const valOff = playerValueForTeam(league, receivingTeam, pOff) // value of incoming player to receiving team
  const valRec = playerValueForTeam(league, offeringTeam, pRec) // value of incoming player to offering team

  function countAtPos(team, pos){
    return (team.roster||[]).filter(p=>p.pos===pos).length
  }

  const needBonusForReceiving = Math.max(0, 2 - countAtPos(receivingTeam, pOff.pos)) * 140
  const needBonusForOffering = Math.max(0, 2 - countAtPos(offeringTeam, pRec.pos)) * 140

  // persona-driven preferences
  const persona = receivingTeam.persona || { style: 'balanced', aggressiveness: 0.5 }
  let personaBonus = 0
  if(persona.style === 'rebuild'){
    personaBonus += ((30 - (pOff.age || 25)) - (30 - (pRec.age || 25))) * 6
  } else if(persona.style === 'win-now'){
    personaBonus += ((pOff.age || 25) - (pRec.age || 25)) * 4
  }

  const receivingNet = valOff + needBonusForReceiving - valRec + personaBonus

  const difficulty = (league.settings && league.settings.difficulty) || 1
  const tolerance = 180 * (1 + difficulty * 0.45) * (1 + (persona.aggressiveness - 0.5) * 0.6)

  const accepted = receivingNet >= -tolerance
  const diff = receivingNet
  const reason = accepted ? `Accepted (net ${Math.round(diff)})` : `Declined (would lose ${Math.round(-diff)} value)`
  return { accepted, diff, valOff, valRec, needBonusForReceiving, needBonusForOffering, personaBonus, persona: persona.style, reason }
}

export function proposeTrade(league, offeringTeamName, receivingTeamName, offeringPlayerId, receivingPlayerId){
  const decision = evaluateTrade(league, offeringTeamName, receivingTeamName, offeringPlayerId, receivingPlayerId)
  if(decision.accepted){
    const newLeague = tradePlayers(league, offeringTeamName, offeringPlayerId, receivingTeamName, receivingPlayerId)
    // record who proposed and result
    newLeague.tradeHistory[0].proposedBy = offeringTeamName
    addNotification(newLeague, `${offeringTeamName} proposed trade accepted by ${receivingTeamName}`)
    return { league: newLeague, decision }
  }
  addNotification(league, `${offeringTeamName} proposed trade to ${receivingTeamName} — declined`)
  return { league, decision }
}

export function generatePlayoffBracket(league){
  const size = (league.settings && league.settings.playoffSize) || 4
  const byConf = (league.settings && league.settings.playoffByConference)
  const allTeams = [ ...(league.teams||[]), league.userTeam ].filter(Boolean)

  function sortTeams(arr){
    return arr.slice().sort((a,b)=>{
      const aw = (a.record && a.record.w) || 0
      const bw = (b.record && b.record.w) || 0
      if(bw !== aw) return bw - aw

      // tie-breaker 1: head-to-head (wins between the two teams this season)
      const hhA = headToHeadWins(league, a.name, b.name)
      const hhB = headToHeadWins(league, b.name, a.name)
      if(hhA !== hhB) return hhB - hhA

      // tie-breaker 2: divisional record (if same division)
      if(a.division && b.division && a.division === b.division){
        const divA = divisionRecord(league, a.name, a.division)
        const divB = divisionRecord(league, b.name, b.division)
        if(divB.w !== divA.w) return divB.w - divA.w
      }

      // tie-breaker 3: strength of schedule (avg opponent win % lower -> worse)
      const sosA = strengthOfSchedule(league, a.name)
      const sosB = strengthOfSchedule(league, b.name)
      if(sosB !== sosA) return sosB - sosA

      // tie-breaker 4: point differential
      const apd = (a.pointsFor || 0) - (a.pointsAgainst || 0)
      const bpd = (b.pointsFor || 0) - (b.pointsAgainst || 0)
      if(bpd !== apd) return bpd - apd

      return (b.name || '').localeCompare(a.name || '')
    })
  }

  let seeds = []
  if(byConf){
    // produce seeds per conference with division winners prioritized
    const confs = [...new Set(allTeams.map(t=>t.conference))]
    const perConf = Math.max(1, Math.floor(size / confs.length))
    confs.forEach(c => {
      const confTeams = allTeams.filter(t=>t.conference===c)
      // find division winners
      const divisions = [...new Set(confTeams.map(t=>t.division))]
      const divWinners = divisions.map(d=>{
        const members = confTeams.filter(t=>t.division===d)
        return sortTeams(members)[0]
      }).filter(Boolean)
      // sort division winners by record
      const sortedDivWinners = sortTeams(divWinners)
      seeds = seeds.concat(sortedDivWinners.slice(0, perConf))
      // fill remaining spots for this conference with next-best teams (excluding division winners)
      if(seeds.length < size){
        const remaining = sortTeams(confTeams).filter(t=> !sortedDivWinners.find(s=>s.name===t.name))
        seeds = seeds.concat(remaining.slice(0, Math.max(0, perConf - sortedDivWinners.length)))
      }
    })
    // if not enough overall seeds, pad with next-best overall
    if(seeds.length < size){
      const remaining = sortTeams(allTeams).filter(t=> !seeds.find(s=>s.name===t.name))
      seeds = seeds.concat(remaining.slice(0, size - seeds.length))
    }
  } else {
    seeds = sortTeams(allTeams).slice(0, size)
  }

  // ensure unique and trimmed
  seeds = seeds.slice(0, size)

  // create bracket for single-elim: seed1 vs seedN, 2 vs N-1, etc.
  const matchups = []
  for(let i=0;i<Math.floor(seeds.length/2);i++){
    const home = seeds[i]
    const away = seeds[seeds.length - 1 - i]
    matchups.push({ home: home.name, away: away.name, seedHome: i+1, seedAway: seeds.length - i })
  }
  return { size: seeds.length, matchups, seeds: seeds.map(s=>s.name) }
}

// Helper: count head-to-head wins for teamA against teamB across this season's pastGames
export function headToHeadWins(league, teamAName, teamBName){
  const games = (league.pastGames || []).filter(g => g.season === league.season && ((g.home === teamAName && g.away === teamBName) || (g.home === teamBName && g.away === teamAName)))
  let wins = 0
  games.forEach(g => {
    if(g.home === teamAName && g.score[0] > g.score[1]) wins++
    if(g.away === teamAName && g.score[1] > g.score[0]) wins++
  })
  return wins
}

// Helper: division record (w/l) for team within its division this season
export function divisionRecord(league, teamName, division){
  const teamsInDiv = (league.teams || []).filter(t=> t.division === division || (league.userTeam && league.userTeam.division === division))
  const games = (league.pastGames || []).filter(g => g.season === league.season && ((g.home === teamName && teamsInDiv.find(t=>t.name===g.away)) || (g.away === teamName && teamsInDiv.find(t=>t.name===g.home))))
  let w=0,l=0
  games.forEach(g=>{
    if(g.home === teamName){ if(g.score[0] > g.score[1]) w++ ; else l++ }
    if(g.away === teamName){ if(g.score[1] > g.score[0]) w++ ; else l++ }
  })
  return { w, l }
}

// Helper: approximate strength of schedule based on opponents' current win percentage
export function strengthOfSchedule(league, teamName){
  const games = (league.pastGames || []).filter(g => g.season === league.season && (g.home === teamName || g.away === teamName))
  const oppNames = games.map(g => g.home === teamName ? g.away : g.home)
  if(oppNames.length === 0) return 0
  const oppRecords = oppNames.map(name => { const t = (league.teams||[]).find(x=>x.name===name) || (league.userTeam && league.userTeam.name === name ? league.userTeam : null); const w = (t && t.record && t.record.w) || 0; const gplayed = ((t && t.record && (t.record.w + t.record.l)) || 1); return (w / gplayed) })
  const avg = oppRecords.reduce((s,v)=>s+v,0)/oppRecords.length
  return Math.round(avg*100)/100
}

export function runPlayoffs(league){
  const bracket = generatePlayoffBracket(league)
  if(!bracket || bracket.size < 2) return { success:false, reason: 'Not enough teams' }
  const seriesLen = (league.settings && league.settings.playoffSeriesLength) || 1

  // simulate rounds
  let currentMatchups = bracket.matchups
  while(currentMatchups.length >= 1){
    const winners = []
    for(const m of currentMatchups){
      let winsA = 0, winsB = 0
      // best-of series
      while(winsA < Math.ceil(seriesLen/2) && winsB < Math.ceil(seriesLen/2)){
        const tA = (league.teams||[]).find(t=>t.name===m.home) || (league.userTeam && league.userTeam.name === m.home ? league.userTeam : null)
        const tB = (league.teams||[]).find(t=>t.name===m.away) || (league.userTeam && league.userTeam.name === m.away ? league.userTeam : null)
        const g = simulateGame(tA, tB, league.settings.difficulty)
        if(g.score[0] > g.score[1]) winsA++
        else winsB++
      }
      const winner = winsA > winsB ? m.home : m.away
      winners.push(winner)
    }
    // create next round matchups
    const next = []
    for(let i=0;i<Math.floor(winners.length/2);i++){
      next.push({ home: winners[i], away: winners[winners.length - 1 - i] })
    }
    if(next.length === 0){
      // final winner
      const champName = winners[0]
      const champTeam = (league.teams||[]).find(t=>t.name===champName) || (league.userTeam && league.userTeam.name === champName ? league.userTeam : null)
      league.history = league.history || []
      league.history.unshift({ season: league.season, champion: champName })
      addNotification(league, `${champName} won the championship for season ${league.season}!`)
      saveLeague(league)
      return { success:true, champion: champName }
    }
    currentMatchups = next
  }
  return { success:false, reason: 'Playoff simulation error' }
}

export function teamPayroll(league, team){
  // simple payroll: sum salary + amortized signing bonus for current season
  if(!team || !Array.isArray(team.roster)) return 0
  const seasonYear = league.season || 1
  let payroll = 0
  (team.roster || []).forEach(p=>{
    const c = p.contract || {}
    payroll += (c.salary || 0)
    if(c.signingBonus && c.years){
      const yearsElapsed = Math.max(0, (seasonYear - (c.startSeason || seasonYear)))
      if(yearsElapsed < c.years) payroll += Math.round((c.signingBonus || 0) / c.years)
    }
  })
  return payroll
}

export function canAffordSigning(league, team, cost){
  const capEnabled = league.settings && league.settings.salaryCap
  const capAmount = (league.settings && league.settings.salaryCapAmount) || 100000
  const payroll = teamPayroll(league, team)
  if(team.balance == null) team.balance = 0
  if(cost > team.balance) return false
  if(!capEnabled) return true
  // if signing would push over cap, allow if team's persona aggressiveness > 0.7 (willing to gamble)
  if((payroll + cost) <= capAmount) return true
  const persona = team.persona || { aggressiveness: 0.5 }
  return persona.aggressiveness > 0.7
}

export function autoSignFreeAgents(league){
  league.freeAgents = league.freeAgents || []
  ;(league.teams || []).forEach(team => {
    if(league.userTeam && team.name === league.userTeam.name) return
    const persona = team.persona || { style: 'balanced', aggressiveness: 0.5 }
    // compute a threshold: lower for aggressive teams
    const baseThreshold = 0.12
    const threshold = baseThreshold * (1 - (persona.aggressiveness - 0.4) * 0.6)

    // sort free agents by expected value-to-cost ratio for this team
    const scored = league.freeAgents.map(fa => {
      const val = playerValueForTeam(league, team, fa)
      const annualCost = (fa.contract && fa.contract.salary) || 4000
      const score = annualCost > 0 ? (val / annualCost) : val
      return { fa, val, annualCost, score }
    }).sort((a,b)=> b.score - a.score)

    if(scored.length === 0) return
    const best = scored[0]
    if(best.score >= threshold && canAffordSigning(league, team, best.annualCost)){
      // sign
      league.freeAgents = league.freeAgents.filter(p=> p.id !== best.fa.id)
      team.roster.push({ ...best.fa, teamColor: team.color })
      team.balance = (team.balance || 0) - best.annualCost
      addNotification(league, `${team.name} (AI) signed ${best.fa.name} for $${(best.annualCost||0).toLocaleString()} (value ${best.val})`)
    }
  })
  saveLeague(league)
  return league
}

export function autoProposeTrades(league, attempts = 3){
  const teams = league.teams || []
  for(let i=0;i<attempts;i++){
    const a = sample(teams)
    let b = sample(teams)
    if(!a || !b || a.name === b.name) continue
    // target a valuable player on b
    const target = (b.roster || []).slice().sort((x,y)=> (y.overall||60)-(x.overall||60))[0]
    if(!target) continue
    // choose candidate offering players from a: try low-end first, then mid-range if low-end declined
    const offeringCandidates = (a.roster || []).slice().sort((x,y)=> (x.overall||60)-(y.overall||60))
    let traded = false
    for(let j=0;j<Math.min(3, offeringCandidates.length); j++){
      const offer = offeringCandidates[j]
      // if persona is very aggressive, they may offer a mid-tier player to pry loose stars
      if(a.persona && a.persona.aggressiveness > 0.7 && offeringCandidates.length > 2 && j === 0){
        // select a slightly better offering player
        const mid = offeringCandidates[Math.min(offeringCandidates.length-1, 1)]
        if(mid) {
          const evalResMid = evaluateTrade(league, a.name, b.name, mid.id, target.id)
          if(evalResMid.accepted){ tradePlayers(league, a.name, mid.id, b.name, target.id); traded = true; break }
        }
      }

      const evalRes = evaluateTrade(league, a.name, b.name, offer.id, target.id)
      if(evalRes.accepted){
        tradePlayers(league, a.name, offer.id, b.name, target.id)
        traded = true
        break
      }
    }
    if(!traded){
      // attempt reverse: maybe b will be willing to give a bench piece for a good player
      const target2 = (a.roster || []).slice().sort((x,y)=> (y.overall||60)-(x.overall||60))[0]
      const offeringCandidatesB = (b.roster || []).slice().sort((x,y)=> (x.overall||60)-(y.overall||60))
      for(let j=0;j<Math.min(2, offeringCandidatesB.length); j++){
        const offerB = offeringCandidatesB[j]
        const evalResB = evaluateTrade(league, b.name, a.name, offerB.id, target2.id)
        if(evalResB.accepted){
          tradePlayers(league, b.name, offerB.id, a.name, target2.id)
          break
        }
      }
    }
  }
  saveLeague(league)
  return league
}

export function advancePhase(league){
  console.log('advancePhase called. current phase=', league.phase)
  league.phase = league.phase || 'offseason'
  const order = ['offseason','draft','free_agency','roster_management','regular_season','playoffs']
  const idx = order.indexOf(league.phase)
  const next = order[(idx + 1) % order.length]
  console.log('advancePhase: idx=', idx, 'next=', next)
  if(league.phase === 'offseason' && next === 'draft'){
    // enter draft: ensure prospects and create draft board
    ensureFreeAgents(league)
    startDraft(league, league.draft?.rounds || 3)
    setPhase(league, 'draft')
    return league
  }

  if(league.phase === 'draft' && next === 'free_agency'){
    // finalize draft (leave board state) and generate free agents pool
    ensureFreeAgents(league)
    setPhase(league, 'free_agency')
    return league
  }

  if(league.phase === 'free_agency' && next === 'roster_management'){
    // allow roster moves; pick up remaining FAs for AI teams automatically
    ;(league.teams||[]).forEach(t=> ensureFreeAgents(league, 2))
    // perform AI offseason behavior: auto-sign FAs and propose simple trades
    autoSignFreeAgents(league)
    autoProposeTrades(league, 4)
    setPhase(league, 'roster_management')
    return league
  }

  if(league.phase === 'roster_management' && next === 'regular_season'){
    // reset week and records
    league.week = 1
    ;(league.teams||[]).forEach(t=> t.record = { w:0,l:0 })
    if(league.userTeam) league.userTeam.record = { w:0,l:0 }
    setPhase(league, 'regular_season')
    return league
  }

  if(league.phase === 'regular_season' && next === 'playoffs'){
    // simulate remaining weeks to complete season
    const seasonLength = (league.settings && league.settings.seasonLength) || 10
    console.log('advancePhase: simulating regular season up to', seasonLength, 'starting at week', league.week)
    let safety = 0
    while(league.week <= seasonLength && safety < 100){
      const res = simulateWeek(league)
      if(!res || !res.league) break
      league = res.league
      console.log('advancePhase: simulated week ->', league.week)
      safety++
    }
    setPhase(league, 'playoffs')
    return league
  }

  if(league.phase === 'playoffs' && next === 'offseason'){
    // run playoffs, record champion, then advance season (aging etc.)
    runPlayoffs(league)
    advanceSeason(league)
    setPhase(league, 'offseason')
    return league
  }

  // fallback to cycling phase
  setPhase(league, next)
  return league
}
