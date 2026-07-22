/**
 * Bulk import script for GoalChok Bangladesh Football Clubs
 * Creates 12 real Bangladeshi football clubs, real rosters, beautiful vector-based SVG logos/photos, and stable IDs
 */
import { config } from 'dotenv'
config()
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBi80z2Z5QHu_3OeaJepUnpM_Ec-Ri1fEs",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "goalchok-7391.firebaseapp.com",
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://goalchok-7391-default-rtdb.firebaseio.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "goalchok-7391",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "goalchok-7391.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "110436053740",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:110436053740:web:668a4c9a4ff3a74c776bc9"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Color mappings for authentic Bangladeshi club representations
const teamColorsMap = {
  'Bashundhara Kings': { color: 'red', primary: '#C8102E', secondary: '#FFCD00' },
  'Abahani Limited Dhaka': { color: 'sky', primary: '#6CADDF', secondary: '#FFCD00' },
  'Mohammedan SC': { color: 'black', primary: '#1A1A1A', secondary: '#FFFFFF' },
  'Bangladesh Police FC': { color: 'navy', primary: '#003087', secondary: '#C8102E' },
  'Brothers Union': { color: 'orange', primary: '#FF6600', secondary: '#00A651' },
  'Chittagong Abahani': { color: 'navy', primary: '#003087', secondary: '#6CADDF' },
  'Dhaka Wanderers': { color: 'black', primary: '#1A1A1A', secondary: '#B8860B' },
  'Fakirerpool YMC': { color: 'yellow', primary: '#FFCD00', secondary: '#8B0000' },
  'Fortis FC': { color: 'dark-green', primary: '#004D40', secondary: '#1A1A1A' },
  'Rahmatganj MFS': { color: 'green', primary: '#00A651', secondary: '#FFCD00' },
  'Wari Club': { color: 'yellow', primary: '#FFCD00', secondary: '#00A651' },
  'Arambagh KS': { color: 'dark-red', primary: '#8B0000', secondary: '#B8860B' }
}

// Generate beautiful, clean, modern vector circular badges
function getTeamSvgLogo(teamName, colors) {
  const shortName = teamName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <circle cx="60" cy="60" r="54" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="6"/>
    <circle cx="60" cy="60" r="46" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="4" opacity="0.6"/>
    <path d="M 35,48 Q 60,38 85,48 Q 80,82 60,98 Q 40,82 35,48 Z" fill="${colors.secondary}" opacity="0.9"/>
    <text x="60" y="67" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" style="letter-spacing: 0.5px;">${shortName}</text>
    <circle cx="60" cy="30" r="4.5" fill="#ffffff"/>
    <circle cx="46" cy="34" r="3.5" fill="#ffffff"/>
    <circle cx="74" cy="34" r="3.5" fill="#ffffff"/>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Generate stylized athlete profile images
function getPlayerSvgPhoto(playerName, primaryColor) {
  const initial = playerName.charAt(0).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#1e293b"/>
    <circle cx="50" cy="40" r="20" fill="#475569"/>
    <path d="M 20,90 C 20,70 35,60 50,60 C 65,60 80,70 80,90 Z" fill="#334155"/>
    <circle cx="50" cy="40" r="16" fill="${primaryColor}" opacity="0.3"/>
    <text x="50" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="bold" font-size="20" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const teams = [
  { name: 'Bashundhara Kings', manager: 'Valeriu Tita', group: 'A' },
  { name: 'Abahani Limited Dhaka', manager: 'Diego Andres Cruciani', group: 'A' },
  { name: 'Mohammedan SC', manager: 'Alfaz Ahmed', group: 'A' },
  { name: 'Bangladesh Police FC', manager: 'Aristica Cioaba', group: 'A' },
  { name: 'Brothers Union', manager: 'Sheikh Jahid Hasan Ameli', group: 'B' },
  { name: 'Chittagong Abahani', manager: 'Zulfiker Mahmud Mintu', group: 'B' },
  { name: 'Dhaka Wanderers', manager: 'Mustafa Anwar Parvez', group: 'B' },
  { name: 'Fakirerpool YMC', manager: 'Mehdi Hasan', group: 'B' },
  { name: 'Fortis FC', manager: 'Masud Parvez Kaiser', group: 'C' },
  { name: 'Rahmatganj MFS', manager: 'Kamal Babu', group: 'C' },
  { name: 'Wari Club', manager: 'Lutfur Rahman', group: 'C' },
  { name: 'Arambagh KS', manager: 'Anwar Hossain', group: 'C' },
]

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

const teamStableIds = {
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

async function createTeams() {
  const teamIds = {}
  
  for (const t of teams) {
    const id = teamStableIds[t.name] || crypto.randomUUID()
    const colorProfile = teamColorsMap[t.name] || { color: 'grey', primary: '#9E9E9E', secondary: '#ffffff' }
    
    const players = (playerNames[t.name] || ['Player 1', 'Player 2', 'Player 3']).map((name, i) => ({
      id: `player-${i}-${name.replace(/\s+/g, '-').toLowerCase()}`,
      name,
      photo: getPlayerSvgPhoto(name, colorProfile.primary),
    }))
    
    await setDoc(doc(db, 'teams', id), {
      id,
      name: t.name,
      manager: t.manager,
      group: t.group,
      color: colorProfile.color, // Save core color ID so frontend displays customized matching theme widgets automatically
      logo: getTeamSvgLogo(t.name, colorProfile),
      players,
      createdAt: new Date().toISOString(),
    })
    
    teamIds[t.name] = id
    console.log(`  ✅ ${t.name} → ${id} (${players.length} players with custom SVGs)`)
  }
  
  return teamIds
}

async function deleteExistingTeams() {
  const snapshot = await getDocs(collection(db, 'teams'))
  let count = 0
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, 'teams', d.id))
    count++
  }
  if (count > 0) console.log(`  🗑️ Deleted ${count} existing teams`)
  return count
}

async function main() {
  console.log('=== Starting bulk import of Bangladesh Football Clubs ===\n')
  
  // Step 1: Delete existing teams
  console.log('Step 1: Clearing existing data...')
  await deleteExistingTeams()
  
  // Step 2: Create teams
  console.log('Step 2: Creating 12 Bangladeshi teams with vector assets...')
  const teamIds = await createTeams()
  
  console.log('\n=== Import complete ===')
  console.log(`✅ ${Object.keys(teamIds).length} teams created successfully`)
}

main().catch(console.error)
