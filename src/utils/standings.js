import { TournamentEngine } from '../domain/tournamentEngine'

export function calculateStandings(teams, matches, group) {
  const engine = new TournamentEngine(teams, matches)
  return engine.getStandings(group)
}

export function getTeamStandingRank(teams, matches, teamId) {
  const team = teams.find((t) => t.id === teamId)
  if (!team?.group) return null
  const standings = calculateStandings(teams, matches, team.group)
  const rank = standings.findIndex((t) => t.id === teamId) + 1
  return rank > 0 ? rank : null
}
