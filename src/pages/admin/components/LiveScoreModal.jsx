import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Radio } from 'lucide-react'
import { haptic } from '../../../hooks/useHaptics'
import { useI18n } from '../../../i18n/useI18n'

export default function LiveScoreModal({ isOpen, onClose, onSubmit, match, teamA, teamB, liveData }) {
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [errors, setErrors] = useState({})
  const { t } = useI18n()

  useEffect(() => {
    if (isOpen && match) {
      const currentA = liveData?.scoreA ?? match.result?.scoreA ?? 0
      const currentB = liveData?.scoreB ?? match.result?.scoreB ?? 0
      setScoreA(currentA)
      setScoreB(currentB)
      setErrors({})
    }
  }, [isOpen, match, liveData])

  const validate = () => {
    const nextErrors = {}
    if (scoreA === '' || scoreA < 0) nextErrors.scoreA = t('common.required')
    if (scoreB === '' || scoreB < 0) nextErrors.scoreB = t('common.required')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    haptic.intense()
    const events = (liveData?.events || []).slice()
    onSubmit({
      scoreA: Number(scoreA),
      scoreB: Number(scoreB),
      events,
    })
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
            className="relative w-full max-w-lg glass-card rounded-t-2xl md:rounded-2xl shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-bg-card/95 backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Radio size={18} className="text-live" />
                  {t('matches.liveScoreUpdate')}
                </h2>
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

            <form onSubmit={handleSubmit} className="p-4 space-y-5 pb-8">
              <div className="flex items-center justify-center gap-4 md:gap-6 py-4">
                <div className="text-center flex-1">
                  <p className="text-sm font-bold mb-2 truncate">{teamA?.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    className="w-16 md:w-20 h-14 md:h-16 text-2xl md:text-3xl font-bold text-center bg-bg-surface border border-border rounded-xl focus:outline-none focus:border-live"
                    dir="ltr"
                  />
                  {errors.scoreA && <p className="text-xs text-danger mt-1">{errors.scoreA}</p>}
                </div>
                <span className="text-2xl font-bold text-text-secondary">-</span>
                <div className="text-center flex-1">
                  <p className="text-sm font-bold mb-2 truncate">{teamB?.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    className="w-16 md:w-20 h-14 md:h-16 text-2xl md:text-3xl font-bold text-center bg-bg-surface border border-border rounded-xl focus:outline-none focus:border-live"
                    dir="ltr"
                  />
                  {errors.scoreB && <p className="text-xs text-danger mt-1">{errors.scoreB}</p>}
                </div>
              </div>

              <p className="text-xs text-text-secondary text-center">
                {t('matches.liveUpdateDesc')}
              </p>

              <button
                type="submit"
                className="w-full bg-live hover:bg-live/90 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {t('matches.scoreA11n')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
