import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, ChevronDown, Target, AlertCircle } from 'lucide-react'
import { emptyResult } from '../../../stores/useMatchesStore'
import { useI18n } from '../../../i18n/useI18n'
import { haptic } from '../../../hooks/useHaptics'
import TeamLogo from '../../../components/common/TeamLogo'

const emptyScorer = { player: '', minute: '', teamId: '', goalsCount: '1' }
const emptyCard = { player: '', teamId: '' }

function CardEventsSection({
  title,
  items,
  onChange,
  teamA,
  teamB,
  accentClass,
  icon: Icon,
  addLabel,
  noEventsLabel,
  playerLabel,
  teamLabel,
  minuteLabel,
  variant = 'card',
  eventKey,
  fieldErrors = {},
}) {
  const errorPrefix = eventKey || variant
  const [collapsed, setCollapsed] = useState(false)

  const addItem = () => {
    haptic.light()
    onChange([...items, variant === 'scorer' ? { ...emptyScorer } : { ...emptyCard }])
  }

  const removeItem = (index) => {
    haptic.medium()
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, field, value) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))

  const getTeamPlayers = (teamId) => {
    const team = [teamA, teamB].find((t) => t?.id === teamId)
    return team?.players || []
  }

  const fieldError = (index, field) => fieldErrors[`${errorPrefix}-${index}-${field}`]

  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-bg-surface/80 to-bg-surface/40 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          haptic.light()
          setCollapsed(!collapsed)
        }}
        className="w-full flex items-center justify-between p-3.5 hover:bg-bg-surface/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-bg-primary border border-border ${accentClass}`}>
            {Icon && <Icon size={16} />}
          </div>
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          <span className="text-[10px] bg-bg-primary px-2 py-0.5 rounded-full text-text-secondary border border-border">
            {items.reduce((acc, it) => acc + (variant === 'scorer' ? (Number(it.goalsCount) || 1) : 1), 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              addItem()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                addItem()
              }
            }}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-light transition-colors px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20"
          >
            <Plus size={13} />
            <span>{addLabel}</span>
          </span>
          <ChevronDown
            size={16}
            className={`text-text-secondary transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/60 p-3.5 space-y-3 bg-bg-primary/30"
          >
            {items.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-2 italic">
                {noEventsLabel}
              </p>
            ) : (
              items.map((item, index) => {
                const teamPlayers = getTeamPlayers(item.teamId)
                const isSelectedTeamValid = item.teamId === teamA?.id || item.teamId === teamB?.id
                const pErr = fieldError(index, 'player')
                const tErr = fieldError(index, 'teamId')
                const gErr = fieldError(index, 'goalsCount')

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3 rounded-xl bg-bg-surface/80 border border-border/80 space-y-2.5 shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-text-secondary mb-1">
                          {teamLabel}
                        </label>
                        <select
                          value={item.teamId}
                          onChange={(e) => {
                            haptic.light()
                            updateItem(index, 'teamId', e.target.value)
                            updateItem(index, 'player', '')
                          }}
                          className={`w-full text-xs font-medium bg-bg-primary border rounded-lg px-2.5 py-2 text-text-primary focus:outline-none focus:border-accent ${
                            tErr ? 'border-danger' : 'border-border'
                          }`}
                        >
                          <option value="">-- اختر الفريق --</option>
                          {teamA && <option value={teamA.id}>{teamA.name}</option>}
                          {teamB && <option value={teamB.id}>{teamB.name}</option>}
                        </select>
                        {tErr && <p className="text-[10px] text-danger mt-0.5">{tErr}</p>}
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-text-secondary mb-1">
                          {playerLabel}
                        </label>
                        <select
                          value={item.player}
                          disabled={!isSelectedTeamValid}
                          onChange={(e) => {
                            haptic.light()
                            updateItem(index, 'player', e.target.value)
                          }}
                          className={`w-full text-xs font-medium bg-bg-primary border rounded-lg px-2.5 py-2 text-text-primary focus:outline-none focus:border-accent disabled:opacity-40 ${
                            pErr ? 'border-danger' : 'border-border'
                          }`}
                        >
                          <option value="">
                            {!isSelectedTeamValid ? '-- اختر الفريق أولاً --' : '-- اختر اللاعب --'}
                          </option>
                          {teamPlayers.map((p, pIdx) => (
                            <option key={pIdx} value={p.name}>
                              #{p.number} {p.name}
                            </option>
                          ))}
                        </select>
                        {pErr && <p className="text-[10px] text-danger mt-0.5">{pErr}</p>}
                      </div>
                    </div>

                    {variant === 'scorer' && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                        <div>
                          <label className="block text-[10px] font-medium text-text-secondary mb-1">
                            عدد الأهداف
                          </label>
                          <select
                            value={item.goalsCount || '1'}
                            onChange={(e) => {
                              haptic.light()
                              updateItem(index, 'goalsCount', e.target.value)
                            }}
                            className={`w-full text-xs font-medium bg-bg-primary border rounded-lg px-2.5 py-2 text-text-primary focus:outline-none focus:border-accent ${
                              gErr ? 'border-danger' : 'border-border'
                            }`}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <option key={num} value={num}>
                                {num} {num === 1 ? 'هدف' : num === 2 ? 'هدفان' : 'أهداف'}
                              </option>
                            ))}
                          </select>
                          {gErr && <p className="text-[10px] text-danger mt-0.5">{gErr}</p>}
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-text-secondary mb-1">
                            {minuteLabel}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            placeholder="مثال: 15"
                            value={item.minute}
                            onChange={(e) => updateItem(index, 'minute', e.target.value)}
                            className="w-full text-xs bg-bg-primary border border-border rounded-lg px-2.5 py-2 text-text-primary focus:outline-none focus:border-accent"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-xs text-danger/80 hover:text-danger flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-danger/10"
                      >
                        <Trash2 size={13} />
                        <span>حذف</span>
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function YellowIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#EAB308" />
    </svg>
  )
}

function RedIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#EF4444" />
    </svg>
  )
}

function validateEventRows(items, variant, t) {
  const errors = {}
  let hasIncomplete = false

  items.forEach((item, index) => {
    const prefix = `${variant}-${index}`
    if (!item.teamId) {
      errors[`${prefix}-teamId`] = t('matches.teamRequired')
      hasIncomplete = true
    }
    if (!item.player) {
      errors[`${prefix}-player`] = t('matches.playerRequired')
      hasIncomplete = true
    }
    if (variant === 'scorer') {
      const gCount = Number(item.goalsCount || 1)
      if (isNaN(gCount) || gCount < 1) {
        errors[`${prefix}-goalsCount`] = 'يجب أن يكون 1 على الأقل'
        hasIncomplete = true
      }
    }
  })

  return { errors, hasIncomplete }
}

function countGoalsByTeam(scorers, teamId) {
  if (!teamId) return 0
  return scorers
    .filter((s) => s.teamId === teamId)
    .reduce((sum, s) => sum + (Number(s.goalsCount) || 1), 0)
}

function syncScoresFromScorers(scorers, teamA, teamB, currentScoreA, currentScoreB) {
  const fromScorersA = countGoalsByTeam(scorers, teamA?.id)
  const fromScorersB = countGoalsByTeam(scorers, teamB?.id)
  const manualA = Number(currentScoreA) || 0
  const manualB = Number(currentScoreB) || 0
  return {
    scoreA: Math.max(manualA, fromScorersA),
    scoreB: Math.max(manualB, fromScorersB),
  }
}

export default function ResultFormModal({
  isOpen,
  onClose,
  onSubmit,
  match,
  teamA,
  teamB,
  isKnockout = Boolean(match?.round),
}) {
  const [form, setForm] = useState(emptyResult)
  const [penaltyWinner, setPenaltyWinner] = useState(null)
  const [errors, setErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [prevMatch, setPrevMatch] = useState(null)
  const { t, isAr } = useI18n()

  const mapScorers = (items = []) => items.map(item => ({
    player: item.player || '',
    teamId: item.teamId || '',
    minute: item.minute || '',
    goalsCount: '1'
  }))

  const mapCards = (items = []) => items.map((item) => ({ player: item.player || '', teamId: item.teamId || '' }))

  if (isOpen && match && prevMatch !== match) {
    setPrevMatch(match)
    setForm(
      match.result
        ? {
            scoreA: match.result.scoreA,
            scoreB: match.result.scoreB,
            scorers: mapScorers(match.result.scorers),
            yellowCards: mapCards(match.result.yellowCards),
            redCards: mapCards(match.result.redCards),
          }
        : { ...emptyResult, scorers: [], yellowCards: [], redCards: [] }
    )
    setPenaltyWinner(match.result?.penaltyWinner || null)
    setErrors({})
    setFieldErrors({})
  } else if (!isOpen && prevMatch) {
    setPrevMatch(null)
  }

  const isTied = useMemo(() => {
    if (!isKnockout) return false
    const sA = Number(form.scoreA)
    const sB = Number(form.scoreB)
    return !isNaN(sA) && !isNaN(sB) && sA === sB
  }, [form.scoreA, form.scoreB, isKnockout])

  const validationState = useMemo(() => {
    const nextErrors = {}
    if (form.scoreA === '' || form.scoreA < 0) nextErrors.scoreA = t('common.required')
    if (form.scoreB === '' || form.scoreB < 0) nextErrors.scoreB = t('common.required')

    if (isTied && !penaltyWinner) {
      nextErrors.penalty = isAr
        ? 'يجب تحديد الفائز بركلات الترجيح عند التعادل'
        : 'Penalty winner required when scores are tied'
    }

    const scorerVal = validateEventRows(form.scorers, 'scorer', t)
    const yellowVal = validateEventRows(form.yellowCards, 'yellow', t)
    const redVal = validateEventRows(form.redCards, 'red', t)

    const allFieldErrors = {
      ...scorerVal.errors,
      ...yellowVal.errors,
      ...redVal.errors,
    }

    const isValid =
      Object.keys(nextErrors).length === 0 &&
      !scorerVal.hasIncomplete &&
      !yellowVal.hasIncomplete &&
      !redVal.hasIncomplete

    return { nextErrors, allFieldErrors, isValid }
  }, [form, isTied, penaltyWinner, t, isAr])

  const cleanScorers = (items) => {
    const flatScorers = []
    items.forEach((item) => {
      if (!item.player || !item.teamId) return
      const count = Math.max(1, Number(item.goalsCount) || 1)
      for (let i = 0; i < count; i++) {
        flatScorers.push({
          player: item.player,
          teamId: item.teamId,
          minute: item.minute || null,
        })
      }
    })
    return flatScorers
  }

  const cleanCards = (items) =>
    items.filter((item) => item.player && item.teamId).map((item) => ({
      player: item.player,
      teamId: item.teamId,
    }))

  const handleScorersChange = (scorers) => {
    setForm((prev) => {
      const synced = syncScoresFromScorers(scorers, teamA, teamB, prev.scoreA, prev.scoreB)
      return { ...prev, scorers, ...synced }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validationState.isValid) {
      haptic.heavy()
      setErrors(validationState.nextErrors)
      setFieldErrors(validationState.allFieldErrors)
      return
    }

    const synced = syncScoresFromScorers(form.scorers, teamA, teamB, form.scoreA, form.scoreB)

    haptic.intense()
    onSubmit({
      scoreA: synced.scoreA,
      scoreB: synced.scoreB,
      penaltyWinner: isTied ? penaltyWinner : null,
      scorers: cleanScorers(form.scorers),
      yellowCards: cleanCards(form.yellowCards),
      redCards: cleanCards(form.redCards),
    })
    onClose()
  }

  if (!match) return null

  const goalMinuteLabel = isAr ? 'دقيقة الهدف' : 'Goal minute'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => {
              haptic.light()
              onClose()
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto glass-card rounded-t-3xl md:rounded-3xl shadow-2xl border-accent/10"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-bg-card/95 backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {match.status === 'live'
                    ? t('matches.endMatch')
                    : match.status === 'completed'
                      ? t('matches.editResult')
                      : t('matches.recordResult')}
                  {match.status === 'live' && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium animate-pulse">
                      LIVE
                    </span>
                  )}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {teamA?.name} <span className="text-zinc-600">vs</span> {teamB?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic.light()
                  onClose()
                }}
                className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center hover:bg-bg-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="p-4 space-y-4 pb-8">
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-5">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-secondary mb-2 truncate">{teamA?.name}</p>
                    <input
                      type="number"
                      min="0"
                      value={form.scoreA}
                      onChange={(e) => setForm((prev) => ({ ...prev, scoreA: e.target.value }))}
                      className={`w-full max-w-[88px] h-16 text-3xl font-bold text-center bg-bg-primary border rounded-2xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all ${
                        errors.scoreA ? 'border-danger' : 'border-border'
                      }`}
                      dir="ltr"
                    />
                    {errors.scoreA && <p className="text-xs text-danger mt-1">{errors.scoreA}</p>}
                  </div>
                  <span className="text-xl font-bold text-text-secondary">—</span>
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-secondary mb-2 truncate">{teamB?.name}</p>
                    <input
                      type="number"
                      min="0"
                      value={form.scoreB}
                      onChange={(e) => setForm((prev) => ({ ...prev, scoreB: e.target.value }))}
                      className={`w-full max-w-[88px] h-16 text-3xl font-bold text-center bg-bg-primary border rounded-2xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all ${
                        errors.scoreB ? 'border-danger' : 'border-border'
                      }`}
                      dir="ltr"
                    />
                    {errors.scoreB && <p className="text-xs text-danger mt-1">{errors.scoreB}</p>}
                  </div>
                </div>
              </div>

              {/* Penalty Winner — appears only when tied in knockout matches */}
              <AnimatePresence>
                {isTied && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      errors.penalty
                        ? 'border-danger/50 bg-danger/5'
                        : 'border-accent/30 bg-accent/5'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        {isAr ? 'الفائز بركلات الترجيح' : 'Penalty Winner'}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {isAr
                          ? 'انتهت المباراة بالتعادل. اختر الفريق الفائز بركلات الترجيح:'
                          : 'Match ended in a draw. Select the penalty shootout winner:'}
                      </p>
                    </div>

                    {errors.penalty && (
                      <div className="flex items-center gap-2 text-xs text-danger">
                        <AlertCircle size={14} />
                        <span>{errors.penalty}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { team: teamA, id: teamA?.id },
                        { team: teamB, id: teamB?.id },
                      ].map(({ team, id }) => {
                        const isSelected = penaltyWinner === id
                        return (
                          <motion.button
                            key={id}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              haptic.medium()
                              setPenaltyWinner(id)
                            }}
                            className={`flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? 'border-accent bg-accent/15 shadow-lg shadow-accent/10'
                                : 'border-border bg-bg-surface hover:border-accent/40'
                            }`}
                          >
                            <TeamLogo logo={team?.logo} name={team?.name} color={team?.color} size="md" />
                            <p className={`text-sm font-bold text-center leading-tight ${isSelected ? 'text-accent' : ''}`}>
                              {team?.name}
                            </p>
                            {isSelected && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-[10px] bg-accent text-black px-2 py-0.5 rounded-full font-bold"
                              >
                                {isAr ? 'الفائز ✓' : 'Winner ✓'}
                              </motion.span>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <CardEventsSection
                title={t('matches.goals')}
                icon={Target}
                variant="scorer"
                items={form.scorers}
                onChange={handleScorersChange}
                teamA={teamA}
                teamB={teamB}
                accentClass="text-accent"
                addLabel={t('matches.addGoal')}
                noEventsLabel={t('matches.noGoals')}
                playerLabel={t('matches.player')}
                teamLabel={t('matches.team')}
                minuteLabel={goalMinuteLabel}
                fieldErrors={fieldErrors}
              />

              <CardEventsSection
                title={t('matches.yellowCards')}
                icon={YellowIcon}
                variant="card"
                eventKey="yellow"
                items={form.yellowCards}
                onChange={(yellowCards) => setForm((prev) => ({ ...prev, yellowCards }))}
                teamA={teamA}
                teamB={teamB}
                accentClass="text-warning"
                addLabel={t('matches.addCard')}
                noEventsLabel={t('matches.noEvents')}
                playerLabel={t('matches.player')}
                teamLabel={t('matches.team')}
                fieldErrors={fieldErrors}
              />

              <CardEventsSection
                title={t('matches.redCards')}
                icon={RedIcon}
                variant="card"
                eventKey="red"
                items={form.redCards}
                onChange={(redCards) => setForm((prev) => ({ ...prev, redCards }))}
                teamA={teamA}
                teamB={teamB}
                accentClass="text-danger"
                addLabel={t('matches.addCard')}
                noEventsLabel={t('matches.noEvents')}
                playerLabel={t('matches.player')}
                teamLabel={t('matches.team')}
                fieldErrors={fieldErrors}
              />

              {!validationState.isValid && Object.keys(fieldErrors).length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{t('matches.fixHighlightedFields')}</span>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={!validationState.isValid}
                whileTap={validationState.isValid ? { scale: 0.97 } : {}}
                className={`w-full font-bold py-3.5 rounded-xl transition-all ${
                  validationState.isValid
                    ? 'bg-accent hover:bg-accent-hover text-black shadow-lg shadow-accent/15'
                    : 'bg-bg-surface text-text-secondary border border-border cursor-not-allowed opacity-60'
                }`}
              >
                {match.status === 'live'
                  ? t('matches.endMatchSave')
                  : match.status === 'completed'
                    ? t('common.save')
                    : t('matches.saveResult')}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
