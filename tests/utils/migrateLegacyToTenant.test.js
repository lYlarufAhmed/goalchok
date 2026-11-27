import { describe, it, expect } from 'vitest'
import { migrate, TENANT_BASE } from '../../scripts/migrate-legacy-to-tenant.mjs'

// Minimal in-memory stand-in for the Admin SDK Firestore surface the script uses.
function fakeDb(initial = {}) {
  const store = new Map(Object.entries(initial))
  const snap = (path) => ({
    id: path.split('/').pop(),
    exists: store.has(path),
    data: () => store.get(path),
  })
  return {
    store,
    doc: (path) => ({ path, get: async () => snap(path) }),
    collection: (name) => ({
      get: async () => {
        const docs = [...store.keys()]
          .filter((p) => p.startsWith(`${name}/`) && p.split('/').length === 2)
          .map(snap)
        return { empty: docs.length === 0, docs }
      },
    }),
    batch: () => {
      const ops = []
      return {
        set: (ref, data) => ops.push([ref.path, data]),
        commit: async () => ops.forEach(([p, d]) => store.set(p, d)),
      }
    },
  }
}

const legacy = {
  'teams/t1': { name: 'Team 1' },
  'matches/m1': { teamA: 't1', teamB: 't2' },
  'knockout_matches/ko-qf-1': { round: 'QF' },
  'groups/tournament': { A: ['t1'] },
  'settings/config': { theme: 'dark' },
  'settings/knockout': { step: 3, champion: null },
}

describe('migrate-legacy-to-tenant', () => {
  it('dry run reports the plan and writes nothing', async () => {
    const db = fakeDb(legacy)
    const report = await migrate(db)
    expect(report.copied).toHaveLength(6)
    expect(db.store.size).toBe(6)
  })

  it('copies every legacy document to its tenant path, keeping the source', async () => {
    const db = fakeDb(legacy)
    await migrate(db, { apply: true })
    expect(db.store.get(`${TENANT_BASE}/teams/t1`)).toEqual({ name: 'Team 1' })
    expect(db.store.get(`${TENANT_BASE}/matches/m1`)).toEqual({ teamA: 't1', teamB: 't2' })
    expect(db.store.get(`${TENANT_BASE}/knockout/ko-qf-1`)).toEqual({ round: 'QF' })
    expect(db.store.get(`${TENANT_BASE}/groups/tournament`)).toEqual({ A: ['t1'] })
    expect(db.store.get(`${TENANT_BASE}/settings/config`)).toEqual({ theme: 'dark' })
    expect(db.store.get(`${TENANT_BASE}/settings/state`)).toEqual({ step: 3, champion: null })
    expect(db.store.get('teams/t1')).toEqual({ name: 'Team 1' })
  })

  it('skips destinations that already exist unless overwrite is set', async () => {
    const db = fakeDb({ ...legacy, [`${TENANT_BASE}/teams/t1`]: { name: 'Edited' } })
    const report = await migrate(db, { apply: true })
    expect(report.skipped).toEqual([`teams/t1 -> ${TENANT_BASE}/teams/t1`])
    expect(db.store.get(`${TENANT_BASE}/teams/t1`)).toEqual({ name: 'Edited' })

    await migrate(db, { apply: true, overwrite: true })
    expect(db.store.get(`${TENANT_BASE}/teams/t1`)).toEqual({ name: 'Team 1' })
  })

  it('reports missing legacy sources', async () => {
    const report = await migrate(fakeDb({}))
    expect(report.copied).toHaveLength(0)
    expect(report.missing).toEqual([
      'teams', 'matches', 'knockout_matches', 'groups/tournament', 'settings/config', 'settings/knockout',
    ])
  })
})
