import { Users, Calendar, Shuffle, Clock, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import DarkCard from '../../components/common/DarkCard'
import { useTeamsQuery, useMatchesQuery } from '../../hooks/useQueries'
import { MAX_TEAMS } from '../../stores/useTeamsStore' // Keep helpers if needed for now
import { useI18n } from '../../i18n/useI18n'
import { haptic } from '../../hooks/useHaptics'

export default function DashboardPage() {
  const { data: teams = [] } = useTeamsQuery()
  const { data: matches = [] } = useMatchesQuery()
  const { t } = useI18n()

  const completedMatches = matches.filter((m) => m.status === 'completed')
  const scheduledMatches = matches.filter((m) => m.status === 'scheduled' || m.status === 'live')

  const stats = [
    { label: t('dashboard.registeredTeams'), value: `${teams.length}/${MAX_TEAMS}`, icon: Users, color: 'text-accent' },
    { label: t('dashboard.totalMatches'), value: String(matches.length), icon: Calendar, color: 'text-success' },
    {
      label: t('dashboard.completed'),
      value: `${completedMatches.length}/${matches.length}`,
      icon: Shuffle,
      color: 'text-warning',
    },
    {
      label: t('dashboard.scheduled'),
      value: String(scheduledMatches.length),
      icon: Clock,
      color: 'text-info',
    },
  ]

  const actions = [
    { label: t('dashboard.manageTeams'), path: '/admin/teams', icon: Users, desc: t('dashboard.manageTeamsDesc') },
    { label: t('dashboard.manageMatches'), path: '/admin/matches', icon: Calendar, desc: t('dashboard.manageMatchesDesc') },
    { label: t('dashboard.drawTitle'), path: '/admin/draw', icon: Shuffle, desc: t('dashboard.drawDesc') },
    { label: t('knockout.dashboardLabel'), path: '/admin/knockout', icon: Swords, desc: t('knockout.dashboardDesc') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
          <Users size={24} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')}</h1>
          <p className="text-sm text-text-secondary">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <DarkCard className="p-3 md:p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs md:text-sm text-text-secondary truncate">{stat.label}</span>
                  <Icon size={16} className={stat.color} />
                </div>
                <span className="text-xl md:text-2xl font-bold text-text-primary">{stat.value}</span>
              </DarkCard>
            </motion.div>
          )
        })}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4 mt-8">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Link to={action.path} onClick={() => haptic.light()}>
                  <DarkCard hover className="p-4 flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-bg-surface flex items-center justify-center border border-border group-hover:bg-accent/20 group-hover:border-accent/50 transition-colors">
                      <Icon size={24} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold">{action.label}</h3>
                      <p className="text-xs text-text-secondary">{action.desc}</p>
                    </div>
                  </DarkCard>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
