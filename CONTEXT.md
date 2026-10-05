# GoalChok (গোলছক) Domain Model

Tournament management system for calculating group standings, tracking match scores, and advancing knockout stage brackets.

## Language

**TournamentEngine**:
The central calculation engine that processes teams, group matches, and knockout matches to compute standings, scorers, and bracket progression.
_Avoid_: StandingsCalculator, TournamentService, CalculationUtils

**Group Standings**:
Ranked table of teams within a tournament group based on Points, Goal Difference (GD), Goals For (GF), Goals Against (GA), and Head-to-Head results.
_Avoid_: GroupTable, LeagueTable, Leaderboard

**Top Scorers**:
Aggregated ranking of players across all completed tournament matches ordered by total goals scored.
_Avoid_: GoalScorers, ScorerList, GoldenBoot

**Knockout Progression**:
The automated advancement of winning teams through tournament knockout rounds (Quarter-Finals, Semi-Finals, Final, Third Place).
_Avoid_: BracketAutomation, KnockoutSync, RoundAdvancement

**Tie-Breaker**:
The sequential criteria used to rank teams tied on points (Goal Difference > Goals For > Head-to-Head > Disciplinary Cards).
_Avoid_: TieResolution, RankOverride

**MatchLifecycleService**:
The domain service governing match status transitions (scheduled -> live -> completed / postponed / scheduled) and enforcing result validation rules (score validation, knockout tie-breakers, scorer sanitization).
_Avoid_: MatchManager, StatusUpdater, ScoreHandler

**TournamentRepository**:
The unified data access repository providing an abstraction layer over tournament persistence (teams, group matches, knockout matches, groups, settings, live scores), decoupling domain operations from Firebase Firestore and RTDB.
_Avoid_: DataStore, DBWrapper, ServiceHub

**Organization (Tenant)**:
The isolation boundary that owns all tournament data. Documents live under `organizations/{orgId}/tournaments/{tournamentId}/...`, and write access requires the caller's `orgId` custom claim to match the path org.
_Avoid_: Workspace, Account, Team (already means a competing football team)

**Admin Claim**:
The `role: 'admin'` custom claim on a Firebase Auth user — the only claim that authorizes writes to Firestore and RTDB. It is set only by an existing admin (via the `assignOrgId` callable) or out-of-band for the first admin; sign-up grants org membership only.
_Avoid_: isAdmin flag, superuser, root
