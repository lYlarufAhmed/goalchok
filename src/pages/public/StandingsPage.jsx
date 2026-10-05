import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import StandingsTable from '../../components/common/StandingsTable'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { useTranslation } from '../../hooks/useTranslation'
import { calculateStandings } from '../../utils/standings'
import { getBestThirdPlacedTeamIds } from '../../utils/knockoutUtils'
import { haptic } from '../../hooks/useHaptics'
import { useTeamsSubscription, useMatchesSubscription } from '../../hooks/useTournamentRepository'

const GROUPS = ['A', 'B', 'C']

export default function StandingsPage() {
  const { t, lang } = useTranslation()
  const [activeGroup, setActiveGroup] = useState('A')
  const { data: teams = [], isLoading: teamsLoading, isError: teamsError, refetch: refetchTeams } = useTeamsSubscription()
  const { data: matches = [], isLoading: matchesLoading, isError: matchesError, refetch: refetchMatches } = useMatchesSubscription()

  const standings = useMemo(
    () => calculateStandings(teams, matches, activeGroup),
    [teams, matches, activeGroup]
  )

  const bestThirdTeamIds = useMemo(
    () => getBestThirdPlacedTeamIds(teams, matches),
    [teams, matches]
  )

  const isLoading = teamsLoading || matchesLoading
  const isError = teamsError || matchesError

  if (isLoading) return <LoadingState message={t.standings.loading} />
  if (isError) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          message={t.standings.error}
          onRetry={() => {
            refetchTeams()
            refetchMatches()
          }}
        />
      </div>
    )
  }

  const isAr = lang === 'ar'
  const indicatorStyle = isAr
    ? { right: `calc(${GROUPS.indexOf(activeGroup) * 33.333}% + 0.25rem)`, left: 'auto' }
    : { left: `calc(${GROUPS.indexOf(activeGroup) * 33.333}% + 0.25rem)`, right: 'auto' }

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-12 space-y-6 lg:space-y-8 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-center mb-6 lg:mb-8">{t.standings.title}</h1>

      <div className="flex bg-bg-surface rounded-xl p-1 mb-6 lg:mb-8 relative z-0 max-w-md mx-auto">
        {GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => {
              haptic.light()
              setActiveGroup(group)
            }}
            className={`flex-1 py-2 lg:py-2.5 text-sm lg:text-base font-medium z-10 transition-colors ${activeGroup === group ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {lang === 'ar' ? `المجموعة ${group === 'A' ? 'أ' : group === 'B' ? 'ب' : group === 'C' ? 'ج' : group}` : `Group ${group}`}
          </button>
        ))}
        <div
          className="absolute top-1 bottom-1 bg-accent rounded-lg transition-all duration-300 -z-10"
          style={{
            width: `calc(33.333% - 0.5rem)`,
            ...indicatorStyle,
          }}
        />
      </div>

      {standings.length === 0 ? (
        <EmptyState
          title={t.standings.emptyTitle}
          message={t.standings.emptyMessage}
        />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={activeGroup}
            transition={{ duration: 0.3 }}
          >
            <StandingsTable standings={standings} bestThirdTeamIds={bestThirdTeamIds} />
          </motion.div>

          <div className="flex gap-4 lg:gap-6 text-[10px] lg:text-xs text-text-secondary justify-center px-4 mt-4 lg:mt-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-success" />
              {t.standings.directQualify}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-warning" />
              {t.standings.bestThird}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
