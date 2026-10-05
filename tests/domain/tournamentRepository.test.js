import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryTournamentRepository } from '../../src/domain/tournamentRepository'

describe('InMemoryTournamentRepository', () => {
  let repo

  beforeEach(() => {
    repo = new InMemoryTournamentRepository()
  })

  describe('Teams Operations', () => {
    it('creates and fetches teams', async () => {
      const team = await repo.createTeam({
        name: 'FC Barcelona',
        manager: 'Xavi',
        players: [{ name: 'Pedri', number: 8 }],
        group: 'A',
      })
      expect(team.id).toBeDefined()
      expect(team.name).toBe('FC Barcelona')

      const teams = await repo.getTeams()
      expect(teams).toHaveLength(1)
      expect(teams[0].name).toBe('FC Barcelona')
    })

    it('updates and deletes a team', async () => {
      const team = await repo.createTeam({ name: 'Real Madrid', manager: 'Ancelotti' })
      await repo.updateTeam(team.id, { manager: 'Solari' })

      let teams = await repo.getTeams()
      expect(teams[0].manager).toBe('Solari')

      await repo.deleteTeam(team.id)
      teams = await repo.getTeams()
      expect(teams).toHaveLength(0)
    })

    it('updates team groups mapping and clears team groups', async () => {
      const t1 = await repo.createTeam({ name: 'Team 1' })
      const t2 = await repo.createTeam({ name: 'Team 2' })

      await repo.updateTeamGroups({ [t1.id]: 'A', [t2.id]: 'B' })
      let teams = await repo.getTeams()
      expect(teams.find((t) => t.id === t1.id).group).toBe('A')
      expect(teams.find((t) => t.id === t2.id).group).toBe('B')

      await repo.clearAllTeamGroups([t1.id, t2.id])
      teams = await repo.getTeams()
      expect(teams.every((t) => t.group === null)).toBe(true)
    })
  })

  describe('Group Matches Operations', () => {
    it('creates, fetches, and updates group matches', async () => {
      const match = await repo.createMatch({
        group: 'A',
        teamA: 't1',
        teamB: 't2',
        date: '2026-08-20',
        time: '18:00',
        venue: 'Stadium 1',
      })
      expect(match.id).toBeDefined()
      expect(match.status).toBe('scheduled')

      const matches = await repo.getMatches()
      expect(matches).toHaveLength(1)

      await repo.saveMatchResult(match.id, { scoreA: 2, scoreB: 1 })
      const updatedMatches = await repo.getMatches()
      expect(updatedMatches[0].status).toBe('completed')
      expect(updatedMatches[0].result.scoreA).toBe(2)
    })

    it('bulk creates matches and postpones/restores match', async () => {
      const created = await repo.bulkCreateMatches([
        { group: 'A', teamA: 't1', teamB: 't2', venue: 'V1' },
        { group: 'B', teamA: 't3', teamB: 't4', venue: 'V2' },
      ])
      expect(created).toHaveLength(2)

      await repo.setMatchPostponed(created[0].id)
      let matches = await repo.getMatches()
      expect(matches.find((m) => m.id === created[0].id).status).toBe('postponed')

      await repo.restoreMatchScheduled(created[0].id)
      matches = await repo.getMatches()
      expect(matches.find((m) => m.id === created[0].id).status).toBe('scheduled')
    })
  })

  describe('Knockout Matches Operations', () => {
    it('manages knockout matches', async () => {
      const koMatch = await repo.createKnockoutMatch({
        round: 'QF',
        matchLabel: 'QF 1',
        teamA: 't1',
        teamB: 't2',
      })
      expect(koMatch.id).toBeDefined()

      let koList = await repo.getKnockoutMatches()
      expect(koList).toHaveLength(1)

      await repo.updateKnockoutMatch(koMatch.id, { status: 'completed' })
      koList = await repo.getKnockoutMatches()
      expect(koList[0].status).toBe('completed')

      await repo.clearKnockoutMatches()
      koList = await repo.getKnockoutMatches()
      expect(koList).toHaveLength(0)
    })
  })

  describe('Groups & Settings', () => {
    it('saves and fetches groups and settings', async () => {
      await repo.saveGroups({ A: ['t1'], B: ['t2'] })
      const groups = await repo.getGroups()
      expect(groups.A).toEqual(['t1'])
      expect(groups.locked).toBe(true)

      await repo.updateSettings({ theme: 'light' })
      const settings = await repo.getSettings()
      expect(settings.theme).toBe('light')
    })
  })

  describe('Live Score Operations', () => {
    it('updates and clears live score state', async () => {
      await repo.setLiveMatch('m1', { scoreA: 1, scoreB: 0, status: 'live' })
      let liveData = await repo.getLiveMatch('m1')
      expect(liveData.scoreA).toBe(1)

      await repo.updateLiveScore('m1', 2, 0, [])
      liveData = await repo.getLiveMatch('m1')
      expect(liveData.scoreA).toBe(2)

      await repo.clearLiveMatch('m1')
      liveData = await repo.getLiveMatch('m1')
      expect(liveData).toBeNull()
    })
  })
})
