import {
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { MatchLifecycleService } from '../domain/matchLifecycleService'
import { generateUUID } from '../utils/uuid'
import { getTenantCollection, getTenantDoc } from './tenantContext'

const lifecycleService = new MatchLifecycleService()

export async function fetchMatches(orgId, tournamentId) {
  const colRef = getTenantCollection(orgId, tournamentId, 'matches')
  const snapshot = await getDocs(colRef)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createMatch({ orgId, tournamentId, group, teamA, teamB, date, time, venue }) {
  const id = generateUUID()
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
  const docRef = getTenantDoc(orgId, tournamentId, 'matches', id)
  await setDoc(docRef, match)
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

export async function updateMatchDoc(orgId, tournamentId, id, updates) {
  const docRef = getTenantDoc(orgId, tournamentId, 'matches', id)
  await updateDoc(docRef, stripUndefined(updates))
}

export async function bulkCreateMatches(orgId, tournamentId, matchesList) {
  if (!matchesList.length) return []

  const batch = writeBatch(db)
  const created = []

  matchesList.forEach((data) => {
    const id = generateUUID()
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
    const docRef = getTenantDoc(orgId, tournamentId, 'matches', id)
    batch.set(docRef, match)
    created.push(match)
  })

  await batch.commit()
  return created
}

export async function deleteMatchDoc(orgId, tournamentId, id) {
  const docRef = getTenantDoc(orgId, tournamentId, 'matches', id)
  await deleteDoc(docRef)
}

export async function saveMatchResult(orgId, tournamentId, id, result, status = 'completed') {
  const validatedResult = lifecycleService.validateResultPayload(result)
  const payload = stripUndefined({
    status,
    result: validatedResult,
  })
  const docRef = getTenantDoc(orgId, tournamentId, 'matches', id)
  await updateDoc(docRef, payload)
}

export async function setMatchPostponed(orgId, tournamentId, id) {
  await updateMatchDoc(orgId, tournamentId, id, { status: 'postponed', result: null })
}

export async function restoreMatchScheduled(orgId, tournamentId, id) {
  await updateMatchDoc(orgId, tournamentId, id, { status: 'scheduled', result: null })
}
