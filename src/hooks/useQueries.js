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
  return { createTeam, updateTeam, deleteTeam }
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
  return { createMatch, saveResult, deleteMatch }
}
