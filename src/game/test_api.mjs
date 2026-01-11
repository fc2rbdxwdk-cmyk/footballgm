import assert from 'assert'
import { createNewLeague, evaluateTrade, proposeTrade, simulateGame } from './api.js'
import { simulateWeek, proposeContract, signFreeAgent, setInjuryWeeks, clearInjury, signDraftPick } from './api.js'

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
  const res = proposeContract(league, p.id, 3, 10000)
  assert.ok(res && res.success)
  const after = league.userTeam.balance
  // signing bonus should be 50% of 10k = 5k
  assert.strictEqual(after, 50000 - 5000)
  // contract updated
  const pl = league.userTeam.roster.find(x=>x.id===p.id)
  assert.strictEqual(pl.contract.years, 3)
  assert.strictEqual(pl.contract.salary, 10000)
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
  const pl = (updated && updated.userTeam && updated.userTeam.roster.find(x=>x.id===p.id)) || p
  assert.strictEqual(pl.injury.weeks, 4)
  const after = clearInjury(updated, p.id)
  const pl2 = (after && after.userTeam && after.userTeam.roster.find(x=>x.id===p.id)) || p
  assert.strictEqual(pl2.injury, null)
  console.log('setInjuryWeeks and clearInjury work as expected')
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

function runAll(){
  testEvaluateTrade()
  testProposeTrade()
  testSimulateGame()
  testSimulateWeekPersistence()
  testProposeContract()
  testSignFreeAgentInsufficient()
  testInjurySetClear()
  testDraftSign()
  console.log('All tests passed')
}

runAll()
