import { useMemo } from 'react'

// TODO: In Ticket 3 (Auth & Routing), these will be derived from:
// 1. React Router URL params (e.g., /org/:orgId/t/:tournamentId/standings)
// 2. Firebase Custom Claims (request.auth.token.orgId)
//
// For now, we return a hardcoded "default" tenant to allow the incremental
// migration of Firebase services without breaking the UI.

export function useTenantContext() {
  return useMemo(() => {
    return {
      orgId: 'default-org',
      tournamentId: 'default-tournament',
    }
  }, [])
}
