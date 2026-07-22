import {
  initializeTestEnvironment,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'fs'

const PROJECT_ID = 'goalchok-7391'

describe('Firestore Security Rules', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  it('allows anyone to read matches documents', async () => {
    const context = testEnv.anonymousRulesContext()
    const db = context.firestore()
    const matchDoc = db.collection('matches').doc('test-match')
    await assertSucceeds(matchDoc.get())
  })

  it('allows anyone to write matches documents under current rules', async () => {
    // Under current wide-open rules, writing is allowed for anyone.
    // In Phase 2, we should restrict this to authenticated admins and assertFails.
    const context = testEnv.anonymousRulesContext()
    const db = context.firestore()
    const matchDoc = db.collection('matches').doc('test-match')
    await assertSucceeds(matchDoc.set({ 
      id: 'test-match', 
      group: 'A', 
      teamA: 'Team 1', 
      teamB: 'Team 2' 
    }))
  })

  it('allows anyone to read teams documents', async () => {
    const context = testEnv.anonymousRulesContext()
    const db = context.firestore()
    const teamDoc = db.collection('teams').doc('test-team')
    await assertSucceeds(teamDoc.get())
  })
})
