import { describe, it, expect } from 'vitest'
import { calculateStandings, getTeamStandingRank } from '../../src/utils/standings'

describe('Group Standings Engine (calculateStandings)', () => {
  const sampleTeams = [
    { id: 't1', name: 'Team A', group: 'A', logo: 'logo1' },
    { id: 't2', name: 'Team B', group: 'A', logo: 'logo2' },
    { id: 't3', name: 'Team C', group: 'A', logo: 'logo3' },
    { id: 't4', name: 'Team D', group: 'B', logo: 'logo4' }, // Diff group
  ]

  it('should initialize empty stats for all group teams if no matches are completed', () => {
    const standings = calculateStandings(sampleTeams, [], 'A')
    expect(standings).toHaveLength(3)
    
    const teamAStanding = standings.find(t => t.id === 't1')
    expect(teamAStanding).toEqual({
      id: 't1',
      name: 'Team A',
      logo: 'logo1',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
      yellow: 0,
      red: 0,
    })
  })

  it('should compute standings metrics correctly from completed matches', () => {
    const matches = [
      {
        id: 'm1',
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        status: 'completed',
        result: { scoreA: 3, scoreB: 1 },
      },
    ]

    const standings = calculateStandings(sampleTeams, matches, 'A')
    
    const teamA = standings.find(t => t.id === 't1')
    const teamB = standings.find(t => t.id === 't2')

    // Team A wins: 3 pts, +2 GD
    expect(teamA.played).toBe(1)
    expect(teamA.won).toBe(1)
    expect(teamA.pts).toBe(3)
    expect(teamA.gf).toBe(3)
    expect(teamA.ga).toBe(1)

    // Team B loses: 0 pts, -2 GD
    expect(teamB.played).toBe(1)
    expect(teamB.lost).toBe(1)
    expect(teamB.pts).toBe(0)
    expect(teamB.gf).toBe(1)
    expect(teamB.ga).toBe(3)
  })

  it('should support ties/draw matches', () => {
    const matches = [
      {
        id: 'm1',
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        status: 'completed',
        result: { scoreA: 2, scoreB: 2 },
      },
    ]

    const standings = calculateStandings(sampleTeams, matches, 'A')
    const teamA = standings.find(t => t.id === 't1')
    const teamB = standings.find(t => t.id === 't2')

    expect(teamA.drawn).toBe(1)
    expect(teamA.pts).toBe(1)
    expect(teamB.drawn).toBe(1)
    expect(teamB.pts).toBe(1)
  })

  it('should filter out incomplete or uncompleted matches and matches from other groups', () => {
    const matches = [
      {
        id: 'm1',
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        status: 'scheduled', // not completed
        result: null,
      },
      {
        id: 'm2',
        group: 'B', // different group
        teamA: 't4',
        teamB: 't1',
        status: 'completed',
        result: { scoreA: 5, scoreB: 0 },
      },
    ]

    const standings = calculateStandings(sampleTeams, matches, 'A')
    const teamA = standings.find(t => t.id === 't1')
    expect(teamA.played).toBe(0)
  })

  it('should sort the table by tiebreaker rules (Points > Goal Difference > Goals For)', () => {
    // We set up matches so that:
    // Team A and Team B have equal points (3 pts each), but Team A has better Goal Difference.
    // Team B and Team C have equal points (3 pts) and equal Goal Difference (+0), but Team B has more Goals For.
    const matches = [
      {
        id: 'm1',
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        status: 'completed',
        result: { scoreA: 4, scoreB: 0 }, // Team A: 3pts, +4 GD, 4 GF
      },
      {
        id: 'm2',
        group: 'A',
        teamA: 't2',
        teamB: 't3',
        status: 'completed',
        result: { scoreA: 5, scoreB: 4 }, // Team B: 3pts, -3 GD, 6 GF (after both matches)
      },
      {
        id: 'm3',
        group: 'A',
        teamA: 't3',
        teamB: 't1',
        status: 'completed',
        result: { scoreA: 4, scoreB: 1 }, // Team C: 3pts, +2 GD, 8 GF (after both matches)
      },
    ]

    // Expecting:
    // 1. Team A: 3 pts, +1 GD (5 GF, 4 GA)
    // 2. Team C: 3 pts, +2 GD (8 GF, 6 GA) --> Wait, let's calculate:
    // Team A:
    // m1: GF +4, GA +0. m3: GF +1, GA +4. Total: 3 pts, GF 5, GA 4, GD +1.
    // Team B:
    // m1: GF +0, GA +4. m2: GF +5, GA +4. Total: 3 pts, GF 5, GA 8, GD -3.
    // Team C:
    // m2: GF +4, GA +5. m3: GF +4, GA +1. Total: 3 pts, GF 8, GA 6, GD +2.
    //
    // So order should be:
    // 1st: Team C (3 pts, +2 GD)
    // 2nd: Team A (3 pts, +1 GD)
    // 3rd: Team B (3 pts, -3 GD)

    const standings = calculateStandings(sampleTeams, matches, 'A')
    expect(standings[0].id).toBe('t3')
    expect(standings[1].id).toBe('t1')
    expect(standings[2].id).toBe('t2')
  })

  it('should resolve tie by Goals For when points and goal difference are identical', () => {
    const matches = [
      {
        id: 'm1',
        group: 'A',
        teamA: 't1',
        teamB: 't3',
        status: 'completed',
        result: { scoreA: 3, scoreB: 0 }, // Team A: 3pts, +3 GD, 3 GF. Team C: 0pts, -3 GD, 0 GF.
      },
      {
        id: 'm2',
        group: 'A',
        teamA: 't2',
        teamB: 't3',
        status: 'completed',
        result: { scoreA: 4, scoreB: 1 }, // Team B: 3pts, +3 GD, 4 GF. Team C: 0pts, -6 GD, 1 GF.
      },
    ]

    // Team A and B both have 3 pts and +3 Goal Difference.
    // Team B has 4 Goals For, Team A has 3 Goals For.
    // B should be ranked higher than A.
    const standings = calculateStandings(sampleTeams, matches, 'A')
    expect(standings[0].id).toBe('t2') // Team B
    expect(standings[1].id).toBe('t1') // Team A
  })
})

describe('Team Standings Rank (getTeamStandingRank)', () => {
  const sampleTeams = [
    { id: 't1', name: 'Team A', group: 'A' },
    { id: 't2', name: 'Team B', group: 'A' },
    { id: 't3', name: 'Team C', group: 'A' },
  ]

  it('should return correct 1-indexed standing rank for team', () => {
    const matches = [
      {
        id: 'm1',
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        status: 'completed',
        result: { scoreA: 2, scoreB: 0 }, // t1 wins
      },
    ]

    const rankA = getTeamStandingRank(sampleTeams, matches, 't1')
    const rankB = getTeamStandingRank(sampleTeams, matches, 't2')
    const rankC = getTeamStandingRank(sampleTeams, matches, 't3')

    expect(rankA).toBe(1)
    expect(rankC).toBe(2) // Team C has better GD (0) than Team B (-2)
    expect(rankB).toBe(3) // Team B is last due to -2 GD
  })

  it('should return null if team is not found or has no group', () => {
    const rank = getTeamStandingRank(sampleTeams, [], 'non-existent')
    expect(rank).toBeNull()
  })
})

describe('Standings Integration - Adding Results Workflow', () => {
  const sampleTeams = [
    { id: 't1', name: 'Team A', group: 'A' },
    { id: 't2', name: 'Team B', group: 'A' },
  ]

  it('should only update group standings when a match is fully completed', () => {
    // 1. Initial State: A scheduled match with no result
    let match = {
      id: 'm1',
      group: 'A',
      teamA: 't1',
      teamB: 't2',
      status: 'scheduled',
      result: null,
    }

    let standings = calculateStandings(sampleTeams, [match], 'A')
    let teamA = standings.find(t => t.id === 't1')
    let teamB = standings.find(t => t.id === 't2')

    // Expecting 0 games played and 0 points for both teams
    expect(teamA.played).toBe(0)
    expect(teamA.pts).toBe(0)
    expect(teamB.played).toBe(0)
    expect(teamB.pts).toBe(0)

    // 2. Transition State: Match starts and is "live", with scores recorded
    match = {
      ...match,
      status: 'live',
      result: { scoreA: 2, scoreB: 1 }, // Team A is leading in the live game
    }

    standings = calculateStandings(sampleTeams, [match], 'A')
    teamA = standings.find(t => t.id === 't1')
    teamB = standings.find(t => t.id === 't2')

    // Live matches should NOT affect official standings yet (remains 0 played/0 pts)
    expect(teamA.played).toBe(0)
    expect(teamA.pts).toBe(0)
    expect(teamB.played).toBe(0)
    expect(teamB.pts).toBe(0)

    // 3. Final State: Match is "completed" and result is final
    match = {
      ...match,
      status: 'completed',
    }

    standings = calculateStandings(sampleTeams, [match], 'A')
    teamA = standings.find(t => t.id === 't1')
    teamB = standings.find(t => t.id === 't2')

    // Standings must now reflect the final result
    expect(teamA.played).toBe(1)
    expect(teamA.won).toBe(1)
    expect(teamA.pts).toBe(3)
    expect(teamA.gf).toBe(2)
    expect(teamA.ga).toBe(1)

    expect(teamB.played).toBe(1)
    expect(teamB.lost).toBe(1)
    expect(teamB.pts).toBe(0)
    expect(teamB.gf).toBe(1)
    expect(teamB.ga).toBe(2)
  })
})
