import * as teamsService from '../services/teamsService'
import * as matchesService from '../services/matchesService'
import * as knockoutService from '../services/knockoutService'
import * as groupsService from '../services/groupsService'
import * as settingsService from '../services/settingsService'
import * as liveMatchService from '../services/liveMatchService'
import { generateUUID } from '../utils/uuid'

/**
 * In-Memory implementation of TournamentRepository for testing and offline environments.
 */
export class InMemoryTournamentRepository {
  constructor() {
    this.teams = new Map()
    this.matches = new Map()
    this.knockoutMatches = new Map()
    this.groups = { A: [], B: [], C: [], locked: false }
    this.settings = { drawLocked: false, tournamentPhase: 'مرحلة المجموعات', theme: 'dark', language: 'ar' }
    this.knockoutSettings = { step: 1, qualifiedTeams: [], champion: null }
    this.liveMatches = new Map()
  }

  // --- Teams ---
  async getTeams() {
    return Array.from(this.teams.values())
  }

  async createTeam(data) {
    const id = data.id || generateUUID()
    const team = {
      id,
      name: (data.name || '').trim(),
      manager: (data.manager || '').trim(),
      players: data.players || [],
      logo: data.logo || null,
      color: data.color || null,
      group: data.group || null,
      createdAt: new Date().toISOString(),
    }
    this.teams.set(id, team)
    return team
  }

  async updateTeam(id, updates) {
    const existing = this.teams.get(id)
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        name: updates.name !== undefined ? (updates.name || '').trim() : existing.name,
        manager: updates.manager !== undefined ? (updates.manager || '').trim() : existing.manager,
      }
      this.teams.set(id, updated)
    }
  }

  async deleteTeam(id) {
    this.teams.delete(id)
  }

  async updateTeamGroups(groupMap) {
    Object.entries(groupMap).forEach(([teamId, group]) => {
      const team = this.teams.get(teamId)
      if (team) {
        this.teams.set(teamId, { ...team, group })
      }
    })
  }

  async clearAllTeamGroups(teamIds) {
    teamIds.forEach((id) => {
      const team = this.teams.get(id)
      if (team) {
        this.teams.set(id, { ...team, group: null })
      }
    })
  }

  // --- Group Matches ---
  async getMatches() {
    return Array.from(this.matches.values())
  }

  async createMatch(data) {
    const id = data.id || generateUUID()
    const match = {
      id,
      group: data.group,
      teamA: data.teamA,
      teamB: data.teamB,
      date: data.date || '',
      time: data.time || '',
      venue: (data.venue || '').trim(),
      status: 'scheduled',
      result: null,
    }
    this.matches.set(id, match)
    return match
  }

  async updateMatch(id, updates) {
    const existing = this.matches.get(id)
    if (existing) {
      this.matches.set(id, { ...existing, ...updates })
    }
  }

  async bulkCreateMatches(matchesList) {
    const created = []
    for (const data of matchesList) {
      const match = await this.createMatch(data)
      created.push(match)
    }
    return created
  }

  async deleteMatch(id) {
    this.matches.delete(id)
  }

  async saveMatchResult(id, result, status = 'completed') {
    const existing = this.matches.get(id)
    if (existing) {
      this.matches.set(id, {
        ...existing,
        status,
        result: {
          scoreA: Number(result.scoreA) || 0,
          scoreB: Number(result.scoreB) || 0,
          scorers: result.scorers || [],
          yellowCards: result.yellowCards || [],
          redCards: result.redCards || [],
        },
      })
    }
  }

  async setMatchPostponed(id) {
    await this.updateMatch(id, { status: 'postponed', result: null })
  }

  async restoreMatchScheduled(id) {
    await this.updateMatch(id, { status: 'scheduled', result: null })
  }

  // --- Knockout Matches ---
  async getKnockoutMatches() {
    return Array.from(this.knockoutMatches.values())
  }

  async createKnockoutMatch(data) {
    const id = data.id || generateUUID()
    const match = {
      id,
      round: data.round,
      matchLabel: data.matchLabel,
      teamA: data.teamA,
      teamB: data.teamB,
      date: data.date || '',
      time: data.time || '',
      venue: data.venue || '',
      status: data.status || 'scheduled',
      result: data.result || null,
    }
    this.knockoutMatches.set(id, match)
    return match
  }

  async updateKnockoutMatch(id, updates) {
    const existing = this.knockoutMatches.get(id)
    if (existing) {
      this.knockoutMatches.set(id, { ...existing, ...updates })
    }
  }

  async deleteKnockoutMatch(id) {
    this.knockoutMatches.delete(id)
  }

  async syncKnockoutMatches(matchesList) {
    this.knockoutMatches.clear()
    for (const m of matchesList) {
      await this.createKnockoutMatch(m)
    }
    return matchesList
  }

  async clearKnockoutMatches() {
    this.knockoutMatches.clear()
  }

  // --- Groups & Settings ---
  async getGroups() {
    return this.groups
  }

  async saveGroups(groups) {
    this.groups = {
      A: groups.A || [],
      B: groups.B || [],
      C: groups.C || [],
      locked: true,
    }
  }

  async clearGroups() {
    this.groups = { A: [], B: [], C: [], locked: false }
  }

  async getSettings() {
    return this.settings
  }

  async updateSettings(updates) {
    this.settings = { ...this.settings, ...updates }
  }

  async saveKnockoutSettings(settings) {
    this.knockoutSettings = { ...this.knockoutSettings, ...settings }
  }

  // --- Live Match ---
  async getLiveMatch(matchId) {
    return this.liveMatches.get(matchId) || null
  }

  async setLiveMatch(matchId, data) {
    this.liveMatches.set(matchId, {
      scoreA: data.scoreA ?? 0,
      scoreB: data.scoreB ?? 0,
      status: data.status ?? 'live',
      events: data.events ?? [],
    })
  }

  async updateLiveScore(matchId, scoreA, scoreB, events = []) {
    const existing = this.liveMatches.get(matchId) || {}
    this.liveMatches.set(matchId, {
      ...existing,
      scoreA,
      scoreB,
      status: 'live',
      events,
    })
  }

  async clearLiveMatch(matchId) {
    this.liveMatches.delete(matchId)
  }

  subscribeLiveMatch(matchId, callback) {
    callback(this.getLiveMatch(matchId))
    return () => {}
  }
}

/**
 * Firebase-backed implementation of TournamentRepository.
 */
export class FirebaseTournamentRepository {
  // Teams
  getTeams() {
    return teamsService.fetchTeams()
  }
  createTeam(data) {
    return teamsService.createTeam(data)
  }
  updateTeam(id, updates) {
    return teamsService.updateTeamDoc(id, updates)
  }
  deleteTeam(id) {
    return teamsService.deleteTeamDoc(id)
  }
  updateTeamGroups(groupMap) {
    return teamsService.updateTeamGroups(groupMap)
  }
  clearAllTeamGroups(teamIds) {
    return teamsService.clearAllTeamGroups(teamIds)
  }

  // Group Matches
  getMatches() {
    return matchesService.fetchMatches()
  }
  createMatch(data) {
    return matchesService.createMatch(data)
  }
  updateMatch(id, updates) {
    return matchesService.updateMatchDoc(id, updates)
  }
  bulkCreateMatches(matchesList) {
    return matchesService.bulkCreateMatches(matchesList)
  }
  deleteMatch(id) {
    return matchesService.deleteMatchDoc(id)
  }
  saveMatchResult(id, result, status) {
    return matchesService.saveMatchResult(id, result, status)
  }
  setMatchPostponed(id) {
    return matchesService.setMatchPostponed(id)
  }
  restoreMatchScheduled(id) {
    return matchesService.restoreMatchScheduled(id)
  }

  // Knockout Matches
  getKnockoutMatches() {
    return knockoutService.fetchKnockoutMatches()
  }
  createKnockoutMatch(data) {
    return knockoutService.createKnockoutMatch(data)
  }
  updateKnockoutMatch(id, updates) {
    return knockoutService.updateKnockoutMatch(id, updates)
  }
  deleteKnockoutMatch(id) {
    return knockoutService.deleteKnockoutMatch(id)
  }
  syncKnockoutMatches(matchesList) {
    return knockoutService.syncKnockoutMatches(matchesList)
  }
  clearKnockoutMatches() {
    return knockoutService.clearKnockoutMatches()
  }

  // Groups & Settings
  getGroups() {
    return groupsService.fetchGroups()
  }
  saveGroups(groups) {
    return groupsService.saveGroups(groups)
  }
  clearGroups() {
    return groupsService.clearGroupsDoc()
  }
  getSettings() {
    return settingsService.fetchSettings()
  }
  updateSettings(updates) {
    return settingsService.updateSettings(updates)
  }

  // Live Matches
  setLiveMatch(matchId, data) {
    return liveMatchService.setLiveMatch(matchId, data)
  }
  updateLiveScore(matchId, scoreA, scoreB, events) {
    return liveMatchService.updateLiveScore(matchId, scoreA, scoreB, events)
  }
  clearLiveMatch(matchId) {
    return liveMatchService.clearLiveMatch(matchId)
  }
  subscribeLiveMatch(matchId, callback) {
    return liveMatchService.subscribeLiveMatch(matchId, callback)
  }
}

// Default export uses FirebaseTournamentRepository
export const tournamentRepository = new FirebaseTournamentRepository()
