const ALLOWED_TRANSITIONS = {
  scheduled: ['live', 'completed', 'postponed'],
  live: ['completed', 'postponed', 'scheduled'],
  completed: ['scheduled'],
  postponed: ['scheduled', 'live'],
}

export class MatchLifecycleService {
  /**
   * Validates if a match status transition is allowed.
   * @param {string} currentStatus
   * @param {string} targetStatus
   * @returns {boolean}
   */
  validateStateTransition(currentStatus, targetStatus) {
    if (!ALLOWED_TRANSITIONS[currentStatus]) {
      throw new Error(`Invalid current status: ${currentStatus}`)
    }
    const allowed = ALLOWED_TRANSITIONS[currentStatus]
    if (!allowed.includes(targetStatus)) {
      throw new Error(`Invalid state transition from ${currentStatus} to ${targetStatus}`)
    }
    return true
  }

  /**
   * Validates and sanitizes match result payload.
   * @param {Object} result
   * @param {Object} [options]
   * @param {boolean} [options.isKnockout=false]
   * @param {string} [options.teamA]
   * @param {string} [options.teamB]
   * @returns {Object}
   */
  validateResultPayload(result, { isKnockout = false, teamA, teamB } = {}) {
    if (!result || typeof result !== 'object') {
      throw new Error('Result payload is required')
    }

    const scoreA = Number(result.scoreA)
    const scoreB = Number(result.scoreB)

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      throw new Error('Scores must be non-negative numbers')
    }

    const scorers = (result.scorers || [])
      .filter((s) => s && s.player)
      .map((s) => ({
        player: s.player,
        teamId: s.teamId,
        minute: s.minute != null && s.minute !== '' ? Number(s.minute) : undefined,
      }))

    const yellowCards = (result.yellowCards || []).map((c) => ({
      player: c.player,
      teamId: c.teamId,
    }))

    const redCards = (result.redCards || []).map((c) => ({
      player: c.player,
      teamId: c.teamId,
    }))

    const validated = {
      scoreA,
      scoreB,
      scorers,
      yellowCards,
      redCards,
    }

    if (isKnockout && scoreA === scoreB) {
      const winner = result.penaltyWinner
      const isValidWinner =
        winner && (!teamA || !teamB || winner === teamA || winner === teamB)
      if (!isValidWinner) {
        throw new Error('Knockout match drawn score requires a valid penaltyWinner')
      }
      validated.penaltyWinner = winner
    } else if (result.penaltyWinner) {
      validated.penaltyWinner = result.penaltyWinner
    }

    return validated
  }

  /**
   * Transition a match to live status.
   * @param {Object} match
   * @returns {Object} Updated match
   */
  startMatch(match) {
    const currentStatus = match.status || 'scheduled'
    this.validateStateTransition(currentStatus, 'live')

    return {
      ...match,
      status: 'live',
      result: {
        scoreA: 0,
        scoreB: 0,
        scorers: [],
      },
    }
  }

  /**
   * Update live match scores.
   * @param {Object} match
   * @param {Object} params
   * @param {number} params.scoreA
   * @param {number} params.scoreB
   * @param {Array} [params.events=[]]
   * @returns {Object} Updated match
   */
  updateLiveScore(match, { scoreA, scoreB, events = [] }) {
    if (match.status !== 'live') {
      throw new Error('Cannot update live score for match that is not live')
    }

    const numA = Number(scoreA)
    const numB = Number(scoreB)

    if (isNaN(numA) || isNaN(numB) || numA < 0 || numB < 0) {
      throw new Error('Scores must be non-negative numbers')
    }

    return {
      ...match,
      result: {
        ...(match.result || {}),
        scoreA: numA,
        scoreB: numB,
      },
      events,
    }
  }

  /**
   * Transition match to completed status with result.
   * @param {Object} match
   * @param {Object} result
   * @param {Object} [options]
   * @returns {Object} Updated match
   */
  completeMatch(match, result, options = {}) {
    const currentStatus = match.status || 'scheduled'
    this.validateStateTransition(currentStatus, 'completed')

    const validatedResult = this.validateResultPayload(result, {
      ...options,
      teamA: match.teamA,
      teamB: match.teamB,
    })

    return {
      ...match,
      status: 'completed',
      result: validatedResult,
    }
  }

  /**
   * Postpone match.
   * @param {Object} match
   * @returns {Object} Updated match
   */
  postponeMatch(match) {
    const currentStatus = match.status || 'scheduled'
    this.validateStateTransition(currentStatus, 'postponed')

    return {
      ...match,
      status: 'postponed',
      result: null,
    }
  }

  /**
   * Reset match to scheduled status.
   * @param {Object} match
   * @returns {Object} Updated match
   */
  resetMatch(match) {
    const currentStatus = match.status || 'scheduled'
    this.validateStateTransition(currentStatus, 'scheduled')

    return {
      ...match,
      status: 'scheduled',
      result: null,
    }
  }
}
