import { db } from '../config/firebase'
import { collection, doc } from 'firebase/firestore'

/**
 * Generates the correct multi-tenant Firestore path.
 * Format: organizations/{orgId}/tournaments/{tournamentId}/{collectionPath}
 */
export function getTenantCollection(orgId: string, tournamentId: string, path: 'matches' | 'teams' | 'groups' | 'knockout') {
  if (!orgId || !tournamentId) {
    throw new Error('Tenant Context Missing: orgId and tournamentId are required for data access.')
  }
  return collection(db, 'organizations', orgId, 'tournaments', tournamentId, path)
}

export function getTenantDoc(orgId: string, tournamentId: string, path: 'matches' | 'teams' | 'groups' | 'knockout', docId: string) {
  if (!orgId || !tournamentId) {
    throw new Error('Tenant Context Missing: orgId and tournamentId are required for data access.')
  }
  return doc(db, 'organizations', orgId, 'tournaments', tournamentId, path, docId)
}
