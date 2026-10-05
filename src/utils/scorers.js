import { TournamentEngine } from '../domain/tournamentEngine'

export function calculateTopScorers(teams, matches) {
  const engine = new TournamentEngine(teams, matches)
  return engine.getTopScorers()
}

export function getPlayerGoals(teams, matches, playerName, teamId) {
  let goals = 0
  matches
    .filter((m) => m.status === 'completed' && m.result?.scorers)
    .forEach((match) => {
      match.result.scorers.forEach((scorer) => {
        if (scorer.player === playerName && scorer.teamId === teamId) goals++
      })
    })
  return goals
}

export function getTotalGoals(matches) {
  return matches
    .filter((m) => m.status === 'completed' && m.result)
    .reduce((sum, m) => sum + m.result.scoreA + m.result.scoreB, 0)
}
