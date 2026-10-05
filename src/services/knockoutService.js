import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore'
import { generateUUID } from '../utils/uuid'
import { getTenantCollection, getTenantDoc } from './tenantContext'

const COLLECTION = 'knockout'
const STATE_DOC = 'state'

const tenantRef = (orgId, tournamentId) => getTenantCollection(orgId, tournamentId, COLLECTION)

/**
 * Fetch all knockout matches for the tournament
 */
export async function fetchKnockoutMatches(orgId, tournamentId) {
  const snapshot = await getDocs(tenantRef(orgId, tournamentId))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Create a single knockout match in Firebase
 */
export async function createKnockoutMatch(orgId, tournamentId, matchData) {
  const id = matchData.id || generateUUID()
  const match = {
    id,
    round: matchData.round,
    matchLabel: matchData.matchLabel,
    teamA: matchData.teamA,
    teamB: matchData.teamB,
    date: matchData.date || '',
    time: matchData.time || '',
    venue: matchData.venue || '',
    status: matchData.status || 'scheduled',
    result: matchData.result || null,
  }
  await setDoc(getTenantDoc(orgId, tournamentId, COLLECTION, id), match)
  return match
}

/**
 * Update a knockout match in Firebase
 */
export async function updateKnockoutMatch(orgId, tournamentId, id, updates) {
  await updateDoc(getTenantDoc(orgId, tournamentId, COLLECTION, id), updates)
}

/**
 * Delete a knockout match from Firebase
 */
export async function deleteKnockoutMatch(orgId, tournamentId, id) {
  await deleteDoc(getTenantDoc(orgId, tournamentId, COLLECTION, id))
}

/**
 * Replaces all knockout matches with the provided list
 */
export async function syncKnockoutMatches(orgId, tournamentId, matches) {
  const ref = tenantRef(orgId, tournamentId)

  // First, delete all existing knockout matches
  const snapshot = await getDocs(ref)
  const batch = writeBatch(ref.firestore)
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })
  await batch.commit()

  // Then, add all new matches
  if (matches.length > 0) {
    const newBatch = writeBatch(ref.firestore)
    matches.forEach((match) => {
      const matchDoc = {
        round: match.round,
        matchLabel: match.matchLabel,
        teamA: match.teamA,
        teamB: match.teamB,
        date: match.date || '',
        time: match.time || '',
        venue: match.venue || '',
        status: match.status || 'scheduled',
        result: match.result || null,
      }
      newBatch.set(doc(ref, match.id), matchDoc)
    })
    await newBatch.commit()
  }

  return matches
}

/**
 * Clear all knockout matches from Firebase
 */
export async function clearKnockoutMatches(orgId, tournamentId) {
  const ref = tenantRef(orgId, tournamentId)
  const snapshot = await getDocs(ref)
  const batch = writeBatch(ref.firestore)

  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  await batch.commit()
}

/**
 * Knockout stage state (step, qualified teams, champion) — the document the
 * knockout store syncs across sessions. Lives under the tenant so each
 * Organization (Tenant) owns its own bracket state.
 */
export async function saveKnockoutState(orgId, tournamentId, state) {
  await setDoc(
    getTenantDoc(orgId, tournamentId, 'settings', STATE_DOC),
    {
      step: state.step,
      qualifiedTeams: state.qualifiedTeams,
      champion: state.champion,
    },
    { merge: true }
  )
}

export function subscribeKnockoutState(orgId, tournamentId, onData, onError) {
  return onSnapshot(
    getTenantDoc(orgId, tournamentId, 'settings', STATE_DOC),
    (snapshot) => onData(snapshot),
    (err) => onError && onError(err)
  )
}

export async function fetchKnockoutState(orgId, tournamentId) {
  const snap = await getDoc(getTenantDoc(orgId, tournamentId, 'settings', STATE_DOC))
  return snap.exists() ? snap.data() : null
}
