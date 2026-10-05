import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InMemoryTournamentRepository } from '../../src/domain/tournamentRepository'

describe('InMemoryTournamentRepository — the persistence seam', () => {
  let repo

  beforeEach(() => {
    repo = new InMemoryTournamentRepository({ orgId: 'org-1', tournamentId: 't-1' })
  })

  describe('Teams', () => {
    it('creates and fetches teams', async () => {
      await repo.saveTeam({
        name: 'FC Barcelona',
        manager: 'Xavi',
        players: [{ name: 'Pedri', number: 8 }],
        group: 'A',
      })
      const teams = await repo.fetchTeams()
      expect(teams).toHaveLength(1)
      expect(teams[0].name).toBe('FC Barcelona')
      expect(teams[0].group).toBe('A')
    })

    it('updates and deletes a team through the same verb', async () => {
      await repo.saveTeam({ name: 'Real Madrid', manager: 'Ancelotti' })
      const [created] = await repo.fetchTeams()

      await repo.saveTeam({ id: created.id, manager: 'Solari' })
      let teams = await repo.fetchTeams()
      expect(teams[0].manager).toBe('Solari')

      await repo.deleteTeam(created.id)
      teams = await repo.fetchTeams()
      expect(teams).toHaveLength(0)
    })

    it('subscribes to teams and pushes updates', async () => {
      const seen = []
      const unsubscribe = repo.subscribeTeams((teams) => seen.push(teams))
      await new Promise((r) => setTimeout(r, 5))

      await repo.saveTeam({ name: 'New Team' })
      await new Promise((r) => setTimeout(r, 5))
      expect(seen.length).toBeGreaterThanOrEqual(2)
      expect(seen[seen.length - 1].docs).toHaveLength(1)

      unsubscribe()
    })
  })

  describe('Group Matches', () => {
    it('creates, fetches, and completes a match through the lifecycle', async () => {
      await repo.saveMatch({
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        date: '2026-08-20',
        time: '18:00',
        venue: 'Stadium 1',
      })
      let matches = await repo.fetchMatches()
      expect(matches).toHaveLength(1)
      expect(matches[0].status).toBe('scheduled')

      await repo.saveMatchResult(matches[0].id, { scoreA: 2, scoreB: 1 })
      matches = await repo.fetchMatches()
      expect(matches[0].status).toBe('completed')
      expect(matches[0].result.scoreA).toBe(2)
    })

    it('rejects an invalid lifecycle transition', async () => {
      await repo.saveMatch({ group: 'A', teamA: 't1', teamB: 't2', venue: 'V' })
      const [match] = await repo.fetchMatches()
      // scheduled -> completed is legal, but completing twice is not
      await repo.saveMatchResult(match.id, { scoreA: 1, scoreB: 0 })
      await expect(repo.saveMatchResult(match.id, { scoreA: 2, scoreB: 0 })).rejects.toThrow(
        /Invalid state transition/
      )
    })

    it('goes live with a dual write into the RTDB emulation', async () => {
      await repo.saveMatch({ group: 'A', teamA: 't1', teamB: 't2', venue: 'V' })
      const [match] = await repo.fetchMatches()

      await repo.setMatchStatus(match.id, 'live')
      let live = repo.liveMatches.get(match.id)
      expect(live).toEqual({ scoreA: 0, scoreB: 0, status: 'live', events: [] })

      await repo.updateLiveScore(match.id, { scoreA: 2, scoreB: 1, events: [{ type: 'goal' }] })
      const [updated] = await repo.fetchMatches()
      live = repo.liveMatches.get(match.id)
      expect(updated.status).toBe('live')
      expect(updated.result.scoreA).toBe(2)
      expect(live.scoreB).toBe(1)
      expect(live.events).toEqual([{ type: 'goal' }])
    })

    it('postpones and restores via validated status transitions', async () => {
      await repo.saveMatch({ group: 'A', teamA: 't1', teamB: 't2', venue: 'V' })
      const [match] = await repo.fetchMatches()

      await repo.setMatchStatus(match.id, 'postponed')
      let matches = await repo.fetchMatches()
      expect(matches[0].status).toBe('postponed')
      expect(matches[0].result).toBeNull()

      await repo.setMatchStatus(match.id, 'scheduled')
      matches = await repo.fetchMatches()
      expect(matches[0].status).toBe('scheduled')
    })

    it('bulk creates a generated schedule', async () => {
      const created = await repo.generateSchedule([
        { group: 'A', teamA: 't1', teamB: 't2', venue: 'V1' },
        { group: 'B', teamA: 't3', teamB: 't4', venue: 'V2' },
      ])
      expect(created).toHaveLength(2)
      expect(created.every((m) => m.status === 'scheduled')).toBe(true)
    })
  })

  describe('Knockout Matches', () => {
    it('manages knockout matches', async () => {
      await repo.createKnockoutMatch({ round: 'QF', matchLabel: 'QF 1', teamA: 't1', teamB: 't2' })
      let koList = await repo.fetchKnockoutMatches()
      expect(koList).toHaveLength(1)

      await repo.updateKnockoutMatch(koList[0].id, { status: 'completed' })
      koList = await repo.fetchKnockoutMatches()
      expect(koList[0].status).toBe('completed')

      await repo.clearKnockoutMatches()
      koList = await repo.fetchKnockoutMatches()
      expect(koList).toHaveLength(0)
    })
  })

  describe('Groups & Settings', () => {
    it('saves and fetches groups and settings', async () => {
      await repo.saveGroups({ A: ['t1'], B: ['t2'] })
      const groups = await repo.fetchGroups()
      expect(groups.A).toEqual(['t1'])

      await repo.saveSettings({ tournamentPhase: 'knockout' })
      const settings = await repo.fetchSettings()
      expect(settings.tournamentPhase).toBe('knockout')
    })
  })

  describe('Write orchestration absorbed into the repository', () => {
    it('assignGroups stamps teams, saves the draw, and locks it in one verb', async () => {
      await repo.saveTeam({ name: 'T1' })
      await repo.saveTeam({ name: 'T2' })
      await repo.saveTeam({ name: 'T3' })
      const teams = await repo.fetchTeams()
      const [t1, t2, t3] = teams

      await repo.assignGroups({ A: [t1.id, t2.id], B: [t3.id], locked: true })

      const updated = await repo.fetchTeams()
      expect(updated.find((t) => t.id === t1.id).group).toBe('A')
      expect(updated.find((t) => t.id === t2.id).group).toBe('A')
      expect(updated.find((t) => t.id === t3.id).group).toBe('B')
      expect((await repo.fetchGroups()).A).toEqual([t1.id, t2.id])
      expect((await repo.fetchSettings()).drawLocked).toBe(true)
    })

    it('clearGroups resets teams, the draw, and the lock', async () => {
      await repo.saveTeam({ name: 'T1', group: 'A' })
      await repo.saveTeam({ name: 'T2', group: 'B' })
      const teams = await repo.fetchTeams()

      await repo.clearGroups(teams)

      const updated = await repo.fetchTeams()
      expect(updated.every((t) => t.group === null)).toBe(true)
      expect((await repo.fetchSettings()).drawLocked).toBe(false)
    })
  })

  describe('Subscription is the test surface', () => {
    it('notifies match subscribers after every mutation', async () => {
      const cb = vi.fn()
      repo.subscribeMatches(cb)
      await new Promise((r) => setTimeout(r, 5))

      await repo.saveMatch({ group: 'A', teamA: 't1', teamB: 't2', venue: 'V' })
      await new Promise((r) => setTimeout(r, 5))
      expect(cb).toHaveBeenCalled()
      const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0]
      expect(lastCall.docs).toHaveLength(1)
    })
  })
})
