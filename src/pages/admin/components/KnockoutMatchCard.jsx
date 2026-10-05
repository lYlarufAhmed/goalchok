import { motion } from 'framer-motion'
import {
  Calendar,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  Radio,
  CalendarClock,
  PauseCircle,
  PlayCircle,
  Trophy,
} from 'lucide-react'
import { haptic } from '../../../hooks/useHaptics'
import TeamLogo from '../../../components/common/TeamLogo'
import { useI18n } from '../../../i18n/useI18n'

const ROUND_LABELS = {
  QF: { ar: 'دور الـ 8', en: 'Round 8' },
  SF: { ar: 'دور الـ 4', en: 'Round 4' },
  F:  { ar: 'النهائي',     en: 'Final' },
}

/**
 * KnockoutMatchCard — mirrors AdminMatchCard exactly in styling/layout.
 * Adds: bilingual round labels, scorers/cards display on completed matches,
 * onEditFull callback for editing teams+details from any step.
 */
export default function KnockoutMatchCard({
  match,
  teamA,
  teamB,
  onEditResult,
  onEditDate,
  onEditFull,     // opens full edit modal (teams + schedule)
  onStartLive,
  onUpdateLive,
  onPostpone,
  onRestore,
  onDelete,
}) {
  const { isAr } = useI18n()

  const statusLabels = {
    scheduled: { text: isAr ? 'مجدولة' : 'Scheduled',   className: 'text-text-secondary bg-bg-surface' },
    live:      { text: isAr ? 'مباشر' : 'Live',          className: 'text-live bg-live/10' },
    completed: { text: isAr ? 'منتهية' : 'Finished',     className: 'text-success bg-success/10' },
    postponed: { text: isAr ? 'مؤجلة' : 'Postponed',    className: 'text-warning bg-warning/10' },
  }
  const status = statusLabels[match.status] || statusLabels.scheduled

  const roundLabel = (() => {
    const name = isAr ? ROUND_LABELS[match.round]?.ar : ROUND_LABELS[match.round]?.en
    const num = match.matchNumber
    if (name && num) return `${name} ${num}`
    if (name) return name
    // legacy fallback: matchLabel stored as "QF 1" etc.
    if (match.matchLabel) {
      const legacyMap = { QF: isAr ? 'دور الـ 8' : 'Round 8', SF: isAr ? 'دور الـ 4' : 'Round 4', F: isAr ? 'النهائي' : 'Final' }
      const replaced = legacyMap[match.round]
      if (replaced) return match.matchLabel.replace(/^(QF|SF|F)\s*/, `${replaced} `)
    }
    return match.round
  })()

  const hasPenaltyWinner = match.result?.penaltyWinner && match.status === 'completed'
  const penaltyTeam = hasPenaltyWinner
    ? (match.result.penaltyWinner === teamA?.id ? teamA : teamB)
    : null

  const showScore = match.status === 'live' || (match.status === 'completed' && match.result)

  return (
    <div className="glass-card p-3 md:p-4 space-y-3 relative">
      {/* Status + round label row */}
      <div className="flex items-center justify-between gap-2 text-xs pe-10">
        <span className={`px-2 py-0.5 rounded-lg font-medium shrink-0 ${status.className}`}>
          {match.status === 'live' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-live animate-pulse ml-1" />
          )}
          {status.text}
        </span>
        <span className="text-accent font-semibold truncate">{roundLabel}</span>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => { haptic.heavy(); onDelete(match) }}
          className="absolute top-3 end-3 w-8 h-8 rounded-lg bg-bg-surface/90 border border-border flex items-center justify-center text-danger hover:bg-danger/10 hover:border-danger/30 transition-colors z-10"
          aria-label={isAr ? 'حذف' : 'Delete'}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Teams + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
          <TeamLogo logo={teamA?.logo} name={teamA?.name} color={teamA?.color} size="sm" />
          <p className="font-bold text-sm truncate text-center w-full">{teamA?.name || '—'}</p>
        </div>

        <div className="flex flex-col items-center shrink-0 px-2">
          {showScore ? (
            <span className="text-xl md:text-2xl font-bold text-accent" dir="ltr">
              {isAr
                ? `${match.result?.scoreB ?? 0} - ${match.result?.scoreA ?? 0}`
                : `${match.result?.scoreA ?? 0} - ${match.result?.scoreB ?? 0}`}
            </span>
          ) : (
            <span className="text-lg font-bold text-text-secondary">VS</span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
          <TeamLogo logo={teamB?.logo} name={teamB?.name} color={teamB?.color} size="sm" />
          <p className="font-bold text-sm truncate text-center w-full">{teamB?.name || '—'}</p>
        </div>
      </div>

      {/* Penalty winner badge */}
      {hasPenaltyWinner && penaltyTeam && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 rounded-xl bg-accent/10 border border-accent/25 text-xs"
        >
          <span className="text-accent">🏆</span>
          <span className="text-text-secondary">
            {isAr ? 'الفائز بركلات الترجيح:' : 'Penalty winner:'}
          </span>
          <span className="font-bold text-accent">{penaltyTeam.name}</span>
        </motion.div>
      )}

      {/* Scorers (completed) */}
      {match.status === 'completed' && match.result?.scorers?.length > 0 && (
        <div className="text-xs text-text-secondary bg-bg-surface rounded-xl p-2 border border-border">
          <span className="text-accent font-medium">⚽ </span>
          {match.result.scorers.map((s, i) => (
            <span key={i}>
              {s.player}{s.minute ? ` (${s.minute}′)` : ''}
              {i < match.result.scorers.length - 1 ? '، ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Cards (completed) */}
      {match.status === 'completed' && (match.result?.yellowCards?.length > 0 || match.result?.redCards?.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {match.result.yellowCards?.map((c, i) => (
            <span key={`y-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-300">
              <span className="w-2.5 h-3.5 rounded-sm bg-yellow-400 inline-block" />
              {c.player}
            </span>
          ))}
          {match.result.redCards?.map((c, i) => (
            <span key={`r-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
              <span className="w-2.5 h-3.5 rounded-sm bg-red-500 inline-block" />
              {c.player}
            </span>
          ))}
        </div>
      )}

      {/* Schedule info */}
      {(match.date || match.time || match.venue) && (
        <div className="flex flex-wrap gap-2 md:gap-3 text-xs text-text-secondary pt-2 border-t border-border">
          {match.date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {match.date}
            </span>
          )}
          {match.time && (
            <span className="flex items-center gap-1" dir="ltr">
              <Clock size={12} />
              {match.time}
            </span>
          )}
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {match.venue}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {match.status === 'scheduled' && (
          <>
            {!onEditFull && (
              <button
                type="button"
                onClick={() => { haptic.light(); onEditDate(match) }}
                className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-bg-surface border border-border text-xs md:text-sm font-bold hover:border-accent/30 hover:text-accent transition-colors"
              >
                <CalendarClock size={14} />
                <span className="truncate">{isAr ? 'تعديل الموعد' : 'Edit Date'}</span>
              </button>
            )}
            {onEditFull && (
              <button
                type="button"
                onClick={() => { haptic.light(); onEditFull(match) }}
                className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-bg-surface border border-border text-xs md:text-sm font-bold hover:border-accent/30 hover:text-accent transition-colors"
              >
                <Pencil size={14} />
                <span className="truncate">{isAr ? 'تعديل المباراة' : 'Edit Match'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { haptic.medium(); onPostpone(match) }}
              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs md:text-sm font-bold hover:bg-warning/20 transition-colors"
            >
              <PauseCircle size={14} />
              <span className="truncate">{isAr ? 'تأجيل' : 'Postpone'}</span>
            </button>
            <button
              type="button"
              onClick={() => { haptic.medium(); onStartLive(match) }}
              className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white dark:text-black text-sm font-bold transition-colors"
            >
              <Radio size={15} />
              <span>{isAr ? 'بدء البث المباشر' : 'Start Live'}</span>
            </button>
          </>
        )}

        {match.status === 'postponed' && (
          <>
            <button
              type="button"
              onClick={() => { haptic.medium(); onRestore(match) }}
              className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/20 transition-colors"
            >
              <PlayCircle size={15} />
              <span>{isAr ? 'استعادة المباراة' : 'Restore Match'}</span>
            </button>
            {!onEditFull && (
              <button
                type="button"
                onClick={() => { haptic.light(); onEditDate(match) }}
                className="col-span-2 flex items-center justify-center gap-1 py-2 rounded-xl bg-bg-surface border border-border text-sm hover:border-accent/30 hover:text-accent transition-colors"
              >
                <CalendarClock size={14} />
                <span>{isAr ? 'تعديل الموعد' : 'Edit Date'}</span>
              </button>
            )}
            {onEditFull && (
              <button
                type="button"
                onClick={() => { haptic.light(); onEditFull(match) }}
                className="col-span-2 flex items-center justify-center gap-1 py-2 rounded-xl bg-bg-surface border border-border text-sm hover:border-accent/30 hover:text-accent transition-colors"
              >
                <Pencil size={14} />
                <span>{isAr ? 'تعديل المباراة' : 'Edit Match'}</span>
              </button>
            )}
          </>
        )}

        {match.status === 'live' && (
          <>
            <button
              type="button"
              onClick={() => { haptic.light(); onUpdateLive(match) }}
              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-live/10 border border-live/30 text-live text-xs md:text-sm font-bold hover:bg-live/20 transition-colors"
            >
              <Radio size={14} />
              <span className="truncate">{isAr ? 'تحديث النتيجة' : 'Update Live'}</span>
            </button>
            <button
              type="button"
              onClick={() => { haptic.medium(); onEditResult(match) }}
              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-accent hover:bg-accent-hover text-white dark:text-black text-xs md:text-sm font-bold transition-colors"
            >
              <Trophy size={14} />
              <span className="truncate">{isAr ? 'إنهاء المباراة' : 'End Match'}</span>
            </button>
          </>
        )}

        {match.status === 'completed' && (
          <>
            <button
              type="button"
              onClick={() => { haptic.light(); onEditResult(match) }}
              className={`${onEditFull ? '' : 'col-span-2'} flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bg-surface border border-border text-sm hover:border-accent/30 hover:text-accent transition-colors`}
            >
              <Pencil size={15} />
              <span>{isAr ? 'تعديل النتيجة' : 'Edit Result'}</span>
            </button>
            {onEditFull && (
              <button
                type="button"
                onClick={() => { haptic.light(); onEditFull(match) }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bg-surface border border-border text-sm hover:border-accent/30 hover:text-accent transition-colors"
              >
                <Pencil size={14} />
                <span>{isAr ? 'تعديل المباراة' : 'Edit Match'}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
