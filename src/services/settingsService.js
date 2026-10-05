import { getDoc, setDoc } from 'firebase/firestore'
import { getTenantDoc } from './tenantContext'

const DOC_ID = 'config'

const defaultSettings = {
  drawLocked: false,
  tournamentPhase: 'مرحلة المجموعات',
  theme: 'dark',
  language: 'ar',
}

export async function fetchSettings(orgId, tournamentId) {
  const snap = await getDoc(getTenantDoc(orgId, tournamentId, 'settings', DOC_ID))
  if (!snap.exists()) return defaultSettings
  return { ...defaultSettings, ...snap.data() }
}

export async function updateSettings(orgId, tournamentId, updates) {
  await setDoc(getTenantDoc(orgId, tournamentId, 'settings', DOC_ID), updates, { merge: true })
}
