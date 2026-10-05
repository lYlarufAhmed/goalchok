import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { ref, set, get } from 'firebase/database'
import { readFileSync } from 'fs'

const PROJECT_ID = 'goalchok-7391'

const LIVE_STATE = { scoreA: 1, scoreB: 0, status: 'live', events: [] }

describe('Realtime Database Security Rules', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      database: {
        rules: readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8'),
        host: '127.0.0.1',
        port: 9000,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearDatabase()
  })

  function liveMatchRef(db) {
    return ref(db, 'liveMatches/match-1')
  }

  it('allows public reads of live matches for spectators', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', { orgId: 'org-a', role: 'admin' })
      .database()
    await assertSucceeds(set(liveMatchRef(admin), LIVE_STATE))

    const publicRead = testEnv.unauthenticatedContext().database()
    await assertSucceeds(get(liveMatchRef(publicRead)))
  })

  it('denies unauthenticated writes to live matches', async () => {
    const db = testEnv.unauthenticatedContext().database()
    await assertFails(set(liveMatchRef(db), LIVE_STATE))
  })

  it('denies writes for authenticated users without the admin role', async () => {
    const db = testEnv.authenticatedContext('member-1', { orgId: 'org-a' }).database()
    await assertFails(set(liveMatchRef(db), LIVE_STATE))
  })

  it('allows writes for admins', async () => {
    const db = testEnv
      .authenticatedContext('admin-1', { orgId: 'org-a', role: 'admin' })
      .database()
    await assertSucceeds(set(liveMatchRef(db), LIVE_STATE))
  })

  it('denies reads outside the liveMatches subtree', async () => {
    const db = testEnv.unauthenticatedContext().database()
    await assertFails(get(ref(db, 'privateStuff/secret')))
  })
})
