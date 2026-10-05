import { create } from 'zustand'
import { auth } from '../config/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

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
      set({ isAuthenticated: true, user: userCredential.user })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  logout: async () => {
    try {
      await signOut(auth)
      set({ isAuthenticated: false, user: null })
    } catch (error) {
      console.error("Logout error", error)
    }
  },
}))
