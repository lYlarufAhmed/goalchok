import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { haptic } from '../../../hooks/useHaptics'
import { useTeamsStore } from '../../../stores/useTeamsStore'
import { useI18n } from '../../../i18n/useI18n'
import SelectBottomSheet from '../../../components/common/SelectBottomSheet'

const GROUPS = ['A', 'B', 'C']
const ROUNDS = [
  { value: 'QF', labelAr: 'دور الـ 8 (ربع النهائي)', labelEn: 'Round 8 (Quarter Final)' },
  { value: 'SF', labelAr: 'دور الـ 4 (نصف النهائي)', labelEn: 'Round 4 (Semi Final)' },
  { value: 'F',  labelAr: 'النهائي',                  labelEn: 'Final' },
]

// Which bottom sheet is open at any moment?
const SHEET_NONE      = null
const SHEET_TYPE      = 'type'
const SHEET_GROUP     = 'group'
const SHEET_ROUND     = 'round'
const SHEET_TEAM_A    = 'teamA'
const SHEET_TEAM_B    = 'teamB'

export default function MatchFormModal({
  isOpen,
  onClose,
  onSubmit,
  onSubmitGroup,
  onSubmitKnockout,
  match = null,
  teams: propTeams = null,
  initialType = 'group',
  mode = 'full', // 'full' | 'schedule'
  title = null,
}) {
  const storeTeams = useTeamsStore((state) => state.teams)
  const teams = propTeams || storeTeams
  const { t, isAr } = useI18n()

  const defaultType = match?.round ? 'knockout' : initialType
  const [matchType, setMatchType] = useState(defaultType)
  const [openSheet, setOpenSheet] = useState(SHEET_NONE)
  const [prevIsOpen, setPrevIsOpen] = useState(false)

  const [form, setForm] = useState({
    group: match?.group || 'A',
    round: match?.round || 'QF',
    teamA: match?.teamA || '',
    teamB: match?.teamB || '',
    date: match?.date || '',
    time: match?.time || '',
    venue: match?.venue || (isAr ? 'ملاعب فيا' : 'Via Stadium'),
  })
  const [errors, setErrors] = useState({})

  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true)
    setMatchType(match?.round ? 'knockout' : initialType)
    setOpenSheet(SHEET_NONE)
    setForm({
      group: match?.group || 'A',
      round: match?.round || 'QF',
      teamA: match?.teamA || '',
      teamB: match?.teamB || '',
      date: match?.date || '',
      time: match?.time || '',
      venue: match?.venue || (isAr ? 'ملاعب فيا' : 'Via Stadium'),
    })
    setErrors({})
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false)
  }

  const availableTeams = matchType === 'group'
    ? teams.filter((tm) => tm.group === form.group)
    : teams

  const validate = () => {
    const nextErrors = {}
    if (mode === 'full') {
      if (!form.teamA) nextErrors.teamA = t('matches.team1Required')
      if (!form.teamB) nextErrors.teamB = t('matches.team2Required')
      if (form.teamA && form.teamA === form.teamB) nextErrors.teamB = t('matches.sameTeamError')
    }
    if (!form.date) nextErrors.date = t('matches.dateRequired')
    if (!form.time) nextErrors.time = t('matches.timeRequired')
    if (!form.venue.trim()) nextErrors.venue = t('matches.venueRequired')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    haptic.intense()

    const payload = {
      ...form,
      venue: form.venue.trim(),
    }

    if (onSubmit) {
      onSubmit(payload)
    } else if (matchType === 'group') {
      onSubmitGroup?.({ group: form.group, teamA: form.teamA, teamB: form.teamB, date: form.date, time: form.time, venue: form.venue })
    } else {
      onSubmitKnockout?.({ round: form.round, teamA: form.teamA, teamB: form.teamB, date: form.date, time: form.time, venue: form.venue })
    }
    onClose()
  }

  // Option arrays
  const matchTypeOptions = [
    { value: 'group',    label: isAr ? 'مرحلة المجموعات'       : 'Group Stage' },
    { value: 'knockout', label: isAr ? 'مرحلة خروج المغلوب'    : 'Knockout Stage' },
  ]
  const groupOptions = GROUPS.map((g) => ({
    value: g,
    label: `${isAr ? 'المجموعة' : 'Group'} ${g}`,
  }))
  const roundOptions = ROUNDS.map((r) => ({
    value: r.value,
    label: isAr ? r.labelAr : r.labelEn,
  }))
  const teamOptions = availableTeams.map((tm) => ({
    value: tm.id,
    label: tm.group ? `${tm.name} (${tm.group})` : tm.name,
  }))
  const teamBOptions = availableTeams
    .filter((tm) => tm.id !== form.teamA)
    .map((tm) => ({
      value: tm.id,
      label: tm.group ? `${tm.name} (${tm.group})` : tm.name,
    }))

  const modalTitle = title || (
    mode === 'schedule'
      ? t('knockout.editMatch')
      : match
        ? t('knockout.editMatchTitle')
        : t('matches.addMatchTitle')
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { if (openSheet === SHEET_NONE) onClose() }}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto glass-card rounded-t-2xl md:rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-bg-card/95 backdrop-blur-md">
              <h2 className="text-lg font-bold">{modalTitle}</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center hover:bg-bg-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8" dir={isAr ? 'rtl' : 'ltr'}>

              {mode === 'full' && (
                <>
                  {/* Match Type */}
                  {!match && (
                    <SelectBottomSheet
                      label={isAr ? 'نوع المباراة' : 'Match Type'}
                      value={matchType}
                      onChange={(v) => {
                        setMatchType(v)
                        setForm((prev) => ({ ...prev, teamA: '', teamB: '' }))
                      }}
                      options={matchTypeOptions}
                      isOpen={openSheet === SHEET_TYPE}
                      onOpen={() => setOpenSheet(SHEET_TYPE)}
                      onClose={() => setOpenSheet(SHEET_NONE)}
                      isAr={isAr}
                    />
                  )}

                  {/* Group / Round */}
                  {matchType === 'group' ? (
                    <>
                      <SelectBottomSheet
                        label={t('matches.group')}
                        value={form.group}
                        onChange={(v) => setForm((prev) => ({ ...prev, group: v }))}
                        options={groupOptions}
                        isOpen={openSheet === SHEET_GROUP}
                        onOpen={() => setOpenSheet(SHEET_GROUP)}
                        onClose={() => setOpenSheet(SHEET_NONE)}
                        isAr={isAr}
                      />
                      {availableTeams.length < 2 && (
                        <p className="text-xs text-warning -mt-2">{t('matches.needDrawFirst')}</p>
                      )}
                    </>
                  ) : (
                    <SelectBottomSheet
                      label={isAr ? 'الدور' : 'Round'}
                      value={form.round}
                      onChange={(v) => setForm((prev) => ({ ...prev, round: v }))}
                      options={roundOptions}
                      isOpen={openSheet === SHEET_ROUND}
                      onOpen={() => setOpenSheet(SHEET_ROUND)}
                      onClose={() => setOpenSheet(SHEET_NONE)}
                      isAr={isAr}
                    />
                  )}

                  {/* Team A */}
                  <SelectBottomSheet
                    label={t('matches.team1')}
                    value={form.teamA}
                    onChange={(v) => setForm((prev) => ({ ...prev, teamA: v }))}
                    options={teamOptions}
                    placeholder={t('matches.selectTeam')}
                    isOpen={openSheet === SHEET_TEAM_A}
                    onOpen={() => setOpenSheet(SHEET_TEAM_A)}
                    onClose={() => setOpenSheet(SHEET_NONE)}
                    isAr={isAr}
                  />
                  {errors.teamA && <p className="text-xs text-danger -mt-2">{errors.teamA}</p>}

                  {/* Team B */}
                  <SelectBottomSheet
                    label={t('matches.team2')}
                    value={form.teamB}
                    onChange={(v) => setForm((prev) => ({ ...prev, teamB: v }))}
                    options={teamBOptions}
                    placeholder={t('matches.selectTeam')}
                    isOpen={openSheet === SHEET_TEAM_B}
                    onOpen={() => setOpenSheet(SHEET_TEAM_B)}
                    onClose={() => setOpenSheet(SHEET_NONE)}
                    isAr={isAr}
                  />
                  {errors.teamB && <p className="text-xs text-danger -mt-2">{errors.teamB}</p>}
                </>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {t('matches.date')}
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                    dir="ltr"
                  />
                  {errors.date && <p className="text-xs text-danger mt-1">{errors.date}</p>}
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {t('matches.time')}
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                    dir="ltr"
                  />
                  {errors.time && <p className="text-xs text-danger mt-1">{errors.time}</p>}
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('matches.venue')}
                </label>
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                  placeholder={isAr ? 'مثال: ملعب النجوم' : 'e.g. Stars Stadium'}
                  className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                />
                {errors.venue && <p className="text-xs text-danger mt-1">{errors.venue}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={mode === 'full' && matchType === 'group' && availableTeams.length < 2}
                className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {match ? t('common.save') : modalTitle}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
