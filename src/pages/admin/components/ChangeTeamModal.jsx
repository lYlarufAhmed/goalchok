import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search } from 'lucide-react'
import { haptic } from '../../../hooks/useHaptics'
import { useI18n } from '../../../i18n/useI18n'
import TeamLogo from '../../../components/common/TeamLogo'

/**
 * ChangeTeamModal — lets the admin replace a qualified team with any tournament team.
 * Shows all 12 teams with logo, name, group, pts, gd, gf stats.
 */
export default function ChangeTeamModal({
  isOpen,
  onClose,
  onSelect,
  currentTeamId,
  currentSeedLabel,
  teams,
  allStandings, // { A: [...], B: [...], C: [...] }
}) {
  const [search, setSearch] = useState('')
  const { t, isAr } = useI18n()

  const getTeamStats = (teamId) => {
    for (const group of ['A', 'B', 'C']) {
      const standings = allStandings?.[group] || []
      const standing = standings.find((s) => s.id === teamId)
      if (standing) {
        return {
          pts: standing.pts,
          gd: standing.gf - standing.ga,
          gf: standing.gf,
        }
      }
    }
    return { pts: 0, gd: 0, gf: 0 }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teams.filter((team) =>
      !q ||
      team.name.toLowerCase().includes(q) ||
      (team.group || '').toLowerCase().includes(q)
    )
  }, [teams, search])

  const handleSelect = (team) => {
    haptic.medium()
    const stats = getTeamStats(team.id)
    onSelect({
      teamId: team.id,
      name: team.name,
      logo: team.logo || null,
      color: team.color || null,
      group: team.group || '',
      pts: stats.pts,
      gd: stats.gd,
      gf: stats.gf,
      qualifyType: 'manual',
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative w-full max-w-lg max-h-[88vh] flex flex-col glass-card rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-bg-card/95 backdrop-blur-md shrink-0">
              <div>
                <h2 className="text-lg font-bold">{t('knockout.selectReplacement')}</h2>
                {currentSeedLabel && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {isAr ? `المنصب الحالي: ${currentSeedLabel}` : `Replacing: ${currentSeedLabel}`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center hover:bg-bg-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border shrink-0">
              <div className="relative">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('knockout.searchTeam')}
                  className="w-full bg-bg-surface border border-border rounded-xl py-2.5 ps-9 pe-3 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Team list */}
            <div className="overflow-y-auto flex-1 p-2">
              <div className="space-y-1.5">
                {filtered.map((team) => {
                  const stats = getTeamStats(team.id)
                  const isCurrent = team.id === currentTeamId
                  const gd = stats.gd

                  return (
                    <motion.button
                      key={team.id}
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => handleSelect(team)}
                      disabled={isCurrent}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-start transition-all ${
                        isCurrent
                          ? 'bg-accent/10 border border-accent/30 opacity-60 cursor-not-allowed'
                          : 'bg-bg-surface hover:bg-bg-primary border border-transparent hover:border-accent/20 active:scale-[0.98]'
                      }`}
                    >
                      <TeamLogo logo={team.logo} name={team.name} color={team.color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{team.name}</p>
                        <p className="text-xs text-text-secondary">
                          {t('knockout.group')} {team.group || '—'}
                          {isCurrent && (
                            <span className="ms-2 text-accent font-medium">
                              {isAr ? '(المنصب الحالي)' : '(current)'}
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0 text-xs" dir="ltr">
                        <div className="text-center">
                          <p className="font-bold text-accent">{stats.pts}</p>
                          <p className="text-text-secondary">{t('knockout.pts')}</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-bold ${gd > 0 ? 'text-success' : gd < 0 ? 'text-danger' : 'text-text-secondary'}`}>
                            {gd > 0 ? `+${gd}` : gd}
                          </p>
                          <p className="text-text-secondary">{t('knockout.gd')}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-text-primary">{stats.gf}</p>
                          <p className="text-text-secondary">{t('knockout.gf')}</p>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="py-8 text-center text-text-secondary text-sm">
                    {isAr ? 'لا توجد فرق مطابقة' : 'No teams found'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
