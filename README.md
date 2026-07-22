# GoalChok — গোলছক

A full-featured tournament management app built with **React + Vite + Firebase**. Manage teams, groups, matches, live scores, standings, and share schedule views — all in a dark-themed, RTL-first UI.

## Tech Stack

| Dependency | Version |
|------------|---------|
| React | ^18.3 |
| React Router DOM | ^6.26 |
| Vite | ^8.0 |
| Tailwind CSS | ^4.0 |
| Zustand (state) | ^4.5 |
| Firebase (auth, firestore, rtdb, hosting) | ^10.12 |
| Framer Motion (animations) | ^11.0 |
| Lucide React (icons) | ^0.400 |
| html2canvas (export) | ^1.4 |
| jsPDF (PDF export) | ^4.2 |
| date-fns (date utils) | ^4.0 |
| react-big-calendar (calendar view) | ^1.17 |

## Features

- **Tournament Management** — Create up to 12 teams with logos, coaches, and players
- **Group Draw** — Randomly assign teams into 3 groups (A, B, C) with round-robin scheduling
- **Live Match Scoring** — Track scores, scorers, yellow/red cards in real-time
- **Standings** — Auto-calculated group standings with points, GD, head-to-head
- **Eagle-Eye Schedule View** — Full tournament overview with filter, download (PNG/PDF), and share
- **Admin Panel** — Password-protected dashboard for managing teams, matches, groups
- **RTL Support** — Full Arabic/English bilingual UI with `dir="rtl"` handling
- **Dark Theme** — Muted dark interface with gold accent palette

## What We Fixed & Built

### Layout & Navigation
- Fixed RTL navigation: `grid-cols-4` with conditional `dir` for correct tab order (Home leftmost in English, rightmost in Arabic)
- Redesigned bottom nav with raised FAB for Eagle-Eye access
- Added `pb-safe` for mobile safe-area-inset-bottom

### Schedule Page
- Replaced react-big-calendar with a clean custom schedule view after the calendar library caused issues
- Eagle-Eye view: 3-group grid with match cards, status colors (live/complete/scheduled), and match detail modal
- Group filter chips for quick navigation
- Viewport-preserved scroll on group toggle

### Download & Share
- `html2canvas` capture at 2x for crisp PNG/PDF exports
- Native Web Share API with image file attachment (WhatsApp, AirDrop, etc.)
- Clipboard fallback + modal fallback for desktop

### Data Layer
- All data migrated to Firebase Realtime Database + Firestore (no localStorage)
- Firebase rules opened for public read/write (tournament data)
- ErrorBoundary wrapping to prevent full-page crashes
- React Query hooks for public pages, zustand stores for admin

### Hero Section
- Arabic title now right-aligned (`text-right` when `isAr`)
- Title centered vertically on cup background image
- Raised position with responsive padding

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Deploy to Firebase
firebase deploy
```

## Testing Setup & Execution

We have configured **Reliability Testing (E2E)** and **Security Rules Testing (Local sandbox)** using Playwright and Vitest.

### Prerequisite 1: Playwright Browsers (For E2E/Reliability Tests)
Playwright is configured to run headless and headed tests using your local browser environment. To download/synchronize Playwright's browser engines, run:
```bash
npx playwright install
```

### Prerequisite 2: Java JDK 21+ (For Database Security Rules Tests)
The Firebase Local Emulator Suite requires Java JDK 21 or above to run local Firestore and Realtime Database sandboxes.
- **macOS:** `brew install openjdk@21`
- **Windows/Linux:** Download from [Adoptium Temurin](https://adoptium.net/temurin/releases/).

### Running the Tests

- **Run E2E/Reliability tests (using Playwright):**
  ```bash
  pnpm test:e2e
  ```
- **Run E2E/Reliability tests with Interactive UI:**
  ```bash
  pnpm test:e2e:ui
  ```
- **Run Security Rules Unit Tests (using Vitest + Firebase Emulator):**
  ```bash
  pnpm test:rules
  ```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_ADMIN_PIN=your_admin_password
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# ... other Firebase config
```

## Deployment

The app is deployed via Firebase Hosting at:

**https://goalchok-7391.web.app**

```bash
firebase deploy --only hosting
```

## Project Structure

```
src/
├── App.jsx                    # Root routing
├── index.css                  # Tailwind + theme tokens + animations
├── components/
│   ├── common/                # DarkCard, TeamLogo, ErrorBoundary, ScheduleEagleEyeView, etc.
│   ├── layout/                # AppLayout, BottomNav, AdminBottomNav, Header
│   └── providers/             # AdminDataSync, React Query providers
├── pages/
│   ├── public/                # Home, Matches, Standings, Teams, ScheduleEagleEye, etc.
│   └── admin/                 # Dashboard, TeamsAdmin, MatchesAdmin, DrawAdmin, Login, etc.
├── stores/                    # Zustand stores (useAppStore, useAuthStore, useTeamsStore, useMatchesStore)
├── hooks/                     # React Query hooks (useQueries)
├── services/                  # Firebase CRUD services
├── utils/                     # scheduleGenerator, matchHelpers, standings
├── config/                    # Firebase config
└── styles/                    # Calendar overrides
```

## Known Issues

- Firebase tokens in `.git-credentials` may expire — push via SSH (`git@github.com`) instead
- `pnpm install` may error on `core-js` build scripts; use `node node_modules/vite/bin/vite.js build` directly if needed
