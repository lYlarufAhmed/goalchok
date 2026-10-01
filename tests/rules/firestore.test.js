import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'

const PROJECT_ID = 'goalchok-7391'

const TENANT_MATCH = { id: 'match-1', group: 'A', status: 'scheduled' }
const LEGACY_DOC = { id: 'doc-legacy', group: 'A', status: 'scheduled' }

function tenantMatchDoc(db, orgId = 'org-a') {
  return doc(db, 'organizations', orgId, 'tournaments', 't-1', 'matches', 'match-1')
}

describe('Firestore Security Rules', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
        host: '127.0.0.1',
        port: 8085,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  describe('tenant data (organizations/{orgId}/tournaments/{tid})', () => {
    it('allows public reads for spectators', async () => {
      const admin = testEnv
        .authenticatedContext('admin-1', { orgId: 'org-a', role: 'admin' })
        .firestore()
      await assertSucceeds(setDoc(tenantMatchDoc(admin), TENANT_MATCH))

      const publicRead = testEnv.unauthenticatedContext().firestore()
      await assertSucceeds(getDoc(tenantMatchDoc(publicRead)))
    })

    it('denies unauthenticated writes', async () => {
      const db = testEnv.unauthenticatedContext().firestore()
      await assertFails(setDoc(tenantMatchDoc(db), TENANT_MATCH))
    })

    it('allows an org admin to write their own org data', async () => {
      const db = testEnv
        .authenticatedContext('admin-a', { orgId: 'org-a', role: 'admin' })
        .firestore()
      await assertSucceeds(setDoc(tenantMatchDoc(db, 'org-a'), TENANT_MATCH))
    })

    it('denies an org admin writing another org data', async () => {
      const db = testEnv
        .authenticatedContext('admin-a', { orgId: 'org-a', role: 'admin' })
        .firestore()
      await assertFails(setDoc(tenantMatchDoc(db, 'org-b'), TENANT_MATCH))
    })

    it('denies an authenticated member without the admin role', async () => {
      const db = testEnv
        .authenticatedContext('member-a', { orgId: 'org-a' })
        .firestore()
      await assertFails(setDoc(tenantMatchDoc(db, 'org-a'), TENANT_MATCH))
    })

    it('denies an authenticated admin with no org claim writing tenant data', async () => {
      const db = testEnv.authenticatedContext('admin-no-org', { role: 'admin' }).firestore()
      await assertFails(setDoc(tenantMatchDoc(db, 'org-a'), TENANT_MATCH))
    })
  })

  describe('legacy top-level collections still in active use', () => {
    const legacyCollections = ['matches', 'teams', 'knockout_matches', 'groups', 'settings']

    for (const collection of legacyCollections) {
      it(`${collection}: allows public reads`, async () => {
        const db = testEnv.unauthenticatedContext().firestore()
        await assertSucceeds(getDoc(doc(db, collection, 'doc-1')))
      })

      it(`${collection}: denies unauthenticated writes`, async () => {
        const db = testEnv.unauthenticatedContext().firestore()
        await assertFails(setDoc(doc(db, collection, 'doc-1'), LEGACY_DOC))
      })

      it(`${collection}: denies writes for authenticated non-admins`, async () => {
        const db = testEnv.authenticatedContext('member-1', { orgId: 'org-a' }).firestore()
        await assertFails(setDoc(doc(db, collection, 'doc-1'), LEGACY_DOC))
      })

      it(`${collection}: allows writes for admins`, async () => {
        const db = testEnv
          .authenticatedContext('admin-1', { orgId: 'org-a', role: 'admin' })
          .firestore()
        await assertSucceeds(setDoc(doc(db, collection, 'doc-1'), LEGACY_DOC))
      })
    }
  })

  describe('catch-all', () => {
    it('denies writes to undeclared collections even for admins', async () => {
      const db = testEnv
        .authenticatedContext('admin-1', { orgId: 'org-a', role: 'admin' })
        .firestore()
      await assertFails(setDoc(doc(db, 'users', 'admin-1'), { name: 'x' }))
    })

    it('denies reads to undeclared collections', async () => {
      const db = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(db, 'users', 'someone')))
    })
  })
})
