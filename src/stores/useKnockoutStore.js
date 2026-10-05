import { create } from 'zustand'
import { generateQFPairings, isGroupStageComplete, getQualifiedTeams } from '../utils/knockoutUtils'
import { TournamentEngine } from '../domain/tournamentEngine'
import { MatchLifecycleService } from '../domain/matchLifecycleService'
import * as knockoutService from '../services/knockoutService'
import { resolveCurrentTenant } from '../services/tenantContext'

const lifecycleService = new MatchLifecycleService()
// Current tenant at call time, as positional (orgId, tournamentId) args —
// resolves the signed-in org claim, falling back to the shared default
// (which carries no authorization).
const tenant = () => {
  const { orgId, tournamentId } = resolveCurrentTenant()
  return [orgId, tournamentId]
}
import {
  setLiveMatch,
  clearLiveMatch,
  updateLiveScore as updateLiveScoreRtdb,
} from '../services/liveMatchService'

const getIsTest = () => {
  return typeof globalThis !== 'undefined' && (
    globalThis.__vitest_environment__ || 
    typeof globalThis.vi !== 'undefined' || 
    globalThis.process?.env?.NODE_ENV === 'test'
  ) && !globalThis.__RUN_INTEGRATION_TESTS__
}

const saveSettingsToFirestore = async (state) => {
  if (getIsTest()) return
  try {
    await knockoutService.saveKnockoutState(...tenant(), state)
  } catch (err) {
    console.error('[KnockoutStore] save settings error:', err)
  }
}

/**
 * Zustand store for the Knockout Stage.
 */
export const useKnockoutStore = create((set, get) => {
  const setAndSyncSettings = (updater) => {
    set(updater)
    saveSettingsToFirestore(get())
  }

  return {
    step: 3,
    qualifiedTeams: [],
    knockoutMatches: [],
    champion: null,
    unsub: null,
    loading: false,
    error: null,

    // ─── Realtime Firebase Sync for Settings & Initial Fetch ──────────
    listenToFirestore: async () => {
      if (getIsTest()) return
      if (get().unsub) return

      try {
        set({ loading: true })
        const { orgId, tournamentId } = resolveCurrentTenant()
        const matches = await knockoutService.fetchKnockoutMatches(orgId, tournamentId)
        set({ knockoutMatches: matches, loading: false })
      } catch (err) {
        console.error('[KnockoutStore] fetch matches error:', err)
        set({ loading: false, error: err.message })
      }

      const { orgId, tournamentId } = resolveCurrentTenant()
      const unsub = knockoutService.subscribeKnockoutState(
        orgId,
        tournamentId,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            const updates = {
              step: data.step ?? 3,
              qualifiedTeams: data.qualifiedTeams || [],
              champion: data.champion || null,
            }
            if (data.knockoutMatches) {
              updates.knockoutMatches = data.knockoutMatches
            }
            set(updates)
          }
        },
        (err) => {
          console.error('[KnockoutStore] listen settings error:', err)
        }
      )
      set({ unsub })
    },

    cleanup: () => {
      const { unsub } = get()
      if (unsub) {
        unsub()
        set({ unsub: null })
      }
    },

    // ─── Step management ──────────────────────────────────────────────

    initKnockout: async (qualifiedTeams) => {
      setAndSyncSettings({
        step: 1,
        qualifiedTeams,
        champion: null,
      })
      await knockoutService.clearKnockoutMatches(...tenant())
      set({ knockoutMatches: [] })
    },

    replaceQualifiedTeam: (index, teamData) => {
      setAndSyncSettings((state) => {
        const updated = state.qualifiedTeams.map((t, i) => {
          if (i === index) {
            return { ...t, ...teamData, seed: t.seed }
          }
          if (teamData.teamId && t.teamId === teamData.teamId) {
            return {
              ...t,
              teamId: null,
              name: '',
              logo: null,
              color: null,
              group: '',
              pts: 0,
              gd: 0,
              gf: 0,
              qualifyType: 'manual',
            }
          }
          return t
        })
        return { qualifiedTeams: updated }
      })
    },

    goToStep2: () => {
      const { qualifiedTeams } = get()
      const qfMatches = generateQFPairings(qualifiedTeams)
      set({ step: 2, knockoutMatches: qfMatches })
      saveSettingsToFirestore(get())
    },

    goToStep1: () => setAndSyncSettings({ step: 1 }),

    updatePreConfirmMatch: (id, changes) => {
      set((state) => ({
        knockoutMatches: state.knockoutMatches.map((m) =>
          m.id === id ? { ...m, ...changes } : m
        ),
      }))
    },

    confirmBracket: async () => {
      const { knockoutMatches } = get()
      setAndSyncSettings({ step: 3 })
      try {
        await knockoutService.syncKnockoutMatches(...tenant(), knockoutMatches)
      } catch (err) {
        console.error('[KnockoutStore] confirmBracket error:', err)
        set({ error: err.message })
      }
    },

    resetKnockout: async () => {
      setAndSyncSettings({
        step: 3,
        qualifiedTeams: [],
        champion: null,
      })
      try {
        await knockoutService.clearKnockoutMatches(...tenant())
        set({ knockoutMatches: [] })
      } catch (err) {
        console.error('[KnockoutStore] resetKnockout error:', err)
      }
    },

    // ─── Match operations (step 3) ────────────────────────────────────

    updateKOMatchSchedule: async (id, { date, time, venue }) => {
      try {
        const updates = { date, time, venue: (venue || '').trim() }
        await knockoutService.updateKnockoutMatch(...tenant(), id, updates)
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] updateKOMatchSchedule error:', err)
      }
    },

    updateKOMatch: async (id, changes) => {
      try {
        await knockoutService.updateKnockoutMatch(...tenant(), id, changes)
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, ...changes } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] updateKOMatch error:', err)
      }
    },

    setKOMatchLive: async (id) => {
      try {
        const match = get().knockoutMatches.find((m) => m.id === id)
        const updatedMatch = lifecycleService.startMatch(match || { id, status: 'scheduled' })
        await knockoutService.updateKnockoutMatch(...tenant(), id, { status: 'live', result: updatedMatch.result })
        await setLiveMatch(id, { scoreA: 0, scoreB: 0, status: 'live', events: [] })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, ...updatedMatch } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] setKOMatchLive error:', err)
      }
    },

    updateKOLiveScore: async (id, { scoreA, scoreB }) => {
      try {
        const match = get().knockoutMatches.find((m) => m.id === id)
        const updatedMatch = lifecycleService.updateLiveScore(
          match || { id, status: 'live', result: { scoreA: 0, scoreB: 0 } },
          { scoreA, scoreB }
        )
        await updateLiveScoreRtdb(id, updatedMatch.result.scoreA, updatedMatch.result.scoreB, [])
        await knockoutService.updateKnockoutMatch(...tenant(), id, { status: 'live', result: updatedMatch.result })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, result: updatedMatch.result } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] updateKOLiveScore error:', err)
      }
    },

    postponeKOMatch: async (id) => {
      try {
        const match = get().knockoutMatches.find((m) => m.id === id)
        const updatedMatch = lifecycleService.postponeMatch(match || { id, status: 'scheduled' })
        await knockoutService.updateKnockoutMatch(...tenant(), id, { status: 'postponed', result: null })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, ...updatedMatch } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] postponeKOMatch error:', err)
      }
    },

    restoreKOMatch: async (id) => {
      try {
        const match = get().knockoutMatches.find((m) => m.id === id)
        const updatedMatch = lifecycleService.resetMatch(match || { id, status: 'postponed' })
        await knockoutService.updateKnockoutMatch(...tenant(), id, { status: 'scheduled', result: null })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, ...updatedMatch } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] restoreKOMatch error:', err)
      }
    },

    saveKOResult: async (id, result) => {
      try {
        const match = get().knockoutMatches.find((m) => m.id === id)
        const updatedMatch = lifecycleService.completeMatch(
          match || { id, status: 'scheduled' },
          result,
          { isKnockout: true }
        )
        const updatedResult = updatedMatch.result

        await knockoutService.updateKnockoutMatch(...tenant(), id, { status: 'completed', result: updatedResult })
        await clearLiveMatch(id).catch(() => {})

        let nextMatches = get().knockoutMatches.map((m) =>
          m.id === id ? { ...m, status: 'completed', result: updatedResult } : m
        )
        let champion = get().champion

        const engine = new TournamentEngine([], [], nextMatches)
        const { newMatches, champion: evaluatedChampion } = engine.evaluateKnockoutProgression()

        for (const nm of newMatches) {
          await knockoutService.createKnockoutMatch(...tenant(), nm)
        }
        if (newMatches.length > 0) {
          nextMatches = [...nextMatches, ...newMatches]
        }
        if (evaluatedChampion) {
          champion = evaluatedChampion
          saveSettingsToFirestore({ step: get().step, qualifiedTeams: get().qualifiedTeams, champion })
        }

        set({ knockoutMatches: nextMatches, champion })
      } catch (err) {
        console.error('[KnockoutStore] saveKOResult error:', err)
      }
    },

    addKOMatch: async (matchData) => {
      try {
        const newMatch = await knockoutService.createKnockoutMatch(...tenant(), {
          round: matchData.round || 'QF',
          matchLabel: matchData.matchLabel || matchData.round || 'QF',
          teamA: matchData.teamA || '',
          teamB: matchData.teamB || '',
          date: matchData.date || '',
          time: matchData.time || '',
          venue: matchData.venue || '',
          status: 'scheduled',
          result: null,
        })
        set((state) => ({
          knockoutMatches: [...state.knockoutMatches, newMatch],
          step: 3,
        }))
        saveSettingsToFirestore(get())
      } catch (err) {
        console.error('[KnockoutStore] addKOMatch error:', err)
      }
    },

    deleteKOMatch: async (id) => {
      try {
        await knockoutService.deleteKnockoutMatch(...tenant(), id)
        set((state) => ({
          knockoutMatches: state.knockoutMatches.filter((m) => m.id !== id),
        }))
      } catch (err) {
        console.error('[KnockoutStore] deleteKOMatch error:', err)
      }
    },

    autoGenerateFromGroups: async (allTeams, groupMatches) => {
      try {
        // Check if group stage is complete
        if (!isGroupStageComplete(allTeams, groupMatches)) {
          console.warn('[KnockoutStore] Group stage not complete')
          return { success: false, message: 'Group stage must be completed first' }
        }

        // Get qualified teams from standings
        const qualifiedTeams = getQualifiedTeams(allTeams, groupMatches)
        
        // Generate QF pairings
        const qfMatches = generateQFPairings(qualifiedTeams)
        
        // Clear existing knockout matches and create new ones
        await knockoutService.clearKnockoutMatches(...tenant())
        
        for (const match of qfMatches) {
          await knockoutService.createKnockoutMatch(...tenant(), match)
        }
        
        // Update store
        setAndSyncSettings({
          step: 3,
          qualifiedTeams,
          champion: null,
        })
        
        set({ knockoutMatches: qfMatches })
        
        console.log('[KnockoutStore] Generated QF from group standings')
        return { success: true, message: 'Quarter-Finals generated from group standings' }
      } catch (err) {
        console.error('[KnockoutStore] autoGenerateFromGroups error:', err)
        return { success: false, message: 'Failed to generate from groups' }
      }
    },

  }
})
