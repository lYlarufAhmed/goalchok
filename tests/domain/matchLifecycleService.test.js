import { describe, it, expect } from 'vitest'
import { MatchLifecycleService } from '../../src/domain/matchLifecycleService'

describe('MatchLifecycleService', () => {
  const service = new MatchLifecycleService()

  describe('validateStateTransition', () => {
    it('allows valid state transitions', () => {
      expect(service.validateStateTransition('scheduled', 'live')).toBe(true)
      expect(service.validateStateTransition('scheduled', 'completed')).toBe(true)
      expect(service.validateStateTransition('scheduled', 'postponed')).toBe(true)
      expect(service.validateStateTransition('live', 'completed')).toBe(true)
      expect(service.validateStateTransition('live', 'postponed')).toBe(true)
      expect(service.validateStateTransition('live', 'scheduled')).toBe(true)
      expect(service.validateStateTransition('completed', 'scheduled')).toBe(true)
      expect(service.validateStateTransition('postponed', 'scheduled')).toBe(true)
      expect(service.validateStateTransition('postponed', 'live')).toBe(true)
    })

    it('throws error for invalid state transitions', () => {
      expect(() => service.validateStateTransition('completed', 'live')).toThrow(
        /Invalid state transition from completed to live/
      )
      expect(() => service.validateStateTransition('completed', 'postponed')).toThrow(
        /Invalid state transition/
      )
      expect(() => service.validateStateTransition('unknown', 'live')).toThrow(
        /Invalid current status/
      )
    })
  })

  describe('validateResultPayload', () => {
    it('validates a standard group match result', () => {
      const payload = {
        scoreA: 2,
        scoreB: 1,
        scorers: [{ player: 'Messic', teamId: 't1', minute: 15 }],
      }
      const validated = service.validateResultPayload(payload)
      expect(validated.scoreA).toBe(2)
      expect(validated.scoreB).toBe(1)
      expect(validated.scorers).toHaveLength(1)
      expect(validated.scorers[0]).toEqual({ player: 'Messic', teamId: 't1', minute: 15 })
    })

    it('throws error if scores are negative or non-numeric', () => {
      expect(() => service.validateResultPayload({ scoreA: -1, scoreB: 2 })).toThrow(
        /Scores must be non-negative numbers/
      )
      expect(() => service.validateResultPayload({ scoreA: 'invalid', scoreB: 2 })).toThrow(
        /Scores must be non-negative numbers/
      )
    })

    it('requires penaltyWinner for knockout match with draw score', () => {
      const drawPayload = { scoreA: 2, scoreB: 2 }
      expect(() =>
        service.validateResultPayload(drawPayload, { isKnockout: true, teamA: 't1', teamB: 't2' })
      ).toThrow(/Knockout match drawn score requires a valid penaltyWinner/)

      const validDrawPayload = { scoreA: 2, scoreB: 2, penaltyWinner: 't1' }
      const validated = service.validateResultPayload(validDrawPayload, {
        isKnockout: true,
        teamA: 't1',
        teamB: 't2',
      })
      expect(validated.penaltyWinner).toBe('t1')
    })
  })

  describe('startMatch', () => {
    it('transitions a scheduled match to live status', () => {
      const match = { id: 'm1', status: 'scheduled', teamA: 't1', teamB: 't2' }
      const updated = service.startMatch(match)
      expect(updated.status).toBe('live')
      expect(updated.result).toEqual({ scoreA: 0, scoreB: 0, scorers: [] })
    })

    it('throws error if starting a completed match', () => {
      const match = { id: 'm1', status: 'completed' }
      expect(() => service.startMatch(match)).toThrow()
    })
  })

  describe('updateLiveScore', () => {
    it('updates live match score', () => {
      const match = { id: 'm1', status: 'live', result: { scoreA: 0, scoreB: 0 } }
      const updated = service.updateLiveScore(match, { scoreA: 1, scoreB: 0 })
      expect(updated.result.scoreA).toBe(1)
      expect(updated.result.scoreB).toBe(0)
    })

    it('throws error if match is not live', () => {
      const match = { id: 'm1', status: 'scheduled' }
      expect(() => service.updateLiveScore(match, { scoreA: 1, scoreB: 0 })).toThrow(
        /Cannot update live score for match that is not live/
      )
    })
  })

  describe('completeMatch', () => {
    it('completes a match with validated result', () => {
      const match = { id: 'm1', status: 'live', teamA: 't1', teamB: 't2' }
      const updated = service.completeMatch(match, { scoreA: 3, scoreB: 1 })
      expect(updated.status).toBe('completed')
      expect(updated.result.scoreA).toBe(3)
      expect(updated.result.scoreB).toBe(1)
    })
  })

  describe('postponeMatch and resetMatch', () => {
    it('postpones a match', () => {
      const match = { id: 'm1', status: 'scheduled' }
      const updated = service.postponeMatch(match)
      expect(updated.status).toBe('postponed')
      expect(updated.result).toBeNull()
    })

    it('resets a completed match to scheduled', () => {
      const match = { id: 'm1', status: 'completed', result: { scoreA: 1, scoreB: 0 } }
      const updated = service.resetMatch(match)
      expect(updated.status).toBe('scheduled')
      expect(updated.result).toBeNull()
    })
  })
})
