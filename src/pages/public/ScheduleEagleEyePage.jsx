import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ScheduleEagleEyeView from '../../components/common/ScheduleEagleEyeView'
import TournamentBracketView from '../../components/common/TournamentBracketView'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import { useTeamsQuery, useMatchesQuery } from '../../hooks/useQueries'
import { useTranslation } from '../../hooks/useTranslation'
import { haptic } from '../../hooks/useHaptics'

export default function ScheduleEagleEyePage() {
  const { t, lang } = useTranslation()
  const [view, setView] = useState('table') // 'table' or 'bracket'
  
  const {
    data: teams = [],
    isLoading: teamsLoading,
    isError: teamsError,
    refetch: refetchTeams,
  } = useTeamsQuery()
  const {
    data: matches = [],
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
  } = useMatchesQuery()

  // Prefetch data
  useEffect(() => {
    if (!teamsLoading && !matchesLoading) return
  }, [teamsLoading, matchesLoading])

  const isLoading = teamsLoading || matchesLoading
  const isError = teamsError || matchesError

  if (isLoading) return <LoadingState message={t.schedule.loading} />
  if (isError) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          message={t.schedule.error}
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
    ? { right: view === 'table' ? '0.25rem' : 'calc(50% + 0.25rem)', left: 'auto' }
    : { left: view === 'table' ? '0.25rem' : 'calc(50% + 0.25rem)', right: 'auto' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-6 lg:px-8 xl:px-12 space-y-6 lg:space-y-8 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto"
    >
      {/* Segmented control view toggle with sliding indicator */}
      <div className="flex bg-bg-surface rounded-xl p-1 mb-6 lg:mb-8 relative z-0 max-w-sm mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => {
            haptic.light()
            setView('table')
          }}
          className={`flex-1 py-2.5 lg:py-3 text-xs lg:text-sm font-bold z-10 transition-colors duration-200 ${view === 'table' ? 'text-white schedule-seg-active' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {t.schedule.tableView}
        </button>
        <button
          type="button"
          onClick={() => {
            haptic.light()
            setView('bracket')
          }}
          className={`flex-1 py-2.5 lg:py-3 text-xs lg:text-sm font-bold z-10 transition-colors duration-200 ${view === 'bracket' ? 'text-white schedule-seg-active' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {t.schedule.bracketView}
        </button>
        <div
          className="absolute top-1 bottom-1 bg-accent rounded-lg transition-all duration-300 -z-10"
          style={{
            width: `calc(50% - 0.5rem)`,
            ...indicatorStyle,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {view === 'table' ? (
            <ScheduleEagleEyeView teams={teams} matches={matches} />
          ) : (
            <TournamentBracketView teams={teams} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
