import { useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { Shuffle, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { haptic } from '../../hooks/useHaptics'
import { useTeamsQuery, useTeamMutations } from '../../hooks/useQueries'
import { MAX_TEAMS, isDrawComplete } from '../../utils/tournamentLimits'
import { useI18n } from '../../i18n/useI18n'
import { resolveTeamColor } from '../../utils/teamColors'
import DeleteConfirmModal from './components/DeleteConfirmModal'

const GROUPS = ['A', 'B', 'C']

function shuffleTeams(teams) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5)
  return {
    A: shuffled.slice(0, 4).map((t) => t.id),
    B: shuffled.slice(4, 8).map((t) => t.id),
    C: shuffled.slice(8, 12).map((t) => t.id),
  }
}

function GroupCard({ group, teamIds, teams, innerRef, hidden = false, itemLabel, isAr }) {
  const groupTeams = teamIds.map((id) => teams.find((t) => t.id === id)).filter(Boolean)

  const groupLabel = isAr
    ? `المجموعة ${group === 'A' ? 'أ' : group === 'B' ? 'ب' : 'ج'}`
    : `Group ${group}`

  return (
    <div
      ref={innerRef}
      className={`glass-card p-4 md:p-5 ${hidden ? 'opacity-0 translate-y-8' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-accent">{groupLabel}</h3>
        <span className="text-xs text-text-secondary bg-bg-surface px-2 py-1 rounded-lg border border-border">
          {groupTeams.length} {itemLabel}
        </span>
      </div>

      <ul className="space-y-3">
        {groupTeams.map((team) => (
          <li
            key={team.id}
            className="flex items-center gap-3 p-2 rounded-xl bg-bg-surface border border-border"
          >
            <div
              className="w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden shrink-0"
              style={
                team.logo
                  ? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }
                  : { backgroundColor: resolveTeamColor(team), borderColor: resolveTeamColor(team) }
              }
            >
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">{team.name?.charAt(0)}</span>
              )}
            </div>
            <span className="font-medium">{team.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DrawAdminPage() {
  const { data: teams = [] } = useTeamsQuery()
  const { assignGroups, clearGroups } = useTeamMutations()
  const drawLocked = false // TODO: Migrate from store to DB settings
  const { t, isAr } = useI18n()

  const [isDrawing, setIsDrawing] = useState(false)
  const [previewGroups, setPreviewGroups] = useState(null)
  const [drawError, setDrawError] = useState(null)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const groupRefs = useRef({ A: null, B: null, C: null })
  const containerRef = useRef(null)

  const teamCount = teams.length
  const drawComplete = isDrawComplete(teams, drawLocked)
  const canDraw = teamCount === MAX_TEAMS && !isDrawing

  const getGroupTeamIds = (group) => {
    if (previewGroups) return previewGroups[group]
    return teams.filter((t) => t.group === group).map((t) => t.id)
  }

  const animateReveal = useCallback(
    (groups) => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Fire async — gsap onComplete doesn't support async,
          // so use .then() to ensure isDrawing resets on error too
          Promise.resolve()
            .then(() => assignGroups.mutateAsync(groups))
            .then(() => {
              setPreviewGroups(null)
              setIsDrawing(false)
              setDrawError(null)
            })
            .catch((err) => {
              console.error('[Draw] assignGroups failed:', err)
              setDrawError(err.message || 'Failed to save draw')
              setPreviewGroups(null)
              setIsDrawing(false)
            })
        },
      })

      GROUPS.forEach((group, index) => {
        const el = groupRefs.current[group]
        if (!el) return

        tl.fromTo(
          el,
          { opacity: 0, y: 60, scale: 0.85, rotateX: -15 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.7,
            ease: 'back.out(1.4)',
          },
          index * 0.6
        )

        tl.fromTo(
          el.querySelectorAll('li'),
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
          index * 0.6 + 0.3
        )
      })

      return tl
    },
    [assignGroups]
  )

  const handleDraw = () => {
    if (!canDraw) return
    setDrawError(null)

    const groups = shuffleTeams(teams)
    setPreviewGroups(groups)
    setIsDrawing(true)

    requestAnimationFrame(() => {
      gsap.set(Object.values(groupRefs.current).filter(Boolean), {
        opacity: 0,
        y: 60,
        scale: 0.85,
      })
      animateReveal(groups)
    })
  }

  const handleRedraw = async () => {
    if (isDrawing) return
    setDrawError(null)

    // First clear existing groups, then re-draw
    try {
      setIsDrawing(true)
      await clearGroups.mutateAsync(teams)
      // After clearing, the teams have no groups, so we can re-draw
      handleDraw()
    } catch (err) {
      console.error('[Draw] clearGroups failed:', err)
      setDrawError(err.message || 'Failed to reset draw')
      setIsDrawing(false)
    }
  }

  if (teamCount < MAX_TEAMS) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('draw.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('draw.subtitleShort')}</p>
        </div>

        <div className="glass-card p-6 md:p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center">
            <AlertCircle size={32} className="text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2">{t('draw.needTeams')}</h2>
            <p className="text-sm text-text-secondary">
              {t('draw.currentTeams')}:{' '}
              <span className="text-accent font-bold">{teamCount}/{MAX_TEAMS}</span>
            </p>
          </div>
          <Link
            to="/admin/teams"
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-black font-bold py-3 px-6 rounded-xl transition-colors"
          >
            <Users size={18} />
            <span>{t('draw.goToTeams')}</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('draw.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('draw.subtitle')}</p>
        </div>
      </div>

      {/* Draw error */}
      {drawError && (
        <div className="glass-card p-4 border border-danger/30 bg-danger/5 flex items-start gap-3 rounded-xl">
          <AlertCircle size={20} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-danger">{t('common.error')}</p>
            <p className="text-xs text-text-secondary mt-1">{drawError}</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawError(null)}
            className="text-text-secondary hover:text-text-primary text-xs px-2 py-1"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Draw button — only show if there are teams and we're not drawing */}
      {!drawComplete && !isDrawing && (
        <div className="glass-card p-6 md:p-8 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-accent/15 border-2 border-accent/40 flex items-center justify-center shadow-[0_0_30px_rgba(245,197,24,0.25)]">
            <Shuffle size={36} className="text-accent-light" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">{t('draw.ready')}</h2>
            <p className="text-sm text-text-secondary">
              {t('draw.readyDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              haptic.intense()
              handleDraw()
            }}
            disabled={isDrawing}
            className="w-full max-w-xs bg-accent hover:bg-accent-hover text-black font-bold text-lg py-4 px-8 rounded-2xl transition-all shadow-[0_4px_25px_rgba(245,197,24,0.4)] hover:shadow-[0_6px_35px_rgba(245,197,24,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {t('draw.performDraw')}
          </button>
        </div>
      )}

      {/* Redraw button — only if draw is complete */}
      {drawComplete && !isDrawing && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              haptic.medium()
              setConfirmResetOpen(true)
            }}
            className="flex items-center gap-2 bg-bg-surface hover:bg-bg-card border border-border text-text-primary font-medium py-2 px-5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw size={16} />
            <span>{isAr ? 'إعادة القرعة' : 'Redraw'}</span>
          </button>
        </div>
      )}

      {/* Drawing indicator */}
      {isDrawing && (
        <div className="text-center py-4">
          <p className="text-accent font-bold animate-pulse">{t('draw.drawing')}</p>
        </div>
      )}

      {/* Group cards — show if draw complete or preview is active */}
      {(previewGroups || drawComplete || isDrawing) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GROUPS.map((group) => (
            <GroupCard
              key={group}
              group={group}
              teamIds={getGroupTeamIds(group)}
              teams={teams}
              innerRef={(el) => {
                groupRefs.current[group] = el
              }}
              hidden={Boolean(previewGroups) && isDrawing}
              itemLabel={isAr ? 'فرق' : 'teams'}
              isAr={isAr}
            />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={async () => {
          setConfirmResetOpen(false)
          await handleRedraw()
        }}
        title={isAr ? 'إعادة القرعة' : 'Redraw Groups'}
        message={
          isAr
            ? 'هل أنت متأكد من إعادة القرعة؟ سيتم إزالة جميع الفرق من المجموعات وإجراء قرعة جديدة.'
            : 'Are you sure you want to redraw? All teams will be removed from groups and a new draw will be performed.'
        }
      />
    </div>
  )
}
