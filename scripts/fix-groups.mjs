import { config } from 'dotenv'
config()
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDocs, collection, updateDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBi80z2Z5QHu_3OeaJepUnpM_Ec-Ri1fEs',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'goalchok-7391.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'goalchok-7391',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://goalchok-7391-default-rtdb.firebaseio.com',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'goalchok-7391.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '110436053740',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:110436053740:web:668a4c9a4ff3a74c776bc9',
})

const db = getFirestore(app)

const groupMap = { أ: 'A', ب: 'B', ج: 'C' }

async function main() {
  // Fix team groups
  const teamFix = {
    '26b2acf4-b751-4b9f-925f-62fe573ad735': 'A',
    '66e54040-73f8-4d2b-b959-667604b23846': 'A',
    'df9a8c72-4304-4c61-bc23-650a20cac602': 'A',
    '1eb4c3e8-0010-47d4-ab23-7ba78bb92a66': 'A',
    'b679055d-9290-46f2-8fb5-3e4917b5667c': 'B',
    '68d2ed29-1a6d-4e2b-a4b1-cc6daa09a6c3': 'B',
    '796c4b79-59e3-4f51-9b1c-fc330687913b': 'B',
    '112cfb4e-a216-4c70-adf5-a72d8a9d407a': 'B',
    'b9238264-9ce2-4c58-9ac5-d14d55acf784': 'C',
    '3e4cdd05-8fd0-4ea8-aea9-170e6586d1e1': 'C',
    'b78b0335-f9fb-4430-86da-ac178048ba0e': 'C',
    'c6b09d68-93de-4717-b9ce-79a89933182a': 'C',
  }

  await Promise.all(Object.entries(teamFix).map(([id, g]) => updateDoc(doc(db, 'teams', id), { group: g })))
  console.log('Teams: groups fixed')

  // Fix match groups
  const snap = await getDocs(collection(db, 'matches'))
  const matchFixes = []
  for (const d of snap.docs) {
    const data = d.data()
    const newGroup = groupMap[data.group]
    if (newGroup) matchFixes.push(updateDoc(doc(db, 'matches', d.id), { group: newGroup }))
  }
  if (matchFixes.length > 0) {
    await Promise.all(matchFixes)
    console.log(`Matches: ${matchFixes.length} groups fixed`)
  } else {
    console.log('Matches: no groups to fix')
  }

  console.log('Done!')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
