import { getDoc, setDoc } from 'firebase/firestore'
import { getTenantDoc } from './tenantContext'

const DOC_ID = 'tournament'

const defaultGroups = {
  A: [],
  B: [],
  C: [],
  locked: false,
}

export async function fetchGroups(orgId, tournamentId) {
  const snap = await getDoc(getTenantDoc(orgId, tournamentId, 'groups', DOC_ID))
  if (!snap.exists()) return defaultGroups
  return { ...defaultGroups, ...snap.data() }
}

export async function saveGroups(orgId, tournamentId, groups) {
  await setDoc(getTenantDoc(orgId, tournamentId, 'groups', DOC_ID), {
    A: groups.A || [],
    B: groups.B || [],
    C: groups.C || [],
    locked: true,
  })
}

export async function clearGroupsDoc(orgId, tournamentId) {
  await setDoc(getTenantDoc(orgId, tournamentId, 'groups', DOC_ID), defaultGroups)
}
