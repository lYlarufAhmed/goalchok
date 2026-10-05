import { getDoc, onSnapshot } from 'firebase/firestore'
import * as teamsService from '../services/teamsService'
import * as matchesService from '../services/matchesService'
import * as knockoutService from '../services/knockoutService'
import * as groupsService from '../services/groupsService'
import * as settingsService from '../services/settingsService'
import * as liveMatchService from '../services/liveMatchService'
import { getTenantCollection, getTenantDoc } from '../services/tenantContext'
import { MatchLifecycleService } from './matchLifecycleService'
import { generateUUID } from '../utils/uuid'
import tenant from '../../shared/tenant.json'

const lifecycle = new MatchLifecycleService()

/**
 * TournamentRepository — the single seam between the app and persistence.
 *
 * One interface hides tenant path building, result validation, batching,
 * the Firestore + RTDB dual write for live matches, and multi-store write
 * orchestration. Two adapters justify the seam:
 *   - FirebaseTournamentRepository (production, Firebase backends)
 *   - InMemoryTournamentRepository (tests)
 *
 * The tenant context ({ orgId, tournamentId }) is injected once at
 * construction; callers never see org or tournament identity.
 */

function normalizeTeam(doc) {
  const data = doc.data ? doc.data() : doc
  return {
    id: doc.id,
    ...data,
    players: Array.isArray(data.players) ? data.players : [],
    logo: data.logo || null,
    color: data.color || null,
    group: data.group || null,
    name: data.name || '',
    manager: data.manager || '',
  }
}

function normalizeMatch(doc) {
  const data = doc.data ? doc.data() : doc
  return { id: doc.id, ...data }
}

export class FirebaseTournamentRepository {
  constructor({ orgId, tournamentId }) {
    if (!orgId || !tournamentId) throw new Error('Tenant Context Missing')
    this.orgId = orgId
    this.tournamentId = tournamentId
  }

  // --- Teams ---

  async fetchTeams() {
    return teamsService.fetchTeams(this.orgId, this.tournamentId)
  }

  subscribeTeams(onData, onError) {
    return onSnapshot(
      getTenantCollection(this.orgId, this.tournamentId, 'teams'),
      (snap) => onData(snap.docs.map(normalizeTeam)),
      (err) => onError && onError(err)
    )
  }

  async saveTeam(team) {
    if (team.id) return teamsService.updateTeamDoc(this.orgId, this.tournamentId, team.id, team)
    return teamsService.createTeam({ ...team, orgId: this.orgId, tournamentId: this.tournamentId })
  }

  async deleteTeam(id) {
    return teamsService.deleteTeamDoc(this.orgId, this.tournamentId, id)
  }

  // --- Matches ---

  async fetchMatches() {
    return matchesService.fetchMatches(this.orgId, this.tournamentId)
  }

  subscribeMatches(onData, onError) {
    return onSnapshot(
      getTenantCollection(this.orgId, this.tournamentId, 'matches'),
      (snap) => onData(snap.docs.map(normalizeMatch)),
      (err) => onError && onError(err)
    )
  }

  async saveMatch(match) {
    if (match.id) return matchesService.updateMatchDoc(this.orgId, this.tournamentId, match.id, match)
    return matchesService.createMatch({ ...match, orgId: this.orgId, tournamentId: this.tournamentId })
  }

  async deleteMatch(id) {
    return matchesService.deleteMatchDoc(this.orgId, this.tournamentId, id)
  }

  async generateSchedule(matchesList) {
    return matchesService.bulkCreateMatches(this.orgId, this.tournamentId, matchesList)
  }

  /**
   * Validate the transition to `status` and the result payload, persist,
   * and clear the RTDB live entry (the stream dies with the match).
   */
  async saveMatchResult(id, result, status = 'completed') {
    const docRef = getTenantDoc(this.orgId, this.tournamentId, 'matches', id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw new Error(`Match ${id} not found`)
    const current = normalizeMatch(snap)

    lifecycle.validateStateTransition(current.status, status)
    await matchesService.saveMatchResult(this.orgId, this.tournamentId, id, result, status)
    await liveMatchService.clearLiveMatch(id).catch(() => {})
  }

  /**
   * Validated status transition (scheduled/live/completed/postponed).
   * Going live also opens the RTDB live entry; every other transition
   * closes it.
   */
  async setMatchStatus(id, status) {
    const docRef = getTenantDoc(this.orgId, this.tournamentId, 'matches', id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw new Error(`Match ${id} not found`)
    const current = normalizeMatch(snap)

    let updated
    if (status === 'live') {
      updated = lifecycle.startMatch(current)
      await matchesService.updateMatchDoc(this.orgId, this.tournamentId, id, {
        status: 'live',
        result: updated.result,
      })
      await liveMatchService.setLiveMatch(id, { scoreA: 0, scoreB: 0, status: 'live', events: [] })
      return updated
    }

    if (status === 'postponed') updated = lifecycle.postponeMatch(current)
    else if (status === 'scheduled') updated = lifecycle.resetMatch(current)
    else if (status === 'completed') updated = lifecycle.completeMatch(current, current.result || {})
    else throw new Error(`Unknown status: ${status}`)

    await matchesService.updateMatchDoc(this.orgId, this.tournamentId, id, {
      status: updated.status,
      result: updated.result,
    })
    await liveMatchService.clearLiveMatch(id).catch(() => {})
    return updated
  }

  /**
   * Live score update: validated against the lifecycle, then dual-written
   * to the Firestore match document and the RTDB liveMatches entry so
   * spectator streams and the tournament document never disagree.
   */
  async updateLiveScore(id, { scoreA, scoreB, events = [] }) {
    const docRef = getTenantDoc(this.orgId, this.tournamentId, 'matches', id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw new Error(`Match ${id} not found`)
    const current = normalizeMatch(snap)

    const updated = lifecycle.updateLiveScore(current, { scoreA, scoreB })
    const liveResult = { ...updated.result, events }

    await liveMatchService.updateLiveScore(id, liveResult.scoreA, liveResult.scoreB, events)
    await matchesService.updateMatchDoc(this.orgId, this.tournamentId, id, {
      status: 'live',
      result: liveResult,
    })
    return { ...current, status: 'live', result: liveResult }
  }

  // --- Knockout ---

  async fetchKnockoutMatches() {
    return knockoutService.fetchKnockoutMatches(this.orgId, this.tournamentId)
  }

  async createKnockoutMatch(match) {
    return knockoutService.createKnockoutMatch(this.orgId, this.tournamentId, match)
  }

  async updateKnockoutMatch(id, updates) {
    return knockoutService.updateKnockoutMatch(this.orgId, this.tournamentId, id, updates)
  }

  async deleteKnockoutMatch(id) {
    return knockoutService.deleteKnockoutMatch(this.orgId, this.tournamentId, id)
  }

  async clearKnockoutMatches() {
    return knockoutService.clearKnockoutMatches(this.orgId, this.tournamentId)
  }

  // --- Groups & Settings ---

  async fetchGroups() {
    return groupsService.fetchGroups(this.orgId, this.tournamentId)
  }

  async saveGroups(groups) {
    return groupsService.saveGroups(this.orgId, this.tournamentId, groups)
  }

  async fetchSettings() {
    return settingsService.fetchSettings(this.orgId, this.tournamentId)
  }

  async saveSettings(updates) {
    return settingsService.updateSettings(this.orgId, this.tournamentId, updates)
  }

  // --- Orchestration ---

  /**
   * Draw assignment: persist the groups document, stamp each team's group,
   * and lock the draw — one verb instead of three coordinated writes
   * leaking into a hook.
   */
  async assignGroups(groups) {
    await groupsService.saveGroups(this.orgId, this.tournamentId, groups)

    const groupMap = {}
    Object.entries(groups).forEach(([group, teamIds]) => {
      if (group === 'locked') return
      teamIds.forEach((teamId) => {
        groupMap[teamId] = group
      })
    })
    await teamsService.updateTeamGroups(this.orgId, this.tournamentId, groupMap)

    await settingsService.updateSettings(this.orgId, this.tournamentId, { drawLocked: true })
  }

  /**
   * Inverse of assignGroups: clear the groups document, null every team's
   * group, and unlock the draw.
   */
  async clearGroups(teams) {
    await groupsService.clearGroupsDoc(this.orgId, this.tournamentId)

    const teamIds = teams.map((t) => t.id)
    await teamsService.clearAllTeamGroups(this.orgId, this.tournamentId, teamIds)

    await settingsService.updateSettings(this.orgId, this.tournamentId, { drawLocked: false })
  }
}

/**
 * In-Memory adapter — same interface, plain Maps + listener sets.
 * Documents are emulated as { id, data() } so the normalizers handle
 * both Firestore snapshot docs and plain objects.
 */
export class InMemoryTournamentRepository {
  constructor({ orgId = tenant.defaultOrg, tournamentId = tenant.defaultTournament } = {}) {
    this.orgId = orgId
    this.tournamentId = tournamentId
    this.teams = new Map()
    this.matches = new Map()
    this.knockoutMatches = new Map()
    this.groups = { A: [], B: [], C: [], locked: false }
    this.settings = { drawLocked: false, tournamentPhase: 'مرحلة المجموعات' }
    this.liveMatches = new Map()
    this._teamListeners = new Set()
    this._matchListeners = new Set()
  }

  _emit(listeners, docs) {
    listeners.forEach((cb) => cb({ docs: docs.map((d) => ({ id: d.id, data: () => d })) }))
  }

  _notifyTeams() {
    this._emit(this._teamListeners, Array.from(this.teams.values()))
  }

  _notifyMatches() {
    this._emit(this._matchListeners, Array.from(this.matches.values()))
  }

  // --- Teams ---

  async fetchTeams() {
    return Array.from(this.teams.values()).map((t) => normalizeTeam({ id: t.id, data: () => t }))
  }

  subscribeTeams(onData) {
    this._teamListeners.add(onData)
    // Firestore fires immediately on subscribe; mirror that.
    setTimeout(() => this._notifyTeams(), 0)
    return () => this._teamListeners.delete(onData)
  }

  async saveTeam(team) {
    if (team.id) {
      this.teams.set(team.id, { ...this.teams.get(team.id), ...team })
      this._notifyTeams()
      return { id: team.id }
    }
    const id = generateUUID()
    this.teams.set(id, { ...team, id })
    this._notifyTeams()
    return { id }
  }

  async deleteTeam(id) {
    this.teams.delete(id)
    this._notifyTeams()
  }

  // --- Matches ---

  async fetchMatches() {
    return Array.from(this.matches.values()).map((m) => normalizeMatch({ id: m.id, data: () => m }))
  }

  subscribeMatches(onData) {
    this._matchListeners.add(onData)
    setTimeout(() => this._notifyMatches(), 0)
    return () => this._matchListeners.delete(onData)
  }

  async saveMatch(match) {
    if (match.id) {
      const merged = { ...this.matches.get(match.id), ...match }
      this.matches.set(match.id, merged)
      this._notifyMatches()
      return { id: match.id }
    }
    const id = generateUUID()
    this.matches.set(id, { status: 'scheduled', result: null, ...match, id })
    this._notifyMatches()
    return { id }
  }

  async deleteMatch(id) {
    this.matches.delete(id)
    this._notifyMatches()
  }

  async generateSchedule(matchesList) {
    const created = []
    for (const data of matchesList) {
      const id = generateUUID()
      const match = { status: 'scheduled', result: null, ...data, id }
      this.matches.set(id, match)
      created.push(match)
    }
    this._notifyMatches()
    return created
  }

  async saveMatchResult(id, result, status = 'completed') {
    const current = this.matches.get(id)
    if (!current) throw new Error(`Match ${id} not found`)
    lifecycle.validateStateTransition(current.status, status)
    const validated = lifecycle.completeMatch(current, result)
    this.matches.set(id, { ...current, status: validated.status, result: validated.result })
    this.liveMatches.delete(id)
    this._notifyMatches()
  }

  async setMatchStatus(id, status) {
    const current = this.matches.get(id)
    if (!current) throw new Error(`Match ${id} not found`)

    if (status === 'live') {
      const updated = lifecycle.startMatch(current)
      this.matches.set(id, { ...current, status: 'live', result: updated.result })
      this.liveMatches.set(id, { scoreA: 0, scoreB: 0, status: 'live', events: [] })
      this._notifyMatches()
      return updated
    }

    let updated
    if (status === 'postponed') updated = lifecycle.postponeMatch(current)
    else if (status === 'scheduled') updated = lifecycle.resetMatch(current)
    else if (status === 'completed') updated = lifecycle.completeMatch(current, current.result || {})
    else throw new Error(`Unknown status: ${status}`)

    this.matches.set(id, { ...current, status: updated.status, result: updated.result })
    this.liveMatches.delete(id)
    this._notifyMatches()
    return updated
  }

  async updateLiveScore(id, { scoreA, scoreB, events = [] }) {
    const current = this.matches.get(id)
    if (!current) throw new Error(`Match ${id} not found`)
    const updated = lifecycle.updateLiveScore(current, { scoreA, scoreB })
    const liveResult = { ...updated.result, events }
    this.matches.set(id, { ...current, status: 'live', result: liveResult })
    this.liveMatches.set(id, {
      scoreA: liveResult.scoreA,
      scoreB: liveResult.scoreB,
      status: 'live',
      events,
    })
    this._notifyMatches()
    return { ...current, status: 'live', result: liveResult }
  }

  // --- Knockout ---

  async fetchKnockoutMatches() {
    return Array.from(this.knockoutMatches.values())
  }

  async createKnockoutMatch(match) {
    const id = match.id || generateUUID()
    this.knockoutMatches.set(id, { ...match, id })
    return { id }
  }

  async updateKnockoutMatch(id, updates) {
    const existing = this.knockoutMatches.get(id)
    if (!existing) throw new Error(`Knockout match ${id} not found`)
    this.knockoutMatches.set(id, { ...existing, ...updates })
  }

  async deleteKnockoutMatch(id) {
    this.knockoutMatches.delete(id)
  }

  async clearKnockoutMatches() {
    this.knockoutMatches.clear()
  }

  // --- Groups & Settings ---

  async fetchGroups() {
    return { ...this.groups }
  }

  async saveGroups(groups) {
    this.groups = { ...this.groups, ...groups }
  }

  async fetchSettings() {
    return { ...this.settings }
  }

  async saveSettings(updates) {
    this.settings = { ...this.settings, ...updates }
  }

  // --- Orchestration ---

  async assignGroups(groups) {
    await this.saveGroups(groups)

    Object.entries(groups).forEach(([group, teamIds]) => {
      if (group === 'locked') return
      teamIds.forEach((teamId) => {
        const team = this.teams.get(teamId)
        if (team) this.teams.set(teamId, { ...team, group })
      })
    })
    this._notifyTeams()

    await this.saveSettings({ drawLocked: true })
  }

  async clearGroups(teams) {
    this.groups = { A: [], B: [], C: [], locked: false }
    teams.forEach((t) => {
      const team = this.teams.get(t.id)
      if (team) this.teams.set(t.id, { ...team, group: null })
    })
    this._notifyTeams()
    await this.saveSettings({ drawLocked: false })
  }
}

/**
 * Factory — the composition point for tenant-injected repositories.
 * App code resolves the tenant from the auth store; tests construct
 * InMemoryTournamentRepository directly.
 */
export function createTournamentRepository({ orgId, tournamentId, adapter = 'firebase' } = {}) {
  if (adapter === 'inmemory') {
    return new InMemoryTournamentRepository({ orgId, tournamentId })
  }
  return new FirebaseTournamentRepository({ orgId, tournamentId })
}
