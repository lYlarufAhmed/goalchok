import { initializeApp } from 'firebase/app'
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  connectFirestoreEmulator 
} from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBi80z2Z5QHu_3OeaJepUnpM_Ec-Ri1fEs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "goalchok-7391.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://goalchok-7391-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "goalchok-7391",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "goalchok-7391.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "110436053740",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:110436053740:web:668a4c9a4ff3a74c776bc9"
}; 

const app = initializeApp(firebaseConfig)

import { getFirestore } from 'firebase/firestore'

// Disable offline persistence for now so you don't see cached emulator data
export const db = getFirestore(app)

export const rtdb = getDatabase(app)

// Connect to emulators locally during development & testing
// Disabled for production - set VITE_USE_EMULATORS=true in .env.local to enable for local dev
const useEmulators = false
if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8085)
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9000)
}

export default app
