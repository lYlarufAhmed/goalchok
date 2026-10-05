import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKnockoutStore } from '../stores/useKnockoutStore'
import { mergeKnockoutMatches } from '../utils/matchMerge'
import { useTournamentRepository } from './useTournamentRepository'
import { useTenantContext } from './useTenantContext'

export const queryKeys = {
  teams: (orgId, tournamentId) => ['teams', orgId, tournamentId],
  matches: (orgId, tournamentId) => ['matches', orgId, tournamentId],
  groups: (orgId, tournamentId) => ['groups', orgId, tournamentId],
  settings: (orgId, tournamentId) => ['settings', orgId, tournamentId],
}

export function useTeamsQuery() {
  const { orgId, tournamentId } = useTenantContext()
  const repository = useTournamentRepository()
  return useQuery({
    queryKey: queryKeys.teams(orgId, tournamentId),
    queryFn: () => repository.fetchTeams(),
    staleTime: 5_000,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  })
}

export function useMatchesQuery() {
  const { orgId, tournamentId } = useTenantContext()
  const repository = useTournamentRepository()
  const koMatches = useKnockoutStore((s) => s.knockoutMatches)
  const query = useQuery({
    queryKey: queryKeys.matches(orgId, tournamentId),
    queryFn: () => repository.fetchMatches(),
    staleTime: 5_000,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  })

  const mergedData = useMemo(
    () => (query.data ? mergeKnockoutMatches(query.data, koMatches) : query.data),
    [query.data, koMatches]
  )

  return {
    ...query,
    data: mergedData,
  }
}

export function useGroupsQuery() {
  const { orgId, tournamentId } = useTenantContext()
  const repository = useTournamentRepository()
  return useQuery({
    queryKey: queryKeys.groups(orgId, tournamentId),
    queryFn: () => repository.fetchGroups(),
    staleTime: 60_000,
  })
}

export function useSettingsQuery() {
  const { orgId, tournamentId } = useTenantContext()
  const repository = useTournamentRepository()
  return useQuery({
    queryKey: queryKeys.settings(orgId, tournamentId),
    queryFn: () => repository.fetchSettings(),
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
  const repository = useTournamentRepository()
  const createTeam = useMutation({
    mutationFn: (data) => repository.saveTeam(data),
    onSuccess: invalidate,
  })
  const updateTeam = useMutation({
    mutationFn: ({ id, data }) => repository.saveTeam({ id, ...data }),
    onSuccess: invalidate,
  })
  const deleteTeam = useMutation({
    mutationFn: (id) => repository.deleteTeam(id),
    onSuccess: invalidate,
  })
  // The multi-store write order lives inside the repository now.
  const assignGroups = useMutation({
    mutationFn: (groups) => repository.assignGroups(groups),
    onSuccess: invalidate,
  })
  const clearGroups = useMutation({
    mutationFn: (teams) => repository.clearGroups(teams),
    onSuccess: invalidate,
  })

  return { createTeam, updateTeam, deleteTeam, assignGroups, clearGroups }
}

export function useMatchMutations() {
  const invalidate = useInvalidateAll()
  const repository = useTournamentRepository()
  const createMatch = useMutation({
    mutationFn: (data) => repository.saveMatch(data),
    onSuccess: invalidate,
  })
  const saveResult = useMutation({
    mutationFn: ({ id, result }) => repository.saveMatchResult(id, result),
    onSuccess: invalidate,
  })
  const deleteMatch = useMutation({
    mutationFn: (id) => repository.deleteMatch(id),
    onSuccess: invalidate,
  })
  const updateMatchSchedule = useMutation({
    mutationFn: ({ id, data }) => repository.saveMatch({ id, ...data }),
    onSuccess: invalidate,
  })
  const setMatchLive = useMutation({
    mutationFn: (id) => repository.setMatchStatus(id, 'live'),
    onSuccess: invalidate,
  })
  const updateLiveScore = useMutation({
    mutationFn: ({ id, scoreA, scoreB, events }) =>
      repository.updateLiveScore(id, { scoreA, scoreB, events }),
    onSuccess: invalidate,
  })
  const postponeMatch = useMutation({
    mutationFn: (id) => repository.setMatchStatus(id, 'postponed'),
    onSuccess: invalidate,
  })
  const restoreMatch = useMutation({
    mutationFn: (id) => repository.setMatchStatus(id, 'scheduled'),
    onSuccess: invalidate,
  })
  const generateSchedule = useMutation({
    mutationFn: (matchesList) => repository.generateSchedule(matchesList),
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
    generateSchedule,
  }
}
