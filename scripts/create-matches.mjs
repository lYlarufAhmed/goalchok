/**
 * Create matches, score them, and simulate tournament outcomes with real Bangladesh Football Clubs.
 */
import { config } from 'dotenv'
config()
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc, writeBatch, updateDoc as upd } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBi80z2Z5QHu_3OeaJepUnpM_Ec-Ri1fEs',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'goalchok-7391.firebaseapp.com',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://goalchok-7391-default-rtdb.firebaseio.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'goalchok-7391',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'goalchok-7391.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '110436053740',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:110436053740:web:668a4c9a4ff3a74c776bc9'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const teamIds = {
  'Bashundhara Kings': '26b2acf4-b751-4b9f-925f-62fe573ad735',
  'Abahani Limited Dhaka': '66e54040-73f8-4d2b-b959-667604b23846',
  'Mohammedan SC': 'df9a8c72-4304-4c61-bc23-650a20cac602',
  'Bangladesh Police FC': '1eb4c3e8-0010-47d4-ab23-7ba78bb92a66',
  'Brothers Union': 'b679055d-9290-46f2-8fb5-3e4917b5667c',
  'Chittagong Abahani': '68d2ed29-1a6d-4e2b-a4b1-cc6daa09a6c3',
  'Dhaka Wanderers': '796c4b79-59e3-4f51-9b1c-fc330687913b',
  'Fakirerpool YMC': '112cfb4e-a216-4c70-adf5-a72d8a9d407a',
  'Fortis FC': 'b9238264-9ce2-4c58-9ac5-d14d55acf784',
  'Rahmatganj MFS': '3e4cdd05-8fd0-4ea8-aea9-170e6586d1e1',
  'Wari Club': 'b78b0335-f9fb-4430-86da-ac178048ba0e',
  'Arambagh KS': 'c6b09d68-93de-4717-b9ce-79a89933182a',
}

const playerNames = {
  'Bashundhara Kings': [
    'Shekh Morsalin', 'Rakib Hossain', 'Topu Barman', 'Anisur Rahman Zico',
    'Saad Uddin', 'Sohel Rana', 'Tariq Kazi', 'Robinho',
    'Miguel Figueira', 'Boburbek Yuldashev', 'Mojibor Rahman Jony'
  ],
  'Abahani Limited Dhaka': [
    'Jamal Bhuyan', 'Foysal Ahmed Fahim', 'Mohammad Ridoy', 'Rahmat Mia',
    'Mehedi Hasan Royal', 'Shakil Ahad', 'Emeka Ogbugh', 'Cornelius Stewart',
    'Jonathan David', 'Alamgir Kabir Rana', 'Shahidul Alam Sohel'
  ],
  'Mohammedan SC': [
    'Souleymane Diabate', 'Muzaffar Muzaffarov', 'Emmanuel Tony', 'Jafar Iqbal',
    'Shakil Hossain', 'Shahriar Emon', 'Minhajur Rahman', 'Sazzad Hossain',
    'Ashraful Islam Rana', 'Kamrul Islam', 'Arifur Rahman'
  ],
  'Bangladesh Police FC': [
    'Rabiul Hasan', 'Edward Morillo', 'Mateo Palacios', 'Joyonto Kumar Roy',
    'Al-Amin', 'Monaem Khan Raju', 'Isa Faysal', 'Sokhib Hamidov',
    'Emon Babu', 'Ahsan Habib Bipul', 'Mahfuz Hasan'
  ],
  'Brothers Union': [
    'Bunyod Shodiev', 'Patrick Sylva', 'Otabek Valijonov', 'Jewel Rana',
    'Ariful Islam', 'Masud Rana', 'Sabbir Hossain', 'Mohsin Ali',
    'Sujon Hossain', 'Biplob Bhattacharjee', 'Yousuf Ali'
  ],
  'Chittagong Abahani': [
    'Shokhrukhbek Kholmatov', 'David Ifegwu', 'Pulatov', 'Sohel Rana Jr.',
    'Mannaf Rabby', 'Koushik Barua', 'Nasirul Islam', 'Saiful Islam',
    'Mohammad Rocky', 'Ashraful Islam', 'Limon Hossain'
  ],
  'Dhaka Wanderers': [
    'Sourav', 'Pappu', 'Monir Hossain', 'Rony',
    'Akash', 'Imran', 'Sajib', 'Mithun',
    'Farhad', 'Shimul', 'Al-Amin'
  ],
  'Fakirerpool YMC': [
    'Russel', 'Monir', 'Shaheen', 'Ripon',
    'Khorshed', 'Babu', 'Jahid', 'Biplob',
    'Al-Amin', 'Shakil', 'Rana'
  ],
  'Fortis FC': [
    'Valeriy Gryshyn', 'Pa Omar Babou', 'Shajahan Ali', 'Gani Ahmed Somrat',
    'Saddam Hossain Anny', 'Rashedul Islam', 'Shanto Kumar', 'Mujahid',
    'Sabuz', 'Noyon', 'Faruk'
  ],
  'Rahmatganj MFS': [
    'Samuel Mensah Konney', 'Ernest Boateng', 'Mostafa Kahraba', 'Ceesay',
    'Sushanto Tripura', 'Taj Uddin', 'Mezbah Uddin', 'Noyon',
    'Nayem', 'Mamun', 'Al-Amin'
  ],
  'Wari Club': [
    'Shamim', 'Ripon', 'Robin', 'Jamil',
    'Shakil', 'Hridoy', 'Shohel', 'Pappu',
    'Babu', 'Emon', 'Ashik'
  ],
  'Arambagh KS': [
    'Jewel', 'Nabil', 'Rony', 'Akash',
    'Arif', 'Sujon', 'Rakib', 'Shanto',
    'Al-Amin', 'Sajal', 'Emon'
  ],
}

const groups = { 
  A: ['Bashundhara Kings', 'Abahani Limited Dhaka', 'Mohammedan SC', 'Bangladesh Police FC'], 
  B: ['Brothers Union', 'Chittagong Abahani', 'Dhaka Wanderers', 'Fakirerpool YMC'], 
  C: ['Fortis FC', 'Rahmatganj MFS', 'Wari Club', 'Arambagh KS'] 
}

function roundRobinPairs(teams) {
  const pairs = []
  for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) pairs.push([teams[i], teams[j]])
  return pairs
}

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }

async function main() {
  // Step 1: Update team groups
  console.log('Step 1: Updating team groups to 3 groups of 4...')
  for (const [group, teamNames] of Object.entries(groups)) {
    for (const name of teamNames) {
      await upd(doc(db, 'teams', teamIds[name]), { group })
    }
    console.log(`  Group ${group}: ${teamNames.join(', ')}`)
  }

  // Step 2: Clear existing matches
  console.log('\nStep 2: Clearing existing matches...')
  const snap = await getDocs(collection(db, 'matches'))
  for (const d of snap.docs) await deleteDoc(doc(db, 'matches', d.id))
  console.log(`  Deleted ${snap.docs.length} matches`)

  // Step 3: Create round-robin matches
  console.log('\nStep 3: Creating 18 group matches...')
  const dates = ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25']
  const times = ['18:00', '20:00', '22:00']
  const venues = ['Bangabandhu National Stadium', 'Bashundhara Kings Arena', 'MA Aziz Stadium', 'Sylhet District Stadium', 'Rajshahi District Stadium', 'Comilla Town Stadium']

  let matchIdx = 0
  const createdMatches = []
  const batch = writeBatch(db)

  for (const [group, teamNames] of Object.entries(groups)) {
    const pairs = roundRobinPairs(teamNames)
    pairs.forEach(([teamA, teamB], idx) => {
      const id = crypto.randomUUID()
      const match = {
        id, group, teamA: teamIds[teamA], teamB: teamIds[teamB],
        date: dates[matchIdx % dates.length], time: times[idx % times.length],
        venue: venues[matchIdx % venues.length], status: 'scheduled', result: null,
      }
      batch.set(doc(db, 'matches', id), match)
      createdMatches.push({ ...match, aName: teamA, bName: teamB })
      matchIdx++
    })
  }
  await batch.commit()
  console.log(`  ✅ ${createdMatches.length} matches created`)

  // Step 4: Score the matches
  console.log('\nStep 4: Scoring all matches...')

  const matchScores = [
    // Group A — Bashundhara Kings Dominate!  
    [4, 1], [3, 0], [5, 2],  // Kings vs Abahani, Mohammedan, Police
    [2, 1], [1, 1], [2, 0],  // Abahani vs Mohammedan, Police | Mohammedan vs Police
    // Group B
    [2, 2], [3, 1], [1, 0],
    [3, 0], [2, 1], [1, 0],
    // Group C
    [1, 1], [3, 0], [2, 1],
    [2, 0], [3, 2], [1, 1],
  ]

  for (let i = 0; i < createdMatches.length; i++) {
    const m = createdMatches[i]
    const [scoreA, scoreB] = matchScores[i]
    const scorers = []

    for (let g = 0; g < scoreA; g++) scorers.push({ player: rnd(playerNames[m.aName]), teamId: m.teamA, minute: Math.floor(Math.random() * 89) + 1 })
    for (let g = 0; g < scoreB; g++) scorers.push({ player: rnd(playerNames[m.bName]), teamId: m.teamB, minute: Math.floor(Math.random() * 89) + 1 })
    
    const yellows = []
    for (let c = 0; c < Math.floor(Math.random() * 3); c++) yellows.push({ player: rnd(playerNames[m.aName]), teamId: m.teamA, minute: Math.floor(Math.random() * 89) + 1, type: 'yellow' })
    for (let c = 0; c < Math.floor(Math.random() * 3); c++) yellows.push({ player: rnd(playerNames[m.bName]), teamId: m.teamB, minute: Math.floor(Math.random() * 89) + 1, type: 'yellow' })

    const reds = []
    if (Math.random() > 0.85) reds.push({ player: rnd(playerNames[m.aName]), teamId: m.teamA, minute: Math.floor(Math.random() * 89) + 1, type: 'red' })
    if (Math.random() > 0.85) reds.push({ player: rnd(playerNames[m.bName]), teamId: m.teamB, minute: Math.floor(Math.random() * 89) + 1, type: 'red' })

    await upd(doc(db, 'matches', m.id), {
      status: 'completed',
      result: { scoreA, scoreB, scorers, yellowCards: yellows, redCards: reds },
    })
  }

  // Print results
  console.log('\n📊 === TOURNAMENT RESULTS ===')
  console.log('')
  console.log('Group A:')
  console.log('  Bashundhara Kings 4-1 Abahani Limited Dhaka')
  console.log('  Bashundhara Kings 3-0 Mohammedan SC')
  console.log('  Bashundhara Kings 5-2 Bangladesh Police FC')
  console.log('  Abahani Limited Dhaka 2-1 Mohammedan SC')
  console.log('  Abahani Limited Dhaka 1-1 Bangladesh Police FC')
  console.log('  Mohammedan SC 2-0 Bangladesh Police FC')
  console.log('')
  console.log('🏆 Bashundhara Kings wins Group A with 3 wins (9pts)!')

  // Verify count
  console.log(`\n✅ ${matchScores.length} matches scored successfully`)
}

main().catch(console.error)
