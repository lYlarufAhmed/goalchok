import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Mock Firebase ──────────────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, path, id) => ({ path: id ? `${path}/${id}` : path, id })),
  setDoc: vi.fn().mockResolvedValue({}),
  updateDoc: vi.fn().mockResolvedValue({}),
  deleteDoc: vi.fn().mockResolvedValue({}),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue({}),
  })),
  query: vi.fn(),
  where: vi.fn(),
}))

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  set: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue({}),
  onValue: vi.fn(),
  off: vi.fn(),
}))

vi.mock('../../src/config/firebase', () => ({
  db: {},
  rtdb: {},
}))

import { useKnockoutStore } from '../../src/stores/useKnockoutStore'

describe('Knockout Store — PRD: Unimpeded Admin Control', () => {
  beforeEach(() => {
    localStorage.clear()
    useKnockoutStore.setState({
      step: 3,
      qualifiedTeams: [],
      knockoutMatches: [],
      champion: null,
    })
  })

  describe('Initial State', () => {
    it('should default to step 3 (active management) on fresh load so admins are never locked out', async () => {
      vi.resetModules()
      localStorage.clear()
      const { useKnockoutStore: freshStore } = await import('../../src/stores/useKnockoutStore')
      expect(freshStore.getState().step).toBe(3)
    })
  })

  describe('addKOMatch', () => {
    it('should force step to 3 and append the match when a knockout match is added from the admin panel', async () => {
      useKnockoutStore.setState({ step: 1, knockoutMatches: [] })
      await useKnockoutStore.getState().addKOMatch({ round: 'QF', teamA: 't1', teamB: 't2' })

      const state = useKnockoutStore.getState()
      expect(state.step).toBe(3)
      expect(state.knockoutMatches).toHaveLength(1)
      expect(state.knockoutMatches[0].teamA).toBe('t1')
      expect(state.knockoutMatches[0].teamB).toBe('t2')
      expect(state.knockoutMatches[0].status).toBe('scheduled')
    })

    it('should default round to QF when not explicitly specified', async () => {
      await useKnockoutStore.getState().addKOMatch({ teamA: 't1', teamB: 't2' })
      const match = useKnockoutStore.getState().knockoutMatches[0]
      expect(match.round).toBe('QF')
    })
  })

  describe('updateKOMatch', () => {
    it('should update teams and schedule fields on a match by id', async () => {
      await useKnockoutStore.getState().addKOMatch({ round: 'QF', teamA: 't1', teamB: 't2' })
      const matchId = useKnockoutStore.getState().knockoutMatches[0].id

      await useKnockoutStore.getState().updateKOMatch(matchId, { teamB: 't3', venue: 'Stadium A' })

      const match = useKnockoutStore.getState().knockoutMatches[0]
      expect(match.teamB).toBe('t3')
      expect(match.venue).toBe('Stadium A')
      expect(match.teamA).toBe('t1')
    })
  })

  describe('deleteKOMatch', () => {
    it('should remove a knockout match by id', async () => {
      await useKnockoutStore.getState().addKOMatch({ round: 'QF', teamA: 't1', teamB: 't2' })
      await useKnockoutStore.getState().addKOMatch({ round: 'QF', teamA: 't3', teamB: 't4' })
      const matchId = useKnockoutStore.getState().knockoutMatches[0].id

      await useKnockoutStore.getState().deleteKOMatch(matchId)

      const matches = useKnockoutStore.getState().knockoutMatches
      expect(matches).toHaveLength(1)
      expect(matches[0].teamA).toBe('t3')
    })
  })

  describe('postpone & restore', () => {
    it('should postpone a match (status → postponed, result cleared) and restore it back to scheduled', async () => {
      await useKnockoutStore.getState().addKOMatch({ round: 'QF', teamA: 't1', teamB: 't2' })
      const matchId = useKnockoutStore.getState().knockoutMatches[0].id

      await useKnockoutStore.getState().postponeKOMatch(matchId)
      let match = useKnockoutStore.getState().knockoutMatches[0]
      expect(match.status).toBe('postponed')
      expect(match.result).toBeNull()

      await useKnockoutStore.getState().restoreKOMatch(matchId)
      match = useKnockoutStore.getState().knockoutMatches[0]
      expect(match.status).toBe('scheduled')
      expect(match.result).toBeNull()
    })
  })

  describe('saveKOResult', () => {
    it('should mark a match as completed and record scorers, yellow cards, and red cards', async () => {
      await useKnockoutStore.getState().addKOMatch({ round: 'QF', teamA: 't1', teamB: 't2' })
      const matchId = useKnockoutStore.getState().knockoutMatches[0].id

      await useKnockoutStore.getState().saveKOResult(matchId, {
        scoreA: 2,
        scoreB: 1,
        scorers: [
          { player: 'Messi', teamId: 't1' },
          { player: 'Ronaldo', teamId: 't2' },
        ],
        yellowCards: [{ player: 'Pique', teamId: 't1' }],
        redCards: [],
        penaltyWinner: null,
      })

      const match = useKnockoutStore.getState().knockoutMatches[0]
      expect(match.status).toBe('completed')
      expect(match.result.scoreA).toBe(2)
      expect(match.result.scoreB).toBe(1)
      expect(match.result.scorers).toHaveLength(2)
      expect(match.result.yellowCards).toHaveLength(1)
    })

    it('should auto-create semi-final matches (SF1: W_QF1 vs W_QF4, SF2: W_QF2 vs W_QF3) when all 4 quarter-finals are completed', async () => {
      const store = useKnockoutStore.getState()
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 1', teamA: 't1', teamB: 't8' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 2', teamA: 't2', teamB: 't7' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 3', teamA: 't3', teamB: 't6' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 4', teamA: 't4', teamB: 't5' })

      const qfIds = useKnockoutStore.getState().knockoutMatches.map((m) => m.id)
      for (const id of qfIds) {
        await useKnockoutStore.getState().saveKOResult(id, { scoreA: 2, scoreB: 0, scorers: [] })
      }

      const sfMatches = useKnockoutStore
        .getState()
        .knockoutMatches.filter((m) => m.round === 'SF')
        .sort((a, b) => a.matchLabel.localeCompare(b.matchLabel))

      expect(sfMatches).toHaveLength(2)
      expect(sfMatches[0].teamA).toBe('t1')
      expect(sfMatches[0].teamB).toBe('t4')
      expect(sfMatches[1].teamA).toBe('t2')
      expect(sfMatches[1].teamB).toBe('t3')
    })

    it('should auto-create the final match when both semi-finals are completed', async () => {
      const store = useKnockoutStore.getState()
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 1', teamA: 't1', teamB: 't8' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 2', teamA: 't2', teamB: 't7' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 3', teamA: 't3', teamB: 't6' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 4', teamA: 't4', teamB: 't5' })

      const qfIds = useKnockoutStore.getState().knockoutMatches.map((m) => m.id)
      for (const id of qfIds) {
        await useKnockoutStore.getState().saveKOResult(id, { scoreA: 2, scoreB: 0, scorers: [] })
      }

      const sfIds = useKnockoutStore
        .getState()
        .knockoutMatches.filter((m) => m.round === 'SF')
        .map((m) => m.id)

      for (const id of sfIds) {
        await useKnockoutStore.getState().saveKOResult(id, { scoreA: 1, scoreB: 0, scorers: [] })
      }

      const finalMatches = useKnockoutStore
        .getState()
        .knockoutMatches.filter((m) => m.round === 'F')

      expect(finalMatches).toHaveLength(1)
    })

    it('should set the champion when the final match is completed', async () => {
      const store = useKnockoutStore.getState()
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 1', teamA: 't1', teamB: 't8' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 2', teamA: 't2', teamB: 't7' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 3', teamA: 't3', teamB: 't6' })
      await store.addKOMatch({ round: 'QF', matchLabel: 'QF 4', teamA: 't4', teamB: 't5' })

      const qfIds = useKnockoutStore.getState().knockoutMatches.map((m) => m.id)
      for (const id of qfIds) {
        await useKnockoutStore.getState().saveKOResult(id, { scoreA: 2, scoreB: 0, scorers: [] })
      }

      const sfIds = useKnockoutStore
        .getState()
        .knockoutMatches.filter((m) => m.round === 'SF')
        .map((m) => m.id)
      for (const id of sfIds) {
        await useKnockoutStore.getState().saveKOResult(id, { scoreA: 1, scoreB: 0, scorers: [] })
      }

      const finalId = useKnockoutStore
        .getState()
        .knockoutMatches.find((m) => m.round === 'F').id

      await useKnockoutStore.getState().saveKOResult(finalId, { scoreA: 3, scoreB: 1, scorers: [] })

      expect(useKnockoutStore.getState().champion).toBe('t1')
    })
  })
})