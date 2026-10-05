import { useMemo } from 'react'
import { useTenantContext } from './useTenantContext'
import { createTournamentRepository } from '../domain/tournamentRepository'

/**
 * The tenant-injected TournamentRepository for React components.
 * Rebuilt only when the tenant identity changes — every query and
 * mutation in a tree shares one instance per tenant.
 */
export function useTournamentRepository() {
  const { orgId, tournamentId } = useTenantContext()
  return useMemo(() => createTournamentRepository({ orgId, tournamentId }), [orgId, tournamentId])
}
