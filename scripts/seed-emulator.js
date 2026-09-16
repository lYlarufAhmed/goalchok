import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, writeBatch } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBi80z2Z5QHu_3OeaJepUnpM_Ec-Ri1fEs",
  projectId: "goalchok-7391",
  databaseURL: "http://127.0.0.1:9000?ns=goalchok-7391-default-rtdb"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const rtdb = getDatabase(app)

connectFirestoreEmulator(db, '127.0.0.1', 8085)
connectDatabaseEmulator(rtdb, '127.0.0.1', 9000)

const bangladeshTeams = [
  // Group A
  {
    id: 'team-bashundhara',
    name: 'Bashundhara Kings',
    manager: 'Oscar Bruzon',
    color: 'red',
    group: 'A',
    players: [
      { id: 'p1', name: 'Robinho' },
      { id: 'p2', name: 'Dorielton' },
      { id: 'p3', name: 'Rakib Hossain' },
      { id: 'p4', name: 'Tapu Barman' },
      { id: 'p5', name: 'Anisur Rahman Zico' }
    ]
  },
  {
    id: 'team-abahani',
    name: 'Abahani Limited Dhaka',
    manager: 'Mario Lemos',
    color: 'sky',
    group: 'A',
    players: [
      { id: 'p6', name: 'Emeka Ogbugh' },
      { id: 'p7', name: 'Nabib Newaj Jibon' },
      { id: 'p8', name: 'Sohel Rana' },
      { id: 'p9', name: 'Shahidul Alam' }
    ]
  },
  {
    id: 'team-mohammedan',
    name: 'Mohammedan SC',
    manager: 'Alfaz Ahmed',
    color: 'black',
    group: 'A',
    players: [
      { id: 'p10', name: 'Souleymane Diabate' },
      { id: 'p11', name: 'Muzaffar Muzaffarov' },
      { id: 'p12', name: 'Jafar Iqbal' },
      { id: 'p13', name: 'Sujon Hossain' }
    ]
  },
  {
    id: 'team-ctg-abahani',
    name: 'Chittagong Abahani',
    manager: 'Maruful Haque',
    color: 'blue',
    group: 'A',
    players: [
      { id: 'p14', name: 'Koushik Barua' },
      { id: 'p15', name: 'Mannaf Rabby' },
      { id: 'p16', name: 'Shakil Ahmed' }
    ]
  },
  // Group B
  {
    id: 'team-russel',
    name: 'Sheikh Russel KC',
    manager: 'Zulfiker Mahmud',
    color: 'emerald',
    group: 'B',
    players: [
      { id: 'p17', name: 'Mizuho Koike' },
      { id: 'p18', name: 'Nihat Jaman' },
      { id: 'p19', name: 'Hemanta Vincent' }
    ]
  },
  {
    id: 'team-jamal',
    name: 'Sheikh Jamal DC',
    manager: 'Joseph Afusi',
    color: 'amber',
    group: 'B',
    players: [
      { id: 'p20', name: 'Faysal Ahmed' },
      { id: 'p21', name: 'Higor Leite' },
      { id: 'p22', name: 'Cornelius Stewart' }
    ]
  },
  {
    id: 'team-police',
    name: 'Police FC',
    manager: 'Aristică Cioabă',
    color: 'purple',
    group: 'B',
    players: [
      { id: 'p23', name: 'Mateo Palacios' },
      { id: 'p24', name: 'Edward Morillo' },
      { id: 'p25', name: 'Joyonto Kumar' }
    ]
  },
  {
    id: 'team-rahmatganj',
    name: 'Rahmatganj MFS',
    manager: 'Kamal Babu',
    color: 'orange',
    group: 'B',
    players: [
      { id: 'p26', name: 'Ernest Boateng' },
      { id: 'p27', name: 'Samoel' },
      { id: 'p28', name: 'Ashraful Islam' }
    ]
  }
]

const dummyMatches = [
  // Group A Completed Matches
  {
    id: 'match-1',
    group: 'A',
    teamA: 'team-bashundhara',
    teamB: 'team-abahani',
    date: '2026-08-20',
    time: '16:00',
    venue: 'Bashundhara Kings Arena, Dhaka',
    status: 'completed',
    result: {
      scoreA: 3,
      scoreB: 1,
      penaltyScoreA: null,
      penaltyScoreB: null,
      penaltyWinner: null,
      scorers: [
        { player: 'Robinho', teamId: 'team-bashundhara', minute: '12\'' },
        { player: 'Dorielton', teamId: 'team-bashundhara', minute: '44\'' },
        { player: 'Robinho', teamId: 'team-bashundhara', minute: '78\'' },
        { player: 'Emeka Ogbugh', teamId: 'team-abahani', minute: '85\'' }
      ],
      cards: []
    }
  },
  {
    id: 'match-2',
    group: 'A',
    teamA: 'team-mohammedan',
    teamB: 'team-ctg-abahani',
    date: '2026-08-21',
    time: '18:30',
    venue: 'Bangabandhu National Stadium, Dhaka',
    status: 'completed',
    result: {
      scoreA: 2,
      scoreB: 0,
      penaltyScoreA: null,
      penaltyScoreB: null,
      penaltyWinner: null,
      scorers: [
        { player: 'Souleymane Diabate', teamId: 'team-mohammedan', minute: '23\'' },
        { player: 'Souleymane Diabate', teamId: 'team-mohammedan', minute: '61\'' }
      ],
      cards: []
    }
  },
  // Group A Scheduled Match
  {
    id: 'match-3',
    group: 'A',
    teamA: 'team-bashundhara',
    teamB: 'team-mohammedan',
    date: '2026-08-26',
    time: '17:00',
    venue: 'Bashundhara Kings Arena, Dhaka',
    status: 'scheduled',
    result: null
  },
  // Group B Scheduled Matches
  {
    id: 'match-4',
    group: 'B',
    teamA: 'team-russel',
    teamB: 'team-jamal',
    date: '2026-08-27',
    time: '16:00',
    venue: 'Sylhet District Stadium',
    status: 'scheduled',
    result: null
  },
  {
    id: 'match-5',
    group: 'B',
    teamA: 'team-police',
    teamB: 'team-rahmatganj',
    date: '2026-08-28',
    time: '18:30',
    venue: 'Mymensingh Stadium',
    status: 'scheduled',
    result: null
  }
]

async function seed() {
  console.log('Seeding Bangladesh Football Club dummy data into Firestore Emulator (127.0.0.1:8085)...')

  const batch = writeBatch(db)

  // 1. Seed Teams
  for (const team of bangladeshTeams) {
    batch.set(doc(db, 'teams', team.id), team)
  }

  // 2. Seed Groups
  batch.set(doc(db, 'groups', 'groups_doc'), {
    A: ['team-bashundhara', 'team-abahani', 'team-mohammedan', 'team-ctg-abahani'],
    B: ['team-russel', 'team-jamal', 'team-police', 'team-rahmatganj'],
    C: [],
    locked: true
  })

  // 3. Seed Matches
  for (const m of dummyMatches) {
    batch.set(doc(db, 'matches', m.id), m)
  }

  // 4. Seed Settings
  batch.set(doc(db, 'settings', 'tournament'), {
    drawLocked: true,
    tournamentPhase: 'مرحلة المجموعات'
  })

  await batch.commit()
  console.log('Successfully seeded 8 Bangladesh Football Teams, Groups, and Matches into local Firestore Emulator!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Failed to seed emulator:', err)
  process.exit(1)
})
