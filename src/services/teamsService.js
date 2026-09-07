import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { generateUUID } from '../utils/uuid'
import { getTenantCollection, getTenantDoc } from './tenantContext'

export async function fetchTeams(orgId, tournamentId) {
  const colRef = getTenantCollection(orgId, tournamentId, 'teams')
  const snapshot = await getDocs(colRef)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      players: Array.isArray(data.players) ? data.players : [],
      logo: data.logo || null,
      color: data.color || null,
      group: data.group || null,
      name: data.name || '',
      manager: data.manager || '',
    }
  })
}

export async function createTeam({ orgId, tournamentId, name, manager, players, logo, color, group }) {
  const id = generateUUID()
  const team = {
    id,
    name: (name || '').trim(),
    manager: (manager || '').trim(),
    players: players || [],
    logo: logo || null,
    color: color || null,
    group: group || null,
    createdAt: serverTimestamp(),
  }
  const docRef = getTenantDoc(orgId, tournamentId, 'teams', id)
  await setDoc(docRef, team)
  return {
    ...team,
    createdAt: new Date().toISOString(),
    players: players || [],
  }
}

export async function updateTeamDoc(orgId, tournamentId, id, { name, manager, players, logo, color, group }) {
  const updates = {
    name: (name || '').trim(),
    manager: (manager || '').trim(),
    players: players || [],
  }
  if (logo !== undefined) updates.logo = logo || null
  if (color !== undefined) updates.color = color || null
  if (group !== undefined) updates.group = group || null
  
  const docRef = getTenantDoc(orgId, tournamentId, 'teams', id)
  await updateDoc(docRef, updates)
}

export async function deleteTeamDoc(orgId, tournamentId, id) {
  const docRef = getTenantDoc(orgId, tournamentId, 'teams', id)
  await deleteDoc(docRef)
}

export async function updateTeamGroups(orgId, tournamentId, groupMap) {
  const updates = Object.entries(groupMap).map(([teamId, group]) => {
    const docRef = getTenantDoc(orgId, tournamentId, 'teams', teamId)
    return updateDoc(docRef, { group })
  })
  await Promise.all(updates)
}

export async function clearAllTeamGroups(orgId, tournamentId, teamIds) {
  await Promise.all(
    teamIds.map((id) => {
      const docRef = getTenantDoc(orgId, tournamentId, 'teams', id)
      return updateDoc(docRef, { group: null })
    })
  )
}
