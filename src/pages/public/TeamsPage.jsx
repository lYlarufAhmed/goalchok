import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import DarkCard from '../../components/common/DarkCard'
import TeamLogo from '../../components/common/TeamLogo'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { useTeamsSubscription } from '../../hooks/useTournamentRepository'
import { haptic } from '../../hooks/useHaptics'
import { useTranslation } from '../../hooks/useTranslation'

export default function TeamsPage() {
  const { t, lang } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: teams = [], isLoading, isError, refetch } = useTeamsSubscription()

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesGroup = filter === 'all' || team.group === filter
      const matchesSearch = team.name.includes(searchQuery)
      return matchesGroup && matchesSearch
    })
  }, [teams, filter, searchQuery])

  if (isLoading) return <LoadingState message={t.teams.loading} />
  if (isError) {
    return (
      <div className="px-4 py-6">
        <ErrorState message={t.teams.error} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-12 space-y-6 lg:space-y-8 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-center mb-6 lg:mb-8">{t.teams.title}</h1>

      <div className="flex gap-2 lg:gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t.teams.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-surface border border-border rounded-xl py-3 lg:py-3.5 pe-10 ps-4 text-sm lg:text-base focus:outline-none focus:border-accent transition-colors text-text-primary placeholder:text-text-secondary"
          />
          <Search size={18} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>

        <select
          value={filter}
          onChange={(e) => {
            haptic.light()
            setFilter(e.target.value)
          }}
          className="bg-bg-surface border border-border rounded-xl py-3 lg:py-3.5 px-4 text-sm lg:text-base focus:outline-none focus:border-accent transition-colors text-text-primary appearance-none"
        >
          <option value="all">{t.teams.all}</option>
          <option value="A">{lang === 'ar' ? 'المجموعة أ' : 'Group A'}</option>
          <option value="B">{lang === 'ar' ? 'المجموعة ب' : 'Group B'}</option>
          <option value="C">{lang === 'ar' ? 'المجموعة ج' : 'Group C'}</option>
        </select>
      </div>

      {teams.length === 0 ? (
        <EmptyState title={t.teams.emptyTitle} message={t.teams.emptyMsg} />
      ) : filteredTeams.length === 0 ? (
        <EmptyState title={t.teams.noResultsTitle} message={t.teams.noResultsMsg} />
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredTeams.map((team) => (
            <motion.div
              key={team.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Link
                to={`/teams/${team.id}`}
                onClick={() => {
                  haptic.light()
                }}
              >
                <DarkCard hover className="p-4 lg:p-6 flex flex-col items-center justify-center gap-3 aspect-square border-t border-border">
                  <TeamLogo logo={team.logo} name={team.name} color={team.color} size="lg" />
                  <div className="text-center">
                    <h3 className="font-bold text-text-primary text-sm lg:text-base">{team.name}</h3>
                    <span className="text-[10px] lg:text-xs text-text-secondary">
                      {team.group ? (lang === 'ar' ? `المجموعة ${team.group === 'A' ? 'أ' : team.group === 'B' ? 'ب' : team.group === 'C' ? 'ج' : team.group}` : `Group ${team.group}`) : t.teams.awaitingDraw}
                    </span>
                  </div>
                </DarkCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
