import { useMemo } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { DEFAULT_ORG, DEFAULT_TOURNAMENT } from '../services/tenantContext'

// Tenant resolution, in priority order:
// 1. Firebase Custom Claims (request.auth.token.orgId)
// 2. React Router URL params (e.g., /org/:orgId/t/:tournamentId/standings) — pending routing work
//
// The fallback to the shared default org only picks which path is read or
// written. It grants no authorization: firestore.rules decide writes from
// the user's verified custom claims, and deny anyone whose claims don't
// match the org being written to.
//
// The default identities live in shared/tenant.json, imported by the web
// app, the cloud functions, and the seed script.

export function useTenantContext() {
  const claims = useAuthStore((state) => state.claims)

  return useMemo(() => {
    return {
      orgId: claims?.orgId || DEFAULT_ORG,
      tournamentId: DEFAULT_TOURNAMENT,
    }
  }, [claims])
}
