import { describe, it, expect } from 'vitest'
import { TournamentEngine } from '../../src/domain/tournamentEngine'

describe('TournamentEngine — Deep Domain Module', () => {
  const sampleTeams = [
    { id: 't1', name: 'Team A', group: 'A', logo: 'logo1' },
    { id: 't2', name: 'Team B', group: 'A', logo: 'logo2' },
    { id: 't3', name: 'Team C', group: 'A', logo: 'logo3' },
    { id: 't4', name: 'Team D', group: 'B', logo: 'logo4' },
    { id: 't5', name: 'Team E', group: 'B', logo: 'logo5' },
    { id: 't6', name: 'Team F', group: 'C', logo: 'logo6' },
    { id: 't7', name: 'Team G', group: 'C', logo: 'logo7' },
    { id: 't8', name: 'Team H', group: 'C', logo: 'logo8' },
  ]

  const sampleGroupMatches = [
    {
      id: 'gm1',
      group: 'A',
      teamA: 't1',
      teamB: 't2',
      status: 'completed',
      result: { 
        scoreA: 3, 
        scoreB: 1, 
        scorers: [
          { player: 'Player A1', teamId: 't1' },
          { player: 'Player A1', teamId: 't1' },
          { player: 'Player A1', teamId: 't1' },
          { player: 'Player B1', teamId: 't2' },
        ] 
      },
    },
    {
      id: 'gm2',
      group: 'A',
      teamA: 't2',
      teamB: 't3',
      status: 'completed',
      result: { 
        scoreA: 2, 
        scoreB: 0, 
        scorers: [
          { player: 'Player B1', teamId: 't2' },
          { player: 'Player B2', teamId: 't2' },
        ] 
      },
    },
  ]

  const sampleKOMatches = [
    {
      id: 'kom1',
      round: 'QF',
      matchLabel: 'QF 1',
      teamA: 't1',
      teamB: 't8',
      status: 'completed',
      result: { scoreA: 2, scoreB: 0, scorers: [{ player: 'Player A1', teamId: 't1' }] },
    },
  ]

  it('should calculate group standings correctly through getStandings', () => {
    const engine = new TournamentEngine(sampleTeams, sampleGroupMatches, sampleKOMatches)
    const standingsA = engine.getStandings('A')

    expect(standingsA).toHaveLength(3)
    // Team A: 1 match played, 1 won, 3 pts, 3 gf, 1 ga
    const teamA = standingsA.find((t) => t.id === 't1')
    expect(teamA.played).toBe(1)
    expect(teamA.pts).toBe(3)
    expect(teamA.gf).toBe(3)
    expect(teamA.ga).toBe(1)
  })

  it('should aggregate top scorers across both group and knockout matches', () => {
    const engine = new TournamentEngine(sampleTeams, sampleGroupMatches, sampleKOMatches)
    const topScorers = engine.getTopScorers()

    // Player A1 scored 3 goals in gm1 and 1 goal in kom1 = 4 total goals
    const playerA1 = topScorers.find((s) => s.name === 'Player A1')
    expect(playerA1).toBeDefined()
    expect(playerA1.goals).toBe(4)

    // Player B1 scored 1 goal in gm1 and 1 goal in gm2 = 2 total goals
    const playerB1 = topScorers.find((s) => s.name === 'Player B1')
    expect(playerB1).toBeDefined()
    expect(playerB1.goals).toBe(2)
  })

  it('should return merged group and knockout matches via getMergedMatches', () => {
    const engine = new TournamentEngine(sampleTeams, sampleGroupMatches, sampleKOMatches)
    const merged = engine.getMergedMatches()

    expect(merged).toHaveLength(3)
    expect(merged.some((m) => m.id === 'gm1')).toBe(true)
    expect(merged.some((m) => m.id === 'kom1')).toBe(true)
  })

  it('should identify qualified teams for knockout stage', () => {
    const engine = new TournamentEngine(sampleTeams, sampleGroupMatches, [])
    const qualified = engine.getQualifiedTeams()

    expect(Array.isArray(qualified)).toBe(true)
  })

  it('should evaluate knockout progression and auto-generate semi-finals when 4 QFs are completed', () => {    const qfMatches = [
      { id: 'qf1', round: 'QF', matchLabel: 'QF 1', teamA: 't1', teamB: 't8', status: 'completed', result: { scoreA: 2, scoreB: 0 } },
      { id: 'qf2', round: 'QF', matchLabel: 'QF 2', teamA: 't2', teamB: 't7', status: 'completed', result: { scoreA: 1, scoreB: 0 } },
      { id: 'qf3', round: 'QF', matchLabel: 'QF 3', teamA: 't3', teamB: 't6', status: 'completed', result: { scoreA: 3, scoreB: 1 } },
      { id: 'qf4', round: 'QF', matchLabel: 'QF 4', teamA: 't4', teamB: 't5', status: 'completed', result: { scoreA: 2, scoreB: 1 } },
    ]

    const engine = new TournamentEngine(sampleTeams, [], qfMatches)
    const progression = engine.evaluateKnockoutProgression()

    expect(progression.newMatches).toHaveLength(2)
    expect(progression.newMatches[0].round).toBe('SF')
    expect(progression.newMatches[0].teamA).toBe('t1') // W_QF1
    expect(progression.newMatches[0].teamB).toBe('t4') // W_QF4
    expect(progression.newMatches[1].teamA).toBe('t2') // W_QF2
    expect(progression.newMatches[1].teamB).toBe('t3') // W_QF3
  })

  describe('Tie-Breaker chain (CONTEXT.md: pts > GD > GF > Head-to-Head > Disciplinary)', () => {
    const tiedTeams = [
      { id: 'a1', name: 'Alpha', group: 'A' },
      { id: 'a2', name: 'Beta', group: 'A' },
      { id: 'a3', name: 'Gamma', group: 'A' },
      { id: 'a4', name: 'Delta', group: 'A' },
    ]

    const match = (id, teamA, teamB, scoreA, scoreB, cards = {}) => ({
      id,
      group: 'A',
      teamA,
      teamB,
      status: 'completed',
      result: { scoreA, scoreB, scorers: [], ...cards },
    })

    it('ranks teams level on pts/GD/GF by head-to-head mini-league', () => {
      // a1/a2/a3 finish level on 6 pts, GD +2, GF 4; their mini-league is a
      // cycle of wins so h2h GD decides: a3 (+1) > a1 (0) > a2 (-1).
      const matches = [
        match('m1', 'a3', 'a1', 2, 0),
        match('m2', 'a1', 'a2', 2, 0),
        match('m3', 'a2', 'a3', 1, 0),
        match('m4', 'a1', 'a4', 2, 0),
        match('m5', 'a2', 'a4', 3, 0),
        match('m6', 'a3', 'a4', 2, 1),
      ]

      const standings = new TournamentEngine(tiedTeams, matches).getStandings('A')
      expect(standings.map((s) => s.id)).toEqual(['a3', 'a1', 'a2', 'a4'])
    })

    it('breaks remaining h2h ties by disciplinary record (fewer cards first)', () => {
      // All four teams level on pts/GD/GF and h2h (all draws); only cards differ.
      const matches = [
        match('m1', 'a1', 'a2', 1, 1, { redCards: [{ player: 'x', teamId: 'a2' }, { player: 'y', teamId: 'a2' }] }),
        match('m2', 'a3', 'a4', 1, 1),
        match('m3', 'a1', 'a3', 1, 1, { yellowCards: [{ player: 'z', teamId: 'a1' }] }),
        match('m4', 'a2', 'a4', 1, 1),
        match('m5', 'a1', 'a4', 1, 1),
        match('m6', 'a2', 'a3', 1, 1),
      ]

      const standings = new TournamentEngine(tiedTeams, matches).getStandings('A')
      const a1 = standings.findIndex((s) => s.id === 'a1')
      const a2 = standings.findIndex((s) => s.id === 'a2')
      expect(a1).toBeLessThan(a2) // a1: 1 discard pt, a2: 2 reds = 6 discard pts
    })

    it('does not change ordering when no teams are tied', () => {
      const matches = [
        match('m1', 'a1', 'a4', 2, 0),
        match('m2', 'a2', 'a3', 1, 0),
      ]
      const standings = new TournamentEngine(tiedTeams, matches).getStandings('A')
      expect(standings.map((s) => s.pts)).toEqual([3, 3, 0, 0])
      expect(standings[0].id).toBe('a1')
      expect(standings[1].id).toBe('a2')
    })
  })
})
