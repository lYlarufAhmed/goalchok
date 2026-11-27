import { create } from 'zustand'
import { auth } from '../config/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// The Admin Claim (CONTEXT.md): the only claim that authorizes writes.
// Mirrors PRIVILEGED_ROLE in functions/claims.js.
export const ADMIN_ROLE = 'admin'

/** Whether a set of verified custom claims carries the Admin Claim. */
export function isAdminClaims(claims) {
  return claims?.role === ADMIN_ROLE
}

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  claims: null,
  loading: true,
  
  initialize: () => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idTokenResult = await user.getIdTokenResult()
        set({ 
          isAuthenticated: true, 
          user, 
          claims: idTokenResult.claims,
          loading: false 
        })
      } else {
        set({ 
          isAuthenticated: false, 
          user: null, 
          claims: null,
          loading: false 
        })
      }
    })
  },

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const { claims } = await userCredential.user.getIdTokenResult()
      // Accounts without the Admin Claim can't use the admin area: sign them
      // straight back out rather than showing a shell whose writes all fail.
      if (!isAdminClaims(claims)) {
        await signOut(auth)
        set({ isAuthenticated: false, user: null, claims: null })
        return { success: false, code: 'not-admin' }
      }
      set({ isAuthenticated: true, user: userCredential.user, claims })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  logout: async () => {
    try {
      await signOut(auth)
      set({ isAuthenticated: false, user: null, claims: null })
    } catch (error) {
      console.error("Logout error", error)
    }
  },
}))
