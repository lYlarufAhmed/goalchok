/**
 * One-off data migration: copy legacy top-level Firestore data into the
 * Organization (Tenant) path the app now reads from:
 *
 *   organizations/{defaultOrg}/tournaments/{defaultTournament}/...
 *
 * Copy-only — legacy documents are never modified or deleted, so the app
 * running on the old paths keeps working until the new build is deployed.
 * A destination document that already exists is skipped (and reported)
 * unless --overwrite is passed.
 *
 * Usage (production, Application Default Credentials):
 *   gcloud auth application-default login
 *   node scripts/migrate-legacy-to-tenant.mjs            # dry run: report only
 *   node scripts/migrate-legacy-to-tenant.mjs --apply    # write
 *
 * Against the emulator: set FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 first.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const tenant = require('../shared/tenant.json')

export const TENANT_BASE = `organizations/${tenant.defaultOrg}/tournaments/${tenant.defaultTournament}`

// Whole collections copied doc-for-doc (legacy collection → tenant collection).
export const COLLECTION_MAP = [
  { from: 'teams', to: 'teams' },
  { from: 'matches', to: 'matches' },
  { from: 'knockout_matches', to: 'knockout' },
]

// Single documents copied to a (possibly renamed) tenant document.
export const DOC_MAP = [
  { from: 'groups/tournament', to: 'groups/tournament' },
  { from: 'settings/config', to: 'settings/config' },
  { from: 'settings/knockout', to: 'settings/state' },
]

/**
 * Plan (and optionally apply) the migration.
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{apply?: boolean, overwrite?: boolean, log?: (msg: string) => void}} [options]
 * @returns {Promise<{copied: string[], skipped: string[], missing: string[]}>}
 */
export async function migrate(db, { apply = false, overwrite = false, log = () => {} } = {}) {
  const report = { copied: [], skipped: [], missing: [] }
  const writes = []

  const plan = async (fromPath, toPath, data) => {
    const dest = await db.doc(toPath).get()
    if (dest.exists && !overwrite) {
      report.skipped.push(`${fromPath} -> ${toPath}`)
      return
    }
    report.copied.push(`${fromPath} -> ${toPath}`)
    writes.push({ toPath, data })
  }

  for (const { from, to } of COLLECTION_MAP) {
    const snap = await db.collection(from).get()
    if (snap.empty) report.missing.push(from)
    for (const docSnap of snap.docs) {
      await plan(`${from}/${docSnap.id}`, `${TENANT_BASE}/${to}/${docSnap.id}`, docSnap.data())
    }
  }

  for (const { from, to } of DOC_MAP) {
    const snap = await db.doc(from).get()
    if (!snap.exists) {
      report.missing.push(from)
      continue
    }
    await plan(from, `${TENANT_BASE}/${to}`, snap.data())
  }

  if (apply) {
    // Firestore batches cap at 500 writes.
    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch()
      writes.slice(i, i + 400).forEach(({ toPath, data }) => batch.set(db.doc(toPath), data))
      await batch.commit()
    }
  }

  log(`${apply ? 'Copied' : 'Would copy'} ${report.copied.length} document(s):`)
  report.copied.forEach((line) => log(`  ${line}`))
  log(`Skipped ${report.skipped.length} (destination exists${overwrite ? '' : '; pass --overwrite to replace'}):`)
  report.skipped.forEach((line) => log(`  ${line}`))
  if (report.missing.length) log(`Legacy source empty or missing: ${report.missing.join(', ')}`)
  if (!apply) log('Dry run — nothing written. Re-run with --apply to write.')
  return report
}

async function main() {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')
  const args = new Set(process.argv.slice(2))
  const projectId = process.env.GCLOUD_PROJECT || 'goalchok-7391'

  const app = process.env.FIRESTORE_EMULATOR_HOST
    ? initializeApp({ projectId })
    : initializeApp({ projectId, credential: applicationDefault() })

  console.log(`Project: ${projectId}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulator)' : ''}`)
  console.log(`Target:  ${TENANT_BASE}`)
  await migrate(getFirestore(app), {
    apply: args.has('--apply'),
    overwrite: args.has('--overwrite'),
    log: (msg) => console.log(msg),
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
