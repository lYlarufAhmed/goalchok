import { useState } from 'react'
import { motion } from 'framer-motion'
import MatchRow from '../../components/common/MatchRow'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { useMatchesSubscription, useTeamsSubscription } from '../../hooks/useTournamentRepository'
import { useAppStore } from '../../stores/useAppStore'
import { useNavigate } from 'react-router-dom'
import { haptic } from '../../hooks/useHaptics'
import { compareMatchesByDateTime } from '../../utils/matchHelpers'

const strings = {
  ar: {
    title: 'المباريات',
    noMatches: 'لا توجد مباريات',
    noMatchesDesc: 'لا توجد مباريات تطابق الفلتر المحدد',
    error: 'تعذر تحميل المباريات',
  },
  en: {
    title: 'Matches',
    noMatches: 'No matches found',
    noMatchesDesc: 'No matches match the selected filter',
    error: 'Failed to load matches',
  },
}

const filters = [
  { id: 'all', arLabel: 'الكل', enLabel: 'All' },
  { id: 'live', arLabel: 'مباشر', enLabel: 'Live' },
  { id: 'completed', arLabel: 'منتهية', enLabel: 'Finished' },
  { id: 'upcoming', arLabel: 'قادمة', enLabel: 'Upcoming' },
]

// Page-level variants — consumed by AnimatePresence in AppLayout
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -14,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// Stagger container for the match list
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.08 },
  },
}

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function MatchesPage() {
  const lang = useAppStore((s) => s.language)
  const navigate = useNavigate()
  const { data: matches = [], isLoading, isError, refetch } = useMatchesSubscription()
  const { data: teams = [] } = useTeamsSubscription()
  const [filter, setFilter] = useState('all')

  const isAr = lang === 'ar'
  const s = strings[lang]

  const indicatorStyle = isAr
    ? { right: `calc(${filters.findIndex((f) => f.id === filter) * 25}% + 0.25rem)`, left: 'auto' }
    : { left: `calc(${filters.findIndex((f) => f.id === filter) * 25}% + 0.25rem)`, right: 'auto' }

  const filteredMatches = matches
    .filter((m) => {
      if (filter === 'all') return true
      if (filter === 'upcoming') return m.status === 'scheduled' || m.status === 'postponed'
      if (filter === 'live') return m.status === 'live'
      if (filter === 'completed') return m.status === 'completed'
      return true
    })
    .sort((a, b) => {
      const aIsKO = !!a.round
      const bIsKO = !!b.round
      if (aIsKO && !bIsKO) return -1
      if (!aIsKO && bIsKO) return 1
      if (aIsKO && bIsKO) {
        const roundPriority = { F: 3, SF: 2, QF: 1 }
        const aPriority = roundPriority[a.round] || 0
        const bPriority = roundPriority[b.round] || 0
        if (aPriority !== bPriority) return bPriority - aPriority
      }
      return compareMatchesByDateTime(a, b, 'desc')
    })

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="px-4 py-6 lg:px-8 xl:px-12 space-y-6 lg:space-y-8 min-h-[calc(100vh-12rem)] relative max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto"
    >
      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-center mb-6 lg:mb-8">{s.title}</h1>

      {/* Filter tab bar */}
      <div
        className="flex bg-bg-surface rounded-xl p-1 mb-6 lg:mb-8 relative z-0 max-w-md mx-auto"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              haptic.light()
              setFilter(f.id)
            }}
            className={`flex-1 py-2 lg:py-2.5 text-sm lg:text-base font-semibold rounded-lg transition-colors relative z-10 ${
              filter === f.id ? 'text-white dark:text-black' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {isAr ? f.arLabel : f.enLabel}
          </button>
        ))}
        <div
          className="absolute top-1 bottom-1 bg-accent rounded-lg transition-all duration-300 -z-10"
          style={{ width: `calc(25% - 0.5rem)`, ...indicatorStyle }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12 lg:py-16">
          <div className="w-10 h-10 lg:w-12 lg:h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <ErrorState message={s.error} onRetry={refetch} />
      ) : filteredMatches.length === 0 ? (
        <EmptyState title={s.noMatches} message={s.noMatchesDesc} />
      ) : (
        <motion.div
          key={filter}
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1 lg:space-y-2"
        >
          {filteredMatches.map((match) => (
            <motion.div key={match.id} variants={rowVariants}>
              <MatchRow
                match={match}
                teamA={teams.find((t) => t.id === match.teamA)}
                teamB={teams.find((t) => t.id === match.teamB)}
                onClick={() => {
                  haptic.light()
                  navigate(`/matches/${match.id}`)
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
