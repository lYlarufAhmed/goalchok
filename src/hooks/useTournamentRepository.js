import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenantContext } from './useTenantContext'
import { createTournamentRepository } from '../domain/tournamentRepository'
import { useKnockoutStore } from '../stores/useKnockoutStore'
import { mergeKnockoutMatches } from '../utils/matchMerge'

/**
 * The tenant-injected TournamentRepository for React components.
 * Rebuilt only when the tenant identity changes — every query and
 * mutation in a tree shares one instance per tenant.
 */
export function useTournamentRepository() {
  const { orgId, tournamentId } = useTenantContext()
  return useMemo(() => createTournamentRepository({ orgId, tournamentId }), [orgId, tournamentId])
}

/**
 * Live projection of the repository's teams collection. Same shape the
 * react-query hooks expose, so public and admin pages sit on the same
 * seam — there is no second data path for a page to pick.
 */
export function useTeamsSubscription() {
  const repository = useTournamentRepository()
  // Reset via render-phase adjustment (React docs: adjusting state when a
  // dependency changes) so the effect body never sets state synchronously.
  const [state, setState] = useState({ repository, data: undefined, isError: false })
  if (state.repository !== repository) {
    setState({ repository, data: undefined, isError: false })
  }
  const { data, isError } = state

  useEffect(() => {
    return repository.subscribeTeams(
      (teams) => setState({ repository, data: teams, isError: false }),
      (err) => {
        console.error('[useTeamsSubscription] error:', err)
        setState({ repository, data: undefined, isError: true })
      }
    )
  }, [repository])

  const refetch = useCallback(async () => {
    try {
      const teams = await repository.fetchTeams()
      setState({ repository, data: teams, isError: false })
    } catch (err) {
      console.error('[useTeamsSubscription] refetch error:', err)
      setState({ repository, data: undefined, isError: true })
    }
  }, [repository])

  return { data, isLoading: data === undefined, isError, refetch }
}

/**
 * Live projection of the repository's matches collection, merged with the
 * knockout bracket from the knockout store (same contract as the admin
 * useMatchesQuery).
 */
export function useMatchesSubscription() {
  const repository = useTournamentRepository()
  const koMatches = useKnockoutStore((s) => s.knockoutMatches)
  const [state, setState] = useState({ repository, rawMatches: undefined, isError: false })
  if (state.repository !== repository) {
    setState({ repository, rawMatches: undefined, isError: false })
  }
  const { rawMatches, isError } = state

  useEffect(() => {
    return repository.subscribeMatches(
      (matches) => setState({ repository, rawMatches: matches, isError: false }),
      (err) => {
        console.error('[useMatchesSubscription] error:', err)
        setState({ repository, rawMatches: undefined, isError: true })
      }
    )
  }, [repository])

  const refetch = useCallback(async () => {
    try {
      const matches = await repository.fetchMatches()
      setState({ repository, rawMatches: matches, isError: false })
    } catch (err) {
      console.error('[useMatchesSubscription] refetch error:', err)
      setState({ repository, rawMatches: undefined, isError: true })
    }
  }, [repository])

  const data = useMemo(
    () => (rawMatches ? mergeKnockoutMatches(rawMatches, koMatches) : rawMatches),
    [rawMatches, koMatches]
  )

  return { data, isLoading: rawMatches === undefined, isError, refetch }
}
