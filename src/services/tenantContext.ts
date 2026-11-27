import { db } from '../config/firebase'
import { collection, doc } from 'firebase/firestore'
import { useAuthStore } from '../stores/useAuthStore'
import tenant from '../../shared/tenant.json'

export const DEFAULT_ORG: string = tenant.defaultOrg
export const DEFAULT_TOURNAMENT: string = tenant.defaultTournament

type TenantPath = 'matches' | 'teams' | 'groups' | 'settings' | 'knockout'

/**
 * Generates the correct multi-tenant Firestore path.
 * Format: organizations/{orgId}/tournaments/{tournamentId}/{collectionPath}
 */
export function getTenantCollection(orgId: string, tournamentId: string, path: TenantPath) {
  if (!orgId || !tournamentId) {
    throw new Error('Tenant Context Missing: orgId and tournamentId are required for data access.')
  }
  return collection(db, 'organizations', orgId, 'tournaments', tournamentId, path)
}

export function getTenantDoc(orgId: string, tournamentId: string, path: TenantPath, docId: string) {
  if (!orgId || !tournamentId) {
    throw new Error('Tenant Context Missing: orgId and tournamentId are required for data access.')
  }
  return doc(db, 'organizations', orgId, 'tournaments', tournamentId, path, docId)
}

/**
 * Tenant resolution outside React (zustand stores, effects that subscribe
 * once). Priority: the signed-in user's orgId claim, then the shared
 * default. The fallback only picks which path is read or written — it
 * grants no authorization; firestore.rules verify the caller's claims.
 *
 * Resolved once per subscription/call. Re-resolving on tenant switch is a
 * concern for the org-switching feature, not this helper.
 */
export function resolveCurrentTenant() {
  const claims = useAuthStore.getState().claims
  return {
    orgId: claims?.orgId || DEFAULT_ORG,
    tournamentId: DEFAULT_TOURNAMENT,
  }
}
