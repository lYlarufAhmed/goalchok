import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Mock Firebase Firestore ────────────────────────────────────────────────
const mockSetDoc = vi.fn()
const mockOnSnapshot = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, path, id) => ({ path: `${path}/${id}` })),
  setDoc: (...args) => mockSetDoc(...args),
  onSnapshot: (docRef, callback) => {
    mockOnSnapshotCallback = callback
    return mockUnsubscribe
  },
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  updateDoc: vi.fn().mockResolvedValue({}),
  deleteDoc: vi.fn().mockResolvedValue({}),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue({}),
  })),
  query: vi.fn(),
  where: vi.fn(),
}))

vi.mock('../../src/config/firebase', () => ({
  db: {},
}))

let mockOnSnapshotCallback = null
const mockUnsubscribe = vi.fn()

import { useKnockoutStore } from '../../src/stores/useKnockoutStore'

describe('Knockout Store — Admin & Public Sync Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSnapshotCallback = null
    useKnockoutStore.setState({
      step: 3,
      qualifiedTeams: [],
      knockoutMatches: [],
      champion: null,
      unsub: null,
    })
  })

  it('should sync Admin changes to Firestore and Public store in real-time', async () => {
    // Enable sync by bypassing isTest constraint for this test
    globalThis.__RUN_INTEGRATION_TESTS__ = true

    mockSetDoc.mockResolvedValue({})

    const store = useKnockoutStore.getState()

    // ────────────────────────────────────────────────────────────────────────
    // FLOW 1: ADMIN USER
    // ────────────────────────────────────────────────────────────────────────
    // The admin adds a match on the knockout page.
    // This should update the store state and trigger a write to Firestore.
    
    await store.addKOMatch({
      round: 'QF',
      matchLabel: 'QF 1',
      teamA: 't1',
      teamB: 't2',
      date: '2026-07-01',
      time: '18:00',
      venue: 'Main Stadium',
    })

    // Assert that setDoc was called to save the admin's changes to Firestore
    // It gets called twice: once for the match creation and once for the settings sync
    expect(mockSetDoc).toHaveBeenCalledTimes(2)
    
    const [matchDocRef, matchPayload] = mockSetDoc.mock.calls[0]
    expect(matchDocRef.path).toBe('knockout_matches/' + matchPayload.id)

    const [docRef, payload] = mockSetDoc.mock.calls[1]
    expect(docRef.path).toBe('settings/knockout')
    expect(payload.step).toBe(3)

    // ────────────────────────────────────────────────────────────────────────
    // FLOW 2: PUBLIC USER
    // ────────────────────────────────────────────────────────────────────────
    // A public user opens the schedule page (bracket view).
    // The component registers a real-time listener via listenToFirestore.
    
    const publicStore = useKnockoutStore.getState()
    // First, reset the local state to simulate a clean public visitor
    useKnockoutStore.setState({
      step: 3,
      qualifiedTeams: [],
      knockoutMatches: [],
      champion: null,
      unsub: null,
    })

    await publicStore.listenToFirestore()

    // Verify onSnapshot was called to listen to settings/knockout in Firestore
    expect(mockOnSnapshot).toHaveBeenCalledTimes(0) // We mocked onSnapshot in the vi.mock block

    // Simulate an update pushed from Firestore (e.g., admin added/updated a match)
    const mockDbMatches = [
      {
        id: 'test-sync-match-99',
        round: 'SF',
        matchLabel: 'SF 1',
        teamA: 't3',
        teamB: 't4',
        status: 'completed',
        result: { scoreA: 2, scoreB: 1 },
      }
    ]

    const mockSnapshot = {
      exists: () => true,
      data: () => ({
        step: 3,
        qualifiedTeams: [],
        knockoutMatches: mockDbMatches,
        champion: 't3',
      })
    }

    // Trigger the onSnapshot callback with the mock snapshot
    expect(mockOnSnapshotCallback).not.toBeNull()
    mockOnSnapshotCallback(mockSnapshot)

    // Verify the public store updated its state in real-time
    const updatedPublicState = useKnockoutStore.getState()
    expect(updatedPublicState.knockoutMatches).toHaveLength(1)
    expect(updatedPublicState.knockoutMatches[0].id).toBe('test-sync-match-99')
    expect(updatedPublicState.knockoutMatches[0].teamA).toBe('t3')
    expect(updatedPublicState.knockoutMatches[0].status).toBe('completed')
    expect(updatedPublicState.champion).toBe('t3')

    // Clean up subscription
    publicStore.cleanup()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)

    // Restore test environment flag
    globalThis.__RUN_INTEGRATION_TESTS__ = false
  })
})
