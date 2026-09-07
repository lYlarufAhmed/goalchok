import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKnockoutStore } from '../stores/useKnockoutStore'
import { mergeKnockoutMatches } from '../utils/matchMerge'
import * as teamsService from '../services/teamsService'
import * as matchesService from '../services/matchesService'
import * as groupsService from '../services/groupsService'
import * as settingsService from '../services/settingsService'
import { useTenantContext } from './useTenantContext'

export const queryKeys = {
  teams: (orgId, tournamentId) => ['teams', orgId, tournamentId],
  matches: (orgId, tournamentId) => ['matches', orgId, tournamentId],
  groups: (orgId, tournamentId) => ['groups', orgId, tournamentId],
  settings: (orgId, tournamentId) => ['settings', orgId, tournamentId],
}

export function useTeamsQuery() {
  const { orgId, tournamentId } = useTenantContext()
  return useQuery({
    queryKey: queryKeys.teams(orgId, tournamentId),
    queryFn: () => teamsService.fetchTeams(orgId, tournamentId),
    staleTime: 5_000,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  })
}

export function useMatchesQuery() {
  const { orgId, tournamentId } = useTenantContext()
  const koMatches = useKnockoutStore((s) => s.knockoutMatches)
  const query = useQuery({
    queryKey: queryKeys.matches(orgId, tournamentId),
    queryFn: () => matchesService.fetchMatches(orgId, tournamentId),
    staleTime: 5_000,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  })

  const mergedData = useMemo(() => {
    return query.data ? mergeKnockoutMatches(query.data, koMatches) : query.data
  }, [query.data, koMatches])

  return {
    ...query,
    data: mergedData,
  }
}

export function useGroupsQuery() {
  const { orgId, tournamentId } = useTenantContext()
  return useQuery({
    queryKey: queryKeys.groups(orgId, tournamentId),
    // TODO: update groupsService
    queryFn: groupsService.fetchGroups,
    staleTime: 60_000,
  })
}

export function useSettingsQuery() {
  const { orgId, tournamentId } = useTenantContext()
  return useQuery({
    queryKey: queryKeys.settings(orgId, tournamentId),
    // TODO: update settingsService
    queryFn: settingsService.fetchSettings,
    staleTime: 60_000,
  })
}

export function useInvalidateAll() {
  const queryClient = useQueryClient()
  const { orgId, tournamentId } = useTenantContext()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams(orgId, tournamentId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.matches(orgId, tournamentId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.groups(orgId, tournamentId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.settings(orgId, tournamentId) })
  }
}

export function useTeamMutations() {
  const invalidate = useInvalidateAll()
  const { orgId, tournamentId } = useTenantContext()
  const createTeam = useMutation({
    mutationFn: (data) => teamsService.createTeam({ ...data, orgId, tournamentId }),
    onSuccess: invalidate,
  })
  const updateTeam = useMutation({
    mutationFn: ({ id, data }) => teamsService.updateTeamDoc(orgId, tournamentId, id, data),
    onSuccess: invalidate,
  })
  const deleteTeam = useMutation({
    mutationFn: (id) => teamsService.deleteTeamDoc(orgId, tournamentId, id),
    onSuccess: invalidate,
  })
  const assignGroups = useMutation({
    mutationFn: async (groups) => {
      // TODO: migrate groupsService to multi-tenant
      await groupsService.saveGroups(groups)
      
      const groupMap = {}
      Object.entries(groups).forEach(([group, teamIds]) => {
        if (group === 'locked') return
        teamIds.forEach((teamId) => {
          groupMap[teamId] = group
        })
      })
      await teamsService.updateTeamGroups(orgId, tournamentId, groupMap)
      
      // TODO: migrate settingsService to multi-tenant
      await settingsService.updateSettings({ drawLocked: true })
    },
    onSuccess: invalidate,
  })

  const clearGroups = useMutation({
    mutationFn: async (teams) => {
      // TODO: migrate groupsService to multi-tenant
      await groupsService.clearGroupsDoc()
      
      const teamIds = teams.map((t) => t.id)
      await teamsService.clearAllTeamGroups(orgId, tournamentId, teamIds)
      
      // TODO: migrate settingsService to multi-tenant
      await settingsService.updateSettings({ drawLocked: false })
    },
    onSuccess: invalidate,
  })

  return { createTeam, updateTeam, deleteTeam, assignGroups, clearGroups }
}

export function useMatchMutations() {
  const invalidate = useInvalidateAll()
  const { orgId, tournamentId } = useTenantContext()
  const createMatch = useMutation({
    mutationFn: (data) => matchesService.createMatch({ ...data, orgId, tournamentId }),
    onSuccess: invalidate,
  })
  const saveResult = useMutation({
    mutationFn: ({ id, result }) => matchesService.saveMatchResult(orgId, tournamentId, id, result),
    onSuccess: invalidate,
  })
  const deleteMatch = useMutation({
    mutationFn: (id) => matchesService.deleteMatchDoc(orgId, tournamentId, id),
    onSuccess: invalidate,
  })
  const updateMatchSchedule = useMutation({
    mutationFn: ({ id, data }) => matchesService.updateMatchDoc(orgId, tournamentId, id, data),
    onSuccess: invalidate,
  })
  const setMatchLive = useMutation({
    mutationFn: (id) => matchesService.updateMatchDoc(orgId, tournamentId, id, { status: 'live' }),
    onSuccess: invalidate,
  })
  const updateLiveScore = useMutation({
    mutationFn: ({ id, scoreA, scoreB, events }) => 
      matchesService.updateMatchDoc(orgId, tournamentId, id, { result: { scoreA, scoreB, events } }),
    onSuccess: invalidate,
  })
  const postponeMatch = useMutation({
    mutationFn: (id) => matchesService.setMatchPostponed(orgId, tournamentId, id),
    onSuccess: invalidate,
  })
  const restoreMatch = useMutation({
    mutationFn: (id) => matchesService.restoreMatchScheduled(orgId, tournamentId, id),
    onSuccess: invalidate,
  })
  const generateSchedule = useMutation({
    mutationFn: (matchesList) => matchesService.bulkCreateMatches(orgId, tournamentId, matchesList),
    onSuccess: invalidate,
  })

  return { 
    createMatch, 
    saveResult, 
    deleteMatch,
    updateMatchSchedule,
    setMatchLive,
    updateLiveScore,
    postponeMatch,
    restoreMatch,
    generateSchedule
  }
}
