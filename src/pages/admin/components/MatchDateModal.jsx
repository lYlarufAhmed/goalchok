import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar } from 'lucide-react'
import { haptic } from '../../../hooks/useHaptics'
import { useI18n } from '../../../i18n/useI18n'

export default function MatchDateModal({ isOpen, onClose, onSubmit, match, teamA, teamB }) {
  const [form, setForm] = useState({ date: '', time: '', venue: '' })
  const [errors, setErrors] = useState({})
  const { t, isAr } = useI18n()

  // Prefill when the modal opens for a match (render-phase adjustment)
  const resetKey = isOpen && match ? match.id : null
  const [prevResetKey, setPrevResetKey] = useState(null)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    if (resetKey !== null) {
      setForm({
        date: match.date || '',
        time: match.time || '',
        venue: match.venue || '',
      })
      setErrors({})
    }
  }

  const validate = () => {
    const nextErrors = {}
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
    onSubmit(form)
    onClose()
  }

  if (!match) return null

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
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto glass-card rounded-t-2xl md:rounded-2xl shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-bg-card/95 backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold">{t('matches.editDate')}</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {teamA?.name} vs {teamB?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center hover:bg-bg-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm">
                <Calendar size={18} className="text-accent shrink-0" />
                <p className="text-text-secondary">
                  {isAr
                    ? 'حدّد التاريخ والوقت حتى يعرف الفريقان موعد المباراة'
                    : 'Set the date and time so both teams know when the match is'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{t('matches.date')}</label>
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
                  <label className="block text-sm text-text-secondary mb-2">{t('matches.time')}</label>
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

              <div>
                <label className="block text-sm text-text-secondary mb-2">{t('matches.venue')}</label>
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                  placeholder={isAr ? 'مثال: ملعب النجوم' : 'e.g. Stars Stadium'}
                  className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                />
                {errors.venue && <p className="text-xs text-danger mt-1">{errors.venue}</p>}
              </div>

              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-3.5 rounded-xl transition-colors"
              >
                {t('common.save')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
