# GoalChok — গোলছক

A tournament management app built with **React + Vite + Firebase**: teams, group draw, match scheduling, live scores, group standings, top scorers and a knockout bracket, in a dark-themed, RTL-first (Arabic/English) UI.

Domain language (TournamentEngine, Tie-Breaker, Knockout Progression, Organization (Tenant), Admin Claim…) is defined in [`CONTEXT.md`](CONTEXT.md).

## Tech Stack

| Area | Library |
|------|---------|
| UI | React 19, React Router 7, Tailwind CSS 4, Framer Motion, GSAP, Lucide icons |
| Data | Firebase 12 (Auth, Firestore, Realtime Database, Hosting, Cloud Functions), TanStack React Query 5, Zustand 5 |
| Export | html-to-image, jsPDF |
| Tooling | Vite 8, Vitest 4, Playwright, ESLint 10, TypeScript (for `.ts` modules) |

## Features

- **Teams** — create teams with logos, managers and players
- **Group Draw** — assign teams into groups with round-robin scheduling
- **Live Match Scoring** — scores, scorers and cards, streamed in real time over RTDB
- **Standings** — Points > GD > GF > Head-to-Head > Disciplinary Cards
- **Knockout Progression** — QF → SF → Final generated automatically from results
- **Eagle-Eye Schedule View** — whole-tournament overview with PNG/PDF download and native share
- **Admin Panel** — Firebase Auth sign-in; writes require the `role: 'admin'` custom claim
- **Multi-tenant data** — everything lives under `organizations/{orgId}/tournaments/{tournamentId}/...`

## Architecture

```
src/
├── domain/       # TournamentEngine, MatchLifecycleService, TournamentRepository (the persistence seam)
├── services/     # Firebase CRUD per collection, all tenant-scoped (tenantContext.ts)
├── hooks/        # React Query + subscription hooks (useQueries, useTournamentRepository, useLiveMatch)
├── stores/       # Zustand: app settings, auth, knockout stage state
├── pages/        # public/ and admin/
├── components/   # common/, layout/, effects/
├── i18n/, locales/  # translations (admin / public)
└── utils/        # schedule generation, standings, scorers, knockout helpers
functions/        # Cloud Functions (assignOrgId callable for admin/org claims)
shared/tenant.json  # default org/tournament ids shared by web, seed and functions
```

Security rules: `firestore.rules`, `database.rules.json`, `storage.rules`.

## Getting Started

```bash
pnpm install
cp .env.example .env   # fill in your Firebase web config
pnpm dev               # against the Firebase project in .env
pnpm dev:emulator      # against local emulators, seeded with sample data
```

## Testing

| Suite | Command | Needs |
|-------|---------|-------|
| Unit (domain + utils) | `npx vitest run tests/utils tests/domain` | — |
| Security rules | `pnpm test:rules` | Java 21+ (Firebase emulators) |
| End-to-end | `pnpm test:e2e` | Java 21+, `npx playwright install` |
| Lint | `pnpm run lint` | — |

## Deployment

Hosted on Firebase Hosting at **https://goalchok-7391.web.app**.

```bash
pnpm deploy:preview   # build + preview channel
pnpm deploy:prod      # build + hosting
firebase deploy --only functions,firestore:rules,database   # functions and rules
```

### One-off: legacy data migration

Data written before the tenant migration lives in top-level collections. Copy it into the tenant path (copy-only, dry run by default) before deploying a build that reads tenant paths:

```bash
gcloud auth application-default login
node scripts/migrate-legacy-to-tenant.mjs          # report
node scripts/migrate-legacy-to-tenant.mjs --apply  # write
```
