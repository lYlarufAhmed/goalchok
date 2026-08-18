import { TournamentEngine } from '../domain/tournamentEngine'

/**
 * Merge Firestore group matches with knockout matches.
 */
export function mergeKnockoutMatches(firebaseMatches = [], koMatches = []) {
  const engine = new TournamentEngine([], firebaseMatches, koMatches)
  return engine.getMergedMatches()
}
