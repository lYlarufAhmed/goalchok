import { create } from 'zustand'
import { generateQFPairings, getKnockoutWinner, generateKoId, isGroupStageComplete, getQualifiedTeams } from '../utils/knockoutUtils'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import * as knockoutService from '../services/knockoutService'
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
    await setDoc(doc(db, 'settings', 'knockout'), {
      step: state.step,
      qualifiedTeams: state.qualifiedTeams,
      champion: state.champion,
    })
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
        const matches = await knockoutService.fetchKnockoutMatches()
        set({ knockoutMatches: matches, loading: false })
      } catch (err) {
        console.error('[KnockoutStore] fetch matches error:', err)
        set({ loading: false, error: err.message })
      }

      const unsub = onSnapshot(
        doc(db, 'settings', 'knockout'),
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
      await knockoutService.clearKnockoutMatches()
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
        await knockoutService.syncKnockoutMatches(knockoutMatches)
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
        await knockoutService.clearKnockoutMatches()
        set({ knockoutMatches: [] })
      } catch (err) {
        console.error('[KnockoutStore] resetKnockout error:', err)
      }
    },

    // ─── Match operations (step 3) ────────────────────────────────────

    updateKOMatchSchedule: async (id, { date, time, venue }) => {
      try {
        const updates = { date, time, venue: (venue || '').trim() }
        await knockoutService.updateKnockoutMatch(id, updates)
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
        await knockoutService.updateKnockoutMatch(id, changes)
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
        const initialResult = {
          scoreA: 0,
          scoreB: 0,
          penaltyWinner: null,
          scorers: [],
          yellowCards: [],
          redCards: [],
        }
        await knockoutService.updateKnockoutMatch(id, { status: 'live', result: initialResult })
        await setLiveMatch(id, { scoreA: 0, scoreB: 0, status: 'live', events: [] })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, status: 'live', result: initialResult } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] setKOMatchLive error:', err)
      }
    },

    updateKOLiveScore: async (id, { scoreA, scoreB }) => {
      try {
        const match = get().knockoutMatches.find((m) => m.id === id)
        const updatedResult = {
          ...(match?.result || {}),
          scoreA: Number(scoreA) || 0,
          scoreB: Number(scoreB) || 0,
        }
        await updateLiveScoreRtdb(id, updatedResult.scoreA, updatedResult.scoreB, [])
        await knockoutService.updateKnockoutMatch(id, { status: 'live', result: updatedResult })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, status: 'live', result: updatedResult } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] updateKOLiveScore error:', err)
      }
    },

    postponeKOMatch: async (id) => {
      try {
        await knockoutService.updateKnockoutMatch(id, { status: 'postponed', result: null })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, status: 'postponed', result: null } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] postponeKOMatch error:', err)
      }
    },

    restoreKOMatch: async (id) => {
      try {
        await knockoutService.updateKnockoutMatch(id, { status: 'scheduled', result: null })
        set((state) => ({
          knockoutMatches: state.knockoutMatches.map((m) =>
            m.id === id ? { ...m, status: 'scheduled', result: null } : m
          ),
        }))
      } catch (err) {
        console.error('[KnockoutStore] restoreKOMatch error:', err)
      }
    },

    saveKOResult: async (id, result) => {
      try {
        const updatedResult = {
          scoreA: Number(result.scoreA) || 0,
          scoreB: Number(result.scoreB) || 0,
          penaltyWinner: result.penaltyWinner || null,
          scorers: result.scorers || [],
          yellowCards: result.yellowCards || [],
          redCards: result.redCards || [],
        }

        await knockoutService.updateKnockoutMatch(id, { status: 'completed', result: updatedResult })
        await clearLiveMatch(id).catch(() => {})

        let nextMatches = get().knockoutMatches.map((m) =>
          m.id === id ? { ...m, status: 'completed', result: updatedResult } : m
        )
        let champion = get().champion

        const qfMatches = nextMatches.filter((m) => m.round === 'QF')
        const sfMatches = nextMatches.filter((m) => m.round === 'SF')

        if (
          qfMatches.length === 4 &&
          qfMatches.every((m) => m.status === 'completed') &&
          sfMatches.length === 0
        ) {
          const qfWinners = qfMatches
            .sort((a, b) => a.matchLabel.localeCompare(b.matchLabel))
            .map((m) => getKnockoutWinner(m))

          if (qfWinners.every(Boolean)) {
            const newSf1 = {
              id: generateKoId(),
              round: 'SF',
              matchLabel: 'SF 1',
              teamA: qfWinners[0],
              teamB: qfWinners[3],
              date: '', time: '', venue: '',
              status: 'scheduled', result: null,
            }
            const newSf2 = {
              id: generateKoId(),
              round: 'SF',
              matchLabel: 'SF 2',
              teamA: qfWinners[1],
              teamB: qfWinners[2],
              date: '', time: '', venue: '',
              status: 'scheduled', result: null,
            }
            await knockoutService.createKnockoutMatch(newSf1)
            await knockoutService.createKnockoutMatch(newSf2)
            nextMatches = [...nextMatches, newSf1, newSf2]
          }
        }

        const updatedSFs = nextMatches.filter((m) => m.round === 'SF')
        const finalMatches = nextMatches.filter((m) => m.round === 'F')

        if (
          updatedSFs.length === 2 &&
          updatedSFs.every((m) => m.status === 'completed') &&
          finalMatches.length === 0
        ) {
          const sfWinners = updatedSFs
            .sort((a, b) => a.matchLabel.localeCompare(b.matchLabel))
            .map((m) => getKnockoutWinner(m))

          if (sfWinners.every(Boolean)) {
            const newFinal = {
              id: generateKoId(),
              round: 'F',
              matchLabel: 'النهائي',
              teamA: sfWinners[0],
              teamB: sfWinners[1],
              date: '', time: '', venue: '',
              status: 'scheduled', result: null,
            }
            await knockoutService.createKnockoutMatch(newFinal)
            nextMatches = [...nextMatches, newFinal]
          }
        }

        const updatedFinals = nextMatches.filter((m) => m.round === 'F')
        if (updatedFinals.length === 1 && updatedFinals[0].status === 'completed') {
          champion = getKnockoutWinner(updatedFinals[0])
          saveSettingsToFirestore({ step: get().step, qualifiedTeams: get().qualifiedTeams, champion })
        }

        set({ knockoutMatches: nextMatches, champion })
      } catch (err) {
        console.error('[KnockoutStore] saveKOResult error:', err)
      }
    },

    addKOMatch: async (matchData) => {
      try {
        const newMatch = await knockoutService.createKnockoutMatch({
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
        await knockoutService.deleteKnockoutMatch(id)
        set((state) => ({
          knockoutMatches: state.knockoutMatches.filter((m) => m.id !== id),
        }))
      } catch (err) {
        console.error('[KnockoutStore] deleteKOMatch error:', err)
      }
    },

    autoGenerateNextRound: async () => {
      try {
        const currentMatches = get().knockoutMatches
        const qfMatches = currentMatches.filter(m => m.round === 'QF')
        const sfMatches = currentMatches.filter(m => m.round === 'SF')
        const finalMatches = currentMatches.filter(m => m.round === 'F')

        // Generate SF if all QF are completed and no SF exist
        if (qfMatches.length === 4 && qfMatches.every(m => m.status === 'completed') && sfMatches.length === 0) {
          const qfWinners = qfMatches
            .sort((a, b) => (a.matchLabel || '').localeCompare(b.matchLabel || ''))
            .map(m => getKnockoutWinner(m))

          if (qfWinners.every(Boolean)) {
            const newSf1 = {
              id: generateKoId(),
              round: 'SF',
              matchLabel: 'SF 1',
              teamA: qfWinners[0],
              teamB: qfWinners[3],
              date: '', time: '', venue: 'ملاعب فيا',
              status: 'scheduled', result: null,
            }
            const newSf2 = {
              id: generateKoId(),
              round: 'SF',
              matchLabel: 'SF 2',
              teamA: qfWinners[1],
              teamB: qfWinners[2],
              date: '', time: '', venue: 'ملاعب فيا',
              status: 'scheduled', result: null,
            }
            await knockoutService.createKnockoutMatch(newSf1)
            await knockoutService.createKnockoutMatch(newSf2)
            set((state) => ({
              knockoutMatches: [...state.knockoutMatches, newSf1, newSf2],
            }))
            console.log('[KnockoutStore] Generated Semi-Finals')
            return true
          } else {
            console.warn('[KnockoutStore] Cannot generate SF - some QF matches have no clear winner')
            return false
          }
        }
        // Generate Final if all SF are completed and no Final exist
        else if (sfMatches.length === 2 && sfMatches.every(m => m.status === 'completed') && finalMatches.length === 0) {
          const sfWinners = sfMatches
            .sort((a, b) => (a.matchLabel || '').localeCompare(b.matchLabel || ''))
            .map(m => getKnockoutWinner(m))

          if (sfWinners.every(Boolean)) {
            const newFinal = {
              id: generateKoId(),
              round: 'F',
              matchLabel: 'النهائي',
              teamA: sfWinners[0],
              teamB: sfWinners[1],
              date: '', time: '', venue: 'ملاعب فيا',
              status: 'scheduled', result: null,
            }
            await knockoutService.createKnockoutMatch(newFinal)
            set((state) => ({
              knockoutMatches: [...state.knockoutMatches, newFinal],
            }))
            console.log('[KnockoutStore] Generated Final')
            return true
          } else {
            console.warn('[KnockoutStore] Cannot generate Final - some SF matches have no clear winner')
            return false
          }
        } else {
          // Provide feedback about why generation didn't happen
          if (qfMatches.length < 4) {
            console.warn('[KnockoutStore] Cannot generate - need 4 QF matches first')
          } else if (!qfMatches.every(m => m.status === 'completed')) {
            console.warn('[KnockoutStore] Cannot generate SF - all QF matches must be completed first')
          } else if (sfMatches.length > 0) {
            console.warn('[KnockoutStore] SF already exists')
          } else if (sfMatches.length < 2) {
            console.warn('[KnockoutStore] Cannot generate Final - need 2 SF matches first')
          } else if (!sfMatches.every(m => m.status === 'completed')) {
            console.warn('[KnockoutStore] Cannot generate Final - all SF matches must be completed first')
          } else if (finalMatches.length > 0) {
            console.warn('[KnockoutStore] Final already exists')
          }
          return false
        }
      } catch (err) {
        console.error('[KnockoutStore] autoGenerateNextRound error:', err)
        return false
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
        await knockoutService.clearKnockoutMatches()
        
        for (const match of qfMatches) {
          await knockoutService.createKnockoutMatch(match)
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
