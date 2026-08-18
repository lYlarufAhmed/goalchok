# GoalChok (গোলছক) — STQA Comprehensive Test Strategy & Specification

This document provides a complete **Software Testing & Quality Assurance (STQA)** strategy for **GoalChok**, tailored for your software engineering testing course. It details the Test Pyramid distribution, test scenario specifications (Happy Path, Edge Cases, Error Handling), required test categories (Smoke, Regression, Performance, Security, Accessibility), and a concrete **Test-Driven Development (TDD)** execution guide.

---

## 1. Test Pyramid & Seam Architecture

In standard STQA, the **Test Pyramid** ensures optimal test execution speed, maintainability, and confidence:

```
        / \
       /   \       10% E2E Tests (Playwright)
      /  E2E \     - Critical User Journeys (Admin score record -> Public standings)
     /-------\
    /   INT   \    20% Integration Tests (Vitest + React Testing Library)
   /-----------\   - Stores + Hooks + Firebase Emulators / Mocked Services
  /    UNIT     \  70% Unit Tests (Vitest)
 /---------------\ - Standings Engine, Schedule Generator, Knockout Utils, Scorers
```

### Seam Definitions for GoalChok
A **seam** is the public boundary where behavior is verified without touching internal implementation details:

| Seam Level | Boundary Tested | Primary Tools | Example Seam |
| :--- | :--- | :--- | :--- |
| **Unit Seam** | Pure utility exports & state reducers | Vitest | `calculateStandings(teams, matches, group)` |
| **Integration Seam** | Zustand Stores & React Hooks | Vitest + RTL | `useMatchesStore.getState().recordResult(matchId, result)` |
| **Security Seam** | Firestore & RTDB Rule sets | Vitest + `@firebase/rules-unit-testing` | `assertFails(db.collection('matches').doc('m1').set(...))` |
| **E2E Seam** | Full browser DOM & Network | Playwright | `page.goto('/admin/matches') -> record score -> check /standings` |

---

## 2. Business-Critical Features Mapping

GoalChok relies on six core engines that drive the entire tournament lifecycle. These features require deep test coverage:

1. **Group Standings Engine** (`src/utils/standings.js`): Auto-computes points, Goal Difference (GD), Goals For (GF), Goals Against (GA), and multi-tier tie-breakers.
2. **Schedule Generator Engine** (`src/utils/scheduleGenerator.js`): Generates balanced round-robin group fixtures and handles team draw distributions.
3. **Knockout Progression Engine** (`src/utils/knockoutUtils.js` & `useKnockoutStore.js`): Handles winner progression from Group Stage to Quarter-Finals, Semi-Finals, and Final.
4. **Top Scorers Aggregator** (`src/utils/scorers.js`): Aggregates goals, yellow cards, and red cards across group and knockout matches per player.
5. **Real-time Live Match Engine** (`useLiveMatch.js` / RTDB): Real-time score ticker, live timer, and event sync between admin and public viewers.
6. **Admin Authentication & Access Control** (`useAuthStore.js` & Firestore Rules): Admin PIN authentication, route guarding, and database authorization.

---

## 3. Test Types Breakdown (STQA Course Requirements)

### A. Smoke Tests (Sanity & Readiness)
*Purpose: Verify that the application's core pages and services boot up and render without crashing.*

- **ST-01: Public Route Rendering:** Ensure `/`, `/standings`, `/matches`, `/teams`, `/schedule`, `/top-scorers` load without throwing uncaught React errors or rendering blank screens.
- **ST-02: Admin Login Render:** Ensure `/admin/login` renders PIN input and submit button properly.
- **ST-03: Initial Store Hydration:** Verify `useAppStore`, `useMatchesStore`, and `useTeamsStore` initialize with default fallback arrays (not `null` or `undefined`).
- **ST-04: Language Toggle Smoke:** Verify switching language between EN and AR updates document direction (`dir="ltr"` vs `dir="rtl"`) without crashing components.

---

### B. Regression Tests (Bug Prevention)
*Purpose: Ensure previously resolved bugs or edge-case behaviors remain fixed.*

- **RT-01: Standings Auto-Update:** Verify that when an admin completes a match result, public standings instantly recalculate without requiring a full page refresh.
- **RT-02: Tie-Breaker Ordering:** Verify that when Team A and Team B have equal points and equal GD, the team with higher Goals For (GF) ranks higher.
- **RT-03: Head-to-Head Resolution:** Verify head-to-head result correctly breaks ties when Points, GD, and GF are identical between two teams.
- **RT-04: RTL Tab Order Preservation:** Verify navigation tabs maintain correct spatial order in Arabic (`dir="rtl"`) vs English (`dir="ltr"`).
- **RT-05: Uncompleted Match Exclusions:** Ensure `scheduled` or `live` matches do **not** contribute points or goals to official standings until status becomes `completed`.

---

### C. Performance Tests (Speed & Reliability)
*Purpose: Benchmark system response time, render efficiency, and memory usage under load.*

- **PT-01: Standings Engine Benchmark:** Benchmark `calculateStandings()` with 100+ matches and 16 teams. Execution time must remain **< 5ms**.
- **PT-02: Schedule Generator Execution:** Benchmark round-robin schedule creation for 12 teams (3 groups) to complete in **< 10ms**.
- **PT-03: Large List Render Speed:** Verify `ScheduleEagleEyeView` with 50+ matches renders within **100ms** (no UI thread freezing).
- **PT-04: Export Memory & Cleanup:** Ensure exporting schedule/bracket as PNG/PDF via `html2canvas` cleans up temporary DOM nodes without causing memory leaks.
- **PT-05: Real-time Listener Cleanup:** Verify Firebase RTDB subscriptions (`onValue`) detach on component unmount to prevent listener buildup.

---

### D. Security Tests (Authorization & Integrity)
*Purpose: Prevent unauthorized data modification, auth bypass, and injection attacks.*

- **SEC-01: Firestore Rule Enforcement (Unauthenticated Write Block):** Verify anonymous users cannot create, edit, or delete teams or match results in Firestore.
- **SEC-02: Admin PIN Auth Protection:** Verify invalid PIN submissions (e.g., `'0000'`, `'1234'`, `'<script>'`) return error states and deny access to `/admin/*` routes.
- **SEC-03: XSS Prevention in Team & Player Names:** Verify user-entered team names containing script tags (e.g. `<script>alert(1)</script>`) are escaped and rendered safely as raw text.
- **SEC-04: Score Manipulation Guard:** Ensure match results accept only valid non-negative integer scores (blocking negative numbers, floating points, or string payloads).

---

### E. Accessibility (a11y) Tests
*Purpose: Ensure usability for assistive technologies, keyboard users, and screen readers.*

- **A11Y-01: ARIA Modal Dialog Compliance:** Ensure `DeleteConfirmModal`, `ResultFormModal`, and `LiveScoreModal` have `role="dialog"`, `aria-modal="true"`, and appropriate `aria-labelledby`.
- **A11Y-02: Keyboard Focus Management:** Verify Esc key closes all bottom sheets and modals, and tab navigation traps focus inside open dialogs.
- **A11Y-03: Screen Reader Labels:** Verify icon-only buttons (e.g. back buttons, close buttons, theme toggles) have explicit `aria-label` tags in both EN and AR.
- **A11Y-04: Color Contrast (Gold on Dark):** Verify contrast ratio for gold text (`#EAB308` / `#FACC15`) against dark backgrounds (`#0F172A` / `#020617`) meets **WCAG AA (4.5:1)** standards.
- **A11Y-05: Dynamic RTL Support:** Ensure screen readers announce content logically when language toggles to Arabic (`dir="rtl"`).

---

## 4. Detailed Test Scenarios Matrix

| Domain Engine | Happy Path | Edge Cases | Error Handling |
| :--- | :--- | :--- | :--- |
| **Group Standings** (`standings.js`) | Calculate 3 pts for Win, 1 for Draw, 0 for Loss correctly. | Two teams tied in Pts, GD, GF, and Head-to-Head (lottery/fair play fallback). | Handle missing match `result` object gracefully without throwing `TypeError`. |
| **Schedule Generator** (`scheduleGenerator.js`) | Generate round-robin match matrix for 4 teams in Group A (6 total matches). | Odd number of teams in group (bye handling or odd scheduling). | Throw descriptive error if team list contains duplicates or `< 2` teams. |
| **Knockout Bracket** (`knockoutUtils.js`) | Advance winner of Quarter Final 1 to Semi Final 1 slot. | Match ends in draw in knockout stage (require extra time/penalties score). | Handle attempt to advance match when no winner is declared. |
| **Top Scorers** (`scorers.js`) | Aggregate goals per player across multiple matches in order. | Players with equal goals ranked by fewest matches played or penalties. | Handle match notes with malformed player ID or empty scorer array. |
| **Admin Login** (`useAuthStore.js`) | Enter correct PIN (`VITE_ADMIN_PIN`), authenticate successfully, save state. | Rapid double-clicking login button during authentication request. | Enter wrong PIN 5 times in a row -> trigger lockout/rate-limit state. |
| **Image/PDF Export** (`html2canvas`) | Click download PNG -> generate crisp image blob and trigger download. | Exporting on ultra-small mobile screen or high-DPI retina display. | Fallback gracefully if Web Share API or canvas creation fails. |

---

## 5. Test-Driven Development (TDD) Workflow Guide

When writing new features or refactoring business logic, follow the strict **TDD Red-Green-Refactor Loop**.

### The 3 Rules of TDD
1. **RED:** Write a failing test for a seam before writing any production code.
2. **GREEN:** Write *only* enough minimal production code to pass the test.
3. **REFACTOR:** Clean up code, structure, and readability while verifying tests stay green.

---

### Concrete TDD Walkthrough Example: Adding Discipline (Cards) Tie-Breaker

Suppose the tournament adds a new tie-breaker rule to `calculateStandings`: **If Points, Goal Difference, Goals For, and Head-to-Head are equal, rank the team with fewer Red/Yellow cards higher.**

#### Step 1: RED (Write the failing unit test first)

File: `tests/utils/standings.test.js`

```javascript
it('should resolve tie by yellow/red card count when pts, GD, GF, and H2H are equal', () => {
  const sampleTeams = [
    { id: 't1', name: 'Team Clean', group: 'A' },
    { id: 't2', name: 'Team Dirty', group: 'A' },
  ]

  const matches = [
    {
      id: 'm1',
      group: 'A',
      teamA: 't1',
      teamB: 't2',
      status: 'completed',
      result: { 
        scoreA: 1, 
        scoreB: 1,
        cardsA: { yellow: 1, red: 0 }, // 1 penalty pt
        cardsB: { yellow: 3, red: 1 }  // 6 penalty pts
      },
    },
  ]

  const standings = calculateStandings(sampleTeams, matches, 'A')
  
  // Team Clean should be ranked 1st due to better disciplinary record
  expect(standings[0].id).toBe('t1')
  expect(standings[1].id).toBe('t2')
})
```
*Run test command:* `pnpm exec vitest run tests/utils/standings.test.js`  
*Result:* ❌ **FAILED** (Cards tie-breaker logic does not exist yet).

---

#### Step 2: GREEN (Write minimal implementation code)

File: `src/utils/standings.js`

```javascript
// Add cards penalty calculation inside calculateStandings
const cardPenalty = (cards) => (cards?.yellow || 0) * 1 + (cards?.red || 0) * 3;

// In comparator function:
if (teamA.pts !== teamB.pts) return teamB.pts - teamA.pts;
if (teamA.gd !== teamB.gd) return teamB.gd - teamA.gd;
if (teamA.gf !== teamB.gf) return teamB.gf - teamA.gf;

// New Disciplinary Tie-Breaker
const penaltyA = cardPenalty(teamA.cards);
const penaltyB = cardPenalty(teamB.cards);
if (penaltyA !== penaltyB) return penaltyA - penaltyB; // Lower penalty ranks higher

return 0;
```
*Run test command:* `pnpm exec vitest run tests/utils/standings.test.js`  
*Result:* ✅ **PASSED**.

---

#### Step 3: REFACTOR (Improve code cleanliness without breaking tests)

Extract `cardPenalty` into a reusable helper function in `src/utils/matchHelpers.js` and ensure all tests continue passing.

---

## 6. How to Run & Verify Tests

### 1. Run Unit & Integration Tests (Vitest)
```bash
# Run all unit tests once
pnpm exec vitest run

# Run tests in watch mode during TDD
pnpm exec vitest

# Run specific utility tests
pnpm exec vitest run tests/utils/standings.test.js
```

### 2. Run Firestore Security Rules Tests (Firebase Emulator)
```bash
# Requires Java JDK 21+
pnpm test:rules
```

### 3. Run E2E / Reliability Tests (Playwright)
```bash
# Run headless e2e tests
pnpm test:e2e

# Run with interactive Playwright UI
pnpm test:e2e:ui
```

---

## 7. Next Action Plan for Course Submission

1. **Review this document in your editor:** `STQA_TEST_STRATEGY.md`.
2. **Execute existing tests** using `pnpm exec vitest run` to verify baseline stability.
3. **Select a TDD vertical slice** (e.g. adding a new tie-breaker, testing error states in `ResultFormModal`, or writing an accessibility test for modal focus traps).
4. **Export test execution logs / screenshots** as proof for your STQA course report.
