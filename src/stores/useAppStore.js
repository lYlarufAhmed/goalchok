import { create } from 'zustand'
import { onSnapshot } from 'firebase/firestore'
import { updateSettings } from '../services/settingsService'
import { getTenantDoc, resolveCurrentTenant } from '../services/tenantContext'

const DOC_ID = 'config'

// Positional (orgId, tournamentId) args resolved at call time.
const tenant = () => {
  const { orgId, tournamentId } = resolveCurrentTenant()
  return [orgId, tournamentId]
}

export const useAppStore = create((set, get) => {
  return {
    theme: 'dark', // 'dark' | 'light'
    language: 'en', // 'ar' | 'en'
    unsub: null,

    // ─── Realtime Firebase Sync ───────────────────────────────────────
    // The tournament settings document is tenant-scoped; the tenant is
    // resolved once at subscribe time (theme/language sync predates multi-org
    // switching — re-resolve when org switching lands).
    listenToFirestore: () => {
      if (get().unsub) return

      const { orgId, tournamentId } = resolveCurrentTenant()
      const unsub = onSnapshot(
        getTenantDoc(orgId, tournamentId, 'settings', DOC_ID),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            set({
              theme: data.theme || 'dark',
              language: data.language || 'en',
            })
          }
        },
        (err) => {
          console.error('[AppStore] listen error:', err)
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

    setTheme: async (theme) => {
      set({ theme })
      await updateSettings(...tenant(), { theme })
    },

    setLanguage: async (language) => {
      set({ language })
      await updateSettings(...tenant(), { language })
    },

    toggleTheme: async () => {
      const newTheme = get().theme === 'dark' ? 'light' : 'dark'
      set({ theme: newTheme })
      await updateSettings(...tenant(), { theme: newTheme })
    },

    toggleLanguage: async () => {
      const newLanguage = get().language === 'ar' ? 'en' : 'ar'
      set({ language: newLanguage })
      await updateSettings(...tenant(), { language: newLanguage })
    },
  }
})
