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
  return { id: uid('p_'), name: n, pos, overall, age, contract: { years: 2, salary: salaryOverride || randInt(4000,12000) }, starter: false, injury: null, teamColor, seasonStats: { games:0, passY:0, passTD:0, int:0, rushY:0, rushTD:0, recY:0, recTD:0, tackles:0, sacks:0 } }
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
  const userTeam = { ...teams[0], balance: 100000 }
  // ensure every player's teamColor set
  teams.forEach(t => t.roster.forEach(p => p.teamColor = t.color))
  userTeam.roster.forEach(p=> p.teamColor = userTeam.color)

  const freeAgents = Array.from({length:Math.max(8, Math.round(numTeams*1.2))}).map((_,i)=> makePlayer(null, sample(['QB','RB','WR','TE']), randInt(55,78), randInt(21,33)))
  const prospects = Array.from({length:Math.max(10, Math.round(numTeams*1.5))}).map((_,i)=> makePlayer(null, sample(['QB','RB','WR','TE']), randInt(60,85), randInt(19,22)))
  return { teams, userTeam, freeAgents, prospects, leagueName, settings: { difficulty: 1, seasonLength, salaryCap: false, trainingRisk: 1, setupComplete: false }, week: 1, tradeHistory: [], notifications: [] }
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

export function generateProspects(count = 4) {
  return Array.from({length:count}).map((_,i)=> ({ id: uid('pr_'), name: `Rookie ${uid('')}`, pos: sample(['QB','RB','WR','TE']), overall: randInt(60,88), age: randInt(19,22) }))
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
  nextLeague.recentBoxscores.unshift({ id: uid('bs_'), week: nextLeague.week, game, stats: game.stats })
  nextLeague.recentBoxscores = nextLeague.recentBoxscores.slice(0,12)
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

export function proposeContract(league, playerId, years, salary){
  // propose/accept a simple contract: set years and salary and adjust balance by a one-time signing bonus (1yr salary portion)
  const p = getPlayerById(league, playerId)
  if(!p) return { success:false, reason: 'Player not found' }
  const signingBonus = Math.round(salary * 0.5) // 50% of annual as signing cost
  league.userTeam.balance = league.userTeam.balance || 0
  if(signingBonus > league.userTeam.balance){
    addNotification(league, `Unable to sign ${p.name}. Insufficient funds for signing bonus ($${(league.userTeam.balance||0).toLocaleString()})`)
    saveLeague(league)
    return { success:false, reason: 'Insufficient funds' }
  }
  league.userTeam.balance -= signingBonus
  // find player reference in roster to update
  const pl = (league.userTeam.roster||[]).find(x=>x.id===playerId)
  if(pl){ pl.contract = { years: Number(years), salary: Number(salary) } }
  addNotification(league, `${p.name} signed ${years}y @ $${Number(salary).toLocaleString()} (bonus $${signingBonus.toLocaleString()}). New balance: $${(league.userTeam.balance||0).toLocaleString()}`)
  saveLeague(league)
  return { success:true }
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

export function evaluateTrade(league, offeringTeamName, receivingTeamName, offeringPlayerId, receivingPlayerId) {
  const offeringTeam = league.teams.find(t=>t.name===offeringTeamName) || (league.userTeam.name===offeringTeamName?league.userTeam:null)
  const receivingTeam = league.teams.find(t=>t.name===receivingTeamName) || (league.userTeam.name===receivingTeamName?league.userTeam:null)
  if(!offeringTeam || !receivingTeam) return { accepted:false, reason: 'Team not found' }
  const pOff = (offeringTeam.roster||[]).find(p=>p.id===offeringPlayerId)
  const pRec = (receivingTeam.roster||[]).find(p=>p.id===receivingPlayerId)
  if(!pOff || !pRec) return { accepted:false, reason: 'Player not found' }

  // simple value function: base on overall and youth premium
  function value(p){
    const ageFactor = Math.max(0, 30 - (p.age || 25))
    return (p.overall || 60) * 10 + ageFactor * 5
  }

  // positional need: teams value players more if they fill a weak position
  function countAtPos(team, pos){
    return (team.roster||[]).filter(p=>p.pos===pos).length
  }

  const valOff = value(pOff)
  const valRec = value(pRec)

  const needBonusForReceiving = Math.max(0, 2 - countAtPos(receivingTeam, pOff.pos)) * 140
  const needBonusForOffering = Math.max(0, 2 - countAtPos(offeringTeam, pRec.pos)) * 140

  // From receiving team's perspective: they receive pOff and give away pRec
  const receivingNet = valOff + needBonusForReceiving - valRec

  const difficulty = (league.settings && league.settings.difficulty) || 1
  const tolerance = 180 * (1 + difficulty * 0.45) // higher difficulty => less tolerant

  const accepted = receivingNet >= -tolerance
  const diff = receivingNet
  const reason = accepted ? `Accepted (net ${Math.round(diff)})` : `Declined (would lose ${Math.round(-diff)} value)`
  return { accepted, diff, valOff, valRec, needBonusForReceiving, needBonusForOffering, reason }
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
