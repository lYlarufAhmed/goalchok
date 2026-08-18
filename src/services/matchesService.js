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
import { MatchLifecycleService } from '../domain/matchLifecycleService'

const COLLECTION = 'matches'
const lifecycleService = new MatchLifecycleService()

export async function fetchMatches() {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createMatch({ group, teamA, teamB, date, time, venue }) {
  const id = crypto.randomUUID()
  const match = {
    id,
    group,
    teamA,
    teamB,
    date,
    time,
    venue: venue.trim(),
    status: 'scheduled',
    result: null,
  }
  await setDoc(doc(db, COLLECTION, id), match)
  return match
}

function stripUndefined(value) {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined)
  }
  const cleaned = {}
  Object.entries(value).forEach(([key, val]) => {
    const next = stripUndefined(val)
    if (next !== undefined) cleaned[key] = next
  })
  return cleaned
}

export async function updateMatchDoc(id, updates) {
  await updateDoc(doc(db, COLLECTION, id), stripUndefined(updates))
}

export async function bulkCreateMatches(matchesList) {
  if (!matchesList.length) return []

  const batch = writeBatch(db)
  const created = []

  matchesList.forEach((data) => {
    const id = crypto.randomUUID()
    const match = {
      id,
      group: data.group,
      teamA: data.teamA,
      teamB: data.teamB,
      date: data.date,
      time: data.time,
      venue: data.venue.trim(),
      status: 'scheduled',
      result: null,
    }
    batch.set(doc(db, COLLECTION, id), match)
    created.push(match)
  })

  await batch.commit()
  return created
}

export async function deleteMatchDoc(id) {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function saveMatchResult(id, result, status = 'completed') {
  const validatedResult = lifecycleService.validateResultPayload(result)
  const payload = stripUndefined({
    status,
    result: validatedResult,
  })
  await updateDoc(doc(db, COLLECTION, id), payload)
}

export async function setMatchPostponed(id) {
  await updateMatchDoc(id, { status: 'postponed', result: null })
}

export async function restoreMatchScheduled(id) {
  await updateMatchDoc(id, { status: 'scheduled', result: null })
}
