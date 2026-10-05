import { TournamentEngine } from '../domain/tournamentEngine'

const GROUPS = ['A', 'B', 'C']

/**
 * Compute standings for all three groups (read-only, no side effects).
 */
export function computeAllStandings(teams, matches) {
  const engine = new TournamentEngine(teams, matches)
  return engine.getAllStandings()
}

/**
 * Determine the 8 qualified teams from group standings.
 */
export function getQualifiedTeams(teams, matches) {
  const engine = new TournamentEngine(teams, matches)
  return engine.getQualifiedTeams()
}

/**
 * Team IDs of the two best third-placed teams that actually qualify (seeds 7–8).
 */
export function getBestThirdPlacedTeamIds(teams, matches) {
  return new Set(
    getQualifiedTeams(teams, matches)
      .filter((q) => q.seed >= 7)
      .map((q) => q.teamId)
      .filter(Boolean)
  )
}

/**
 * Generate Quarter Final pairings from 8 seeded qualified teams.
 * Bracket: 1v8, 2v7, 3v6, 4v5
 */
export function generateQFPairings(qualifiedTeams) {
  const matchups = [
    [0, 7], // QF1: seed1 vs seed8
    [1, 6], // QF2: seed2 vs seed7
    [2, 5], // QF3: seed3 vs seed6
    [3, 4], // QF4: seed4 vs seed5
  ]

  return matchups.map(([iA, iB], index) => ({
    id: `ko-qf-${index + 1}`,
    round: 'QF',
    matchLabel: null, // rendered from round + matchNumber
    matchNumber: index + 1,
    teamA: qualifiedTeams[iA]?.teamId || '',
    teamB: qualifiedTeams[iB]?.teamId || '',
    date: '',
    time: '',
    venue: 'ملاعب فيا',
    status: 'scheduled',
    result: null,
  }))
}

/**
 * Determine the winning team ID from a completed knockout match.
 * Handles penalty shootout results.
 */
export function getKnockoutWinner(match) {
  const engine = new TournamentEngine()
  return engine.getKnockoutWinner(match)
}

/**
 * Check if the entire group stage is complete:
 * - All 12 teams assigned to groups
 * - All group-stage matches completed
 */
export function isGroupStageComplete(teams, matches) {
  const teamsInGroups = teams.filter((t) => t.group && GROUPS.includes(t.group))
  if (teamsInGroups.length < 12) return false

  const groupMatches = matches.filter((m) => GROUPS.includes(m.group))
  if (groupMatches.length === 0) return false
  return groupMatches.every((m) => m.status === 'completed')
}

/**
 * Generate a short random local ID for knockout matches.
 */
export function generateKoId() {
  return 'ko-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now()
}
