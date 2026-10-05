import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ScheduleEagleEyeView from '../../components/common/ScheduleEagleEyeView'
import TournamentBracketView from '../../components/common/TournamentBracketView'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import { useTeamsQuery, useMatchesQuery } from '../../hooks/useQueries'
import { useAppStore } from '../../stores/useAppStore'
import { haptic } from '../../hooks/useHaptics'

const t = {
  ar: {
    title: 'جدول',
    subtitle: 'جدول المباريات الشامل',
    tableView: 'جدول المباريات',
    bracketView: 'الطريق إلى النهائي',
    loading: 'جاري تحميل الجدول...',
    error: 'تعذر تحميل الجدول',
  },
  en: {
    title: 'Schedule',
    subtitle: 'Complete match schedule overview',
    tableView: 'Match Table',
    bracketView: 'Road to Final',
    loading: 'Loading schedule...',
    error: 'Failed to load schedule',
  },
}

export default function AdminScheduleEagleEyePage() {
  const lang = useAppStore((s) => s.language)
  const [view, setView] = useState('table')
  const { data: teams = [], isLoading: teamsLoading, isError: teamsFetchError, refetch: fetchTeams } = useTeamsQuery()
  const { data: matches = [], isLoading: matchesLoading, isError: matchesFetchError, refetch: fetchMatches } = useMatchesQuery()

  const isLoading = teamsLoading || matchesLoading
  const isError = teamsFetchError || matchesFetchError
  const strings = t[lang]
  const isAr = lang === 'ar'
  const indicatorStyle = isAr
    ? { right: view === 'table' ? '0.25rem' : 'calc(50% + 0.25rem)', left: 'auto' }
    : { left: view === 'table' ? '0.25rem' : 'calc(50% + 0.25rem)', right: 'auto' }

  if (isLoading) return <LoadingState message={strings.loading} />
  if (isError) {
    return (
      <div className="p-4">
        <ErrorState
          message={teamsFetchError || matchesFetchError || strings.error}
          onRetry={() => {
            fetchTeams()
            fetchMatches()
          }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">{strings.title}</h1>
        <p className="text-sm text-text-secondary">{strings.subtitle}</p>
      </div>

      <div className="flex bg-bg-surface rounded-xl p-1 relative z-0 max-w-sm mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => {
            haptic.light()
            setView('table')
          }}
          className={`flex-1 py-2.5 text-xs font-bold z-10 transition-colors duration-200 ${view === 'table' ? 'text-white schedule-seg-active' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {strings.tableView}
        </button>
        <button
          type="button"
          onClick={() => {
            haptic.light()
            setView('bracket')
          }}
          className={`flex-1 py-2.5 text-xs font-bold z-10 transition-colors duration-200 ${view === 'bracket' ? 'text-white schedule-seg-active' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {strings.bracketView}
        </button>
        <div
          className="absolute top-1 bottom-1 bg-accent rounded-lg transition-all duration-300 -z-10"
          style={{
            width: 'calc(50% - 0.5rem)',
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
            <TournamentBracketView teams={teams} isAdmin />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
