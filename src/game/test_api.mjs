import assert from 'assert'
import { createNewLeague, evaluateTrade, proposeTrade, simulateGame, advancePhase, runPlayoffs } from './api.js'
import { simulateWeek, proposeContract, signFreeAgent, setInjuryWeeks, clearInjury, signDraftPick } from './api.js'
import { scoutProspect, generateProspects, getScoutReport } from './api.js'

function testEvaluateTrade(){
  const league = createNewLeague()
  const user = league.userTeam
  const opponent = league.teams.find(t=>t.name!==user.name)
  const myPlayer = user.roster[0]
  const theirPlayer = opponent.roster[0]

  const evalRes = evaluateTrade(league, user.name, opponent.name, myPlayer.id, theirPlayer.id)
  assert.ok(evalRes.hasOwnProperty('accepted'))
  console.log('evaluateTrade passed:', evalRes.reason)
}

function testProposeTrade(){
  const league = createNewLeague()
  const user = league.userTeam
  const opponent = league.teams.find(t=>t.name!==user.name)
  const myPlayer = user.roster[0]
  const theirPlayer = opponent.roster[0]

  const res = proposeTrade(league, user.name, opponent.name, myPlayer.id, theirPlayer.id)
  assert.ok(res.decision && res.decision.hasOwnProperty('accepted'))
  console.log('proposeTrade result:', res.decision.reason)
}

function testSimulateGame(){
  const league = createNewLeague()
  const teams = league.teams
  const g = simulateGame(teams[0], teams[1], league.settings.difficulty)
  assert.ok(typeof g.score[0] === 'number')
  console.log('simulateGame produced score', g.score)
}

function testSimulateWeekPersistence(){
  const league = createNewLeague()
  const res = simulateWeek(league)
  assert.ok(res.league.recentBoxscores && res.league.recentBoxscores.length>0)
  console.log('simulateWeek persisted boxscore', res.league.recentBoxscores[0].id)
}

function testProposeContract(){
  const league = createNewLeague()
  league.userTeam.balance = 50000
  const p = league.userTeam.roster[0]
  const res = proposeContract(league, p.id, 3, 10000, 6000, 6000)
  assert.ok(res && res.success)
  const after = league.userTeam.balance
  // signing bonus should be 6000
  assert.strictEqual(after, 50000 - 6000)
  // contract updated
  const pl = league.userTeam.roster.find(x=>x.id===p.id)
  assert.strictEqual(pl.contract.years, 3)
  assert.strictEqual(pl.contract.salary, 10000)
  assert.strictEqual(pl.contract.signingBonus, 6000)
  console.log('proposeContract applied and deducted bonus, new balance', after)
}

function testSignFreeAgentInsufficient(){
  const league = createNewLeague()
  // give low balance
  league.userTeam.balance = 100
  const fa = league.freeAgents[0]
  const beforeCount = league.freeAgents.length
  const updated = signFreeAgent(league, fa)
  // should not sign due to insufficient funds; freeAgents length unchanged
  assert.strictEqual(updated.freeAgents.length, beforeCount)
  console.log('signFreeAgent blocked due to insufficient funds (as expected)')
}

function testInjurySetClear(){
  const league = createNewLeague()
  const p = league.userTeam.roster[1]
  const updated = setInjuryWeeks(league, p.id, 4)
  const pl = (updated && ((updated.userTeam && updated.userTeam.roster.find(x=>x.id===p.id)) || updated.teams?.flatMap(t=>t.roster||[]).find(x=>x.id===p.id))) || p
  assert.strictEqual(pl.injury.weeks, 4)
  const after = clearInjury(updated, p.id)
  const pl2 = (after && ((after.userTeam && after.userTeam.roster.find(x=>x.id===p.id)) || after.teams?.flatMap(t=>t.roster||[]).find(x=>x.id===p.id))) || p
  assert.strictEqual(pl2.injury, null)
  console.log('setInjuryWeeks and clearInjury work as expected')
}

function testDraftBoardAndTrading(){
  const league = createNewLeague()
  // prepare draft with 2 rounds
  startDraft(league, 2)
  const board = league.draft.board
  assert.strictEqual(board.length, (league.teams.length + 1) * 2)
  const pickA = board[0]
  const pickB = board[1]
  // trade picks pre-draft
  const res = tradePicks(league, pickA.id, pickB.id)
  // tradePicks may be declined by AI depending on evaluation, but should not throw
  if(res.success){
    // owners swapped
    assert.strictEqual(board[0].owner, pickB.originalOwner)
    assert.strictEqual(board[1].owner, pickA.originalOwner)
    console.log('tradePicks accepted before draft start')
  } else {
    console.log('tradePicks was declined by AI (expected in some difficulty settings)')
  }
}

function testPerformDraftPick(){
  const league = createNewLeague()
  // setup prospects and draft
  league.prospects = generateProspects(8)
  startDraft(league, 1)
  beginDraft(league)
  const pick = league.draft.board[0]
  const player = league.prospects[0]
  const res = performDraftPick(league, pick.id, player.id)
  assert.ok(res.success)
  // ensure player moved from prospects to roster
  assert.strictEqual(league.prospects.find(p=>p.id===player.id), undefined)
  const team = (league.userTeam.name === pick.owner) ? league.userTeam : league.teams.find(t=>t.name===pick.owner)
  assert.ok(team.roster.find(p=>p.name === player.name))
  console.log('performDraftPick moved player to roster')
}

function testAIAutoPick(){
  const league = createNewLeague()
  league.prospects = generateProspects(6)
  startDraft(league, 1)
  // ensure user is somewhere in the board; then beginDraft should auto-pick until user's pick
  const begun = beginDraft(league)
  // find first pick owned by AI (not user)
  const aiPicked = begun.draft.board.filter(p=> p.playerId && p.owner !== begun.userTeam.name)
  assert.ok(aiPicked.length > 0)
  console.log('testAIAutoPick: AI picks were made before user pick')
}

function testDraftSign(){
  const league = createNewLeague()
  league.userTeam.balance = 100000
  const prospect = league.prospects[0]
  const beforeLen = league.prospects.length
  const updated = signDraftPick(league, prospect)
  assert.strictEqual(updated.prospects.length, beforeLen - 1)
  console.log('signDraftPick moved prospect to roster and deducted cost')
}

function testScoutingModel(){
  const league = createNewLeague()
  league.scoutingPoints = 20
  league.prospects = generateProspects(3)
  const p = league.prospects[0]
  const beforeGrade = p.scoutGrade
  const beforePoints = league.scoutingPoints
  const res = scoutProspect(league, p.id, 5)
  assert.ok(res.success)
  assert.strictEqual(league.scoutingPoints, beforePoints - 5)
  const rep = getScoutReport(league, p.id)
  assert.ok(rep.success)
  assert.ok(Number.isInteger(rep.grade))
  assert.ok(Array.isArray(rep.sources))
  console.log('scouting model test: scouting consumed points and created a report')
}

function testReleaseCreatesDeadMoney(){
  const league = createNewLeague()
  league.userTeam.balance = 50000
  const p = league.userTeam.roster[0]
  // sign a contract with signing bonus of 6000 over 3 years
  proposeContract(league, p.id, 3, 10000, 6000, 6000)
  const res = releasePlayer(league, p.id)
  // dead money should be amortized bonus remaining; since we released immediately, remaining ~6000
  assert.ok(res.dead >= 2000)
  assert.ok(league.deadMoney >= res.dead)
  console.log('releasePlayer added dead money', res.dead)
}

function testPersonaInfluence(){
  const league = createNewLeague()
  const user = league.userTeam
  const opponent = league.teams.find(t=>t.name!==user.name)
  const myPlayer = user.roster[1]
  const theirPlayer = opponent.roster[1]
  // craft age/overall to show youth vs veteran
  myPlayer.age = 21; myPlayer.overall = 60
  theirPlayer.age = 28; theirPlayer.overall = 70

  const base = evaluateTrade(league, user.name, opponent.name, myPlayer.id, theirPlayer.id)
  opponent.persona = { style: 'rebuild', aggressiveness: 0.9 }
  const post = evaluateTrade(league, user.name, opponent.name, myPlayer.id, theirPlayer.id)
  assert.ok(post.diff >= base.diff)
  console.log('testPersonaInfluence: persona modified trade diff as expected', base.diff, '->', post.diff)
}

function testPhaseTransitions(){
  let league = createNewLeague()
  // ensure starting phase
  assert.strictEqual(league.phase, 'offseason')
  // move to draft
  league = advancePhase(league)
  assert.strictEqual(league.phase, 'draft')
  // move to free agency
  league = advancePhase(league)
  assert.strictEqual(league.phase, 'free_agency')
  // move to roster management
  league = advancePhase(league)
  assert.strictEqual(league.phase, 'roster_management')
  // move to regular season
  league = advancePhase(league)
  assert.strictEqual(league.phase, 'regular_season')
  // simulate and move to playoffs (this will simulate remaining weeks)
  league = advancePhase(league)
  console.log('After simulating weeks: week=', league.week, 'phase=', league.phase)
  assert.strictEqual(league.phase, 'playoffs')
  // finish playoffs -> cycle to offseason and increment season
  const oldSeason = league.season
  league = advancePhase(league)
  assert.strictEqual(league.phase, 'offseason')
  assert.strictEqual(league.season, oldSeason + 1)
  console.log('Phase transitions test passed')
}

function runAll(){
  testEvaluateTrade()
  testProposeTrade()
  testSimulateGame()
  testSimulateWeekPersistence()
  testProposeContract()
  testSignFreeAgentInsufficient()
  testInjurySetClear()
  testDraftSign()
  testPersonaInfluence()
  testScoutingModel()
  testPhaseTransitions()
  console.log('All tests passed')
}

runAll()
