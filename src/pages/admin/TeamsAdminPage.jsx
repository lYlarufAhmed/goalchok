import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Users, UserCircle } from 'lucide-react'
import { haptic } from '../../hooks/useHaptics'
import GoldButton from '../../components/common/GoldButton'
import DarkCard from '../../components/common/DarkCard'
import EmptyState from '../../components/common/EmptyState'
import { useTeamsQuery, useTeamMutations } from '../../hooks/useQueries'
import { MAX_TEAMS } from '../../utils/tournamentLimits'
import TeamFormModal from './components/TeamFormModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import TeamLogo from '../../components/common/TeamLogo'
import { useI18n } from '../../i18n/useI18n'

export default function TeamsAdminPage() {
  const { data: teams = [] } = useTeamsQuery()
  const { createTeam, updateTeam, deleteTeam } = useTeamMutations()
  const { t } = useI18n()

  const [formOpen, setFormOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [deletingTeam, setDeletingTeam] = useState(null)

  const teamCount = teams.length
  const maxReached = teamCount >= MAX_TEAMS
  const progressPercent = (teamCount / MAX_TEAMS) * 100

  const openAddForm = () => {
    setEditingTeam(null)
    setFormOpen(true)
  }

  const openEditForm = (team) => {
    setEditingTeam(team)
    setFormOpen(true)
  }

  const handleFormSubmit = async (data) => {
    if (editingTeam) {
      await updateTeam.mutateAsync({ id: editingTeam.id, data })
    } else {
      await createTeam.mutateAsync(data)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('teams.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('teams.subtitle')}</p>
        </div>

        <GoldButton onClick={openAddForm} disabled={maxReached} className="shrink-0">
          <Plus size={20} />
          <span>{t('teams.addTeam')}</span>
        </GoldButton>
      </div>

      {/* Team count */}
      <DarkCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary">{t('teams.registeredTeams')}</span>
          <span className="text-xl font-bold text-accent">
            {teamCount}/{MAX_TEAMS}
          </span>
        </div>
        <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {maxReached && (
          <p className="text-xs text-success mt-2">{t('teams.teamComplete')}</p>
        )}
      </DarkCard>

      {teams.length === 0 ? (
        <EmptyState
          title={t('teams.noTeams')}
          message={t('teams.noTeamsMsg')}
          icon={Users}
          action={
            <GoldButton onClick={openAddForm}>
              <Plus size={18} />
              <span>{t('teams.addFirstTeam')}</span>
            </GoldButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DarkCard className="p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <TeamLogo logo={team.logo} name={team.name} color={team.color} size="lg" />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{team.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                      <UserCircle size={14} />
                      <span className="truncate">{team.manager}</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {team.players.length} {t('teams.playersCount')}
                      {team.group && (
                        <span className="text-accent"> • {t('teams.group')} {team.group}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => openEditForm(team)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bg-surface border border-border text-sm hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-colors"
                  >
                    <Pencil size={15} />
                    <span>{t('common.edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light()
                      setDeletingTeam(team)
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bg-surface border border-border text-sm text-danger hover:bg-danger/10 hover:border-danger/30 transition-colors"
                  >
                    <Trash2 size={15} />
                    <span>{t('common.delete')}</span>
                  </button>
                </div>
              </DarkCard>
            </motion.div>
          ))}
        </div>
      )}

      <TeamFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingTeam(null)
        }}
        onSubmit={handleFormSubmit}
        team={editingTeam}
        maxTeamsReached={maxReached}
        existingColors={
          teams
            .filter((t) => t.color && t.id !== editingTeam?.id)
            .map((t) => t.color)
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingTeam)}
        onClose={() => setDeletingTeam(null)}
        onConfirm={async () => {
          await deleteTeam.mutateAsync(deletingTeam.id)
        }}
        itemName={deletingTeam?.name}
      />
    </div>
  )
}
