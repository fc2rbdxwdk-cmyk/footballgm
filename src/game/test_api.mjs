import assert from 'assert'
import { createNewLeague, evaluateTrade, proposeTrade, simulateGame } from './api.js'
import { simulateWeek } from './api.js'

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

function runAll(){
  testEvaluateTrade()
  testProposeTrade()
  testSimulateGame()
  testSimulateWeekPersistence()
  console.log('All tests passed')
}

runAll()
