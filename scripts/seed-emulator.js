import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Seeding runs with elevated privileges (Admin SDK bypasses security rules)
// and provisions the local admin account used for the emulator dev loop.
// Requires the auth + firestore emulators to be running (ports 9099 / 8085).
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085'

const PROJECT_ID = 'goalchok-7391'

// Local-only credentials for the emulator dev loop — never valid in production.
const DEV_ADMIN = { email: 'admin@goalchok.local', password: 'goalchok-admin' }

const app = initializeApp({ projectId: PROJECT_ID })

const db = getFirestore(app)
const auth = getAuth(app)
const TENANT_BASE = ['organizations', 'default-org', 'tournaments', 'default-tournament']

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

async function seedDevAdmin() {
  try {
    const user = await auth.createUser(DEV_ADMIN)
    await auth.setCustomUserClaims(user.uid, { orgId: 'default-org', role: 'admin' })
    console.log(`Created dev admin ${DEV_ADMIN.email}`)
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const user = await auth.getUserByEmail(DEV_ADMIN.email)
      await auth.setCustomUserClaims(user.uid, { orgId: 'default-org', role: 'admin' })
      console.log(`Dev admin ${DEV_ADMIN.email} already exists; claims refreshed`)
    } else {
      throw err
    }
  }
}

async function seed() {
  console.log('Seeding Bangladesh Football Club dummy data into Firestore Emulator (127.0.0.1:8085)...')

  await seedDevAdmin()

  const batch = db.batch()

  // 1. Seed Teams (tenant path — read by the tenant-aware teams service)
  for (const team of bangladeshTeams) {
    batch.set(db.doc([...TENANT_BASE, 'teams', team.id].join('/')), team)
  }

  // 2. Seed Groups (legacy top-level path — read by the groups service)
  batch.set(db.doc('groups/groups_doc'), {
    A: ['team-bashundhara', 'team-abahani', 'team-mohammedan', 'team-ctg-abahani'],
    B: ['team-russel', 'team-jamal', 'team-police', 'team-rahmatganj'],
    C: [],
    locked: true
  })

  // 3. Seed Matches (tenant path — read by the tenant-aware matches service)
  for (const m of dummyMatches) {
    batch.set(db.doc([...TENANT_BASE, 'matches', m.id].join('/')), m)
  }

  // 4. Seed Settings (legacy top-level path — read by the settings service)
  batch.set(db.doc('settings/tournament'), {
    drawLocked: true,
    tournamentPhase: 'مرحلة المجموعات'
  })

  await batch.commit()
  console.log('Successfully seeded 8 Bangladesh Football Teams, Groups, and Matches into local Firestore Emulator!')
  console.log(`Admin login for the local dev loop: ${DEV_ADMIN.email} / ${DEV_ADMIN.password}`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Failed to seed emulator:', err)
  process.exit(1)
})
