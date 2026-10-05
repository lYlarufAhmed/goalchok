import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { generateUUID } from '../utils/uuid'

const COLLECTION = 'knockout_matches'

/**
 * Fetch all knockout matches from Firebase
 */
export async function fetchKnockoutMatches() {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Create a single knockout match in Firebase
 */
export async function createKnockoutMatch(matchData) {
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
  await setDoc(doc(db, COLLECTION, id), match)
  return match
}

/**
 * Update a knockout match in Firebase
 */
export async function updateKnockoutMatch(id, updates) {
  await updateDoc(doc(db, COLLECTION, id), updates)
}

/**
 * Delete a knockout match from Firebase
 */
export async function deleteKnockoutMatch(id) {
  await deleteDoc(doc(db, COLLECTION, id))
}

/**
 * Bulk sync knockout matches to Firebase
 * Replaces all knockout matches with the provided list
 */
export async function syncKnockoutMatches(matches) {
  // First, delete all existing knockout matches
  const snapshot = await getDocs(collection(db, COLLECTION))
  const batch = writeBatch(db)
  
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(doc(db, COLLECTION, docSnapshot.id))
  })
  
  await batch.commit()
  
  // Then, add all new matches
  if (matches.length > 0) {
    const newBatch = writeBatch(db)
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
      newBatch.set(doc(db, COLLECTION, match.id), matchDoc)
    })
    await newBatch.commit()
  }
  
  return matches
}

/**
 * Clear all knockout matches from Firebase
 */
export async function clearKnockoutMatches() {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const batch = writeBatch(db)
  
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(doc(db, COLLECTION, docSnapshot.id))
  })
  
  await batch.commit()
}
