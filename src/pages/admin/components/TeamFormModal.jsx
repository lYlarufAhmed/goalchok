import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, ImagePlus, Camera } from 'lucide-react'
import { MAX_PLAYERS } from '../../../utils/tournamentLimits'
import { useI18n } from '../../../i18n/useI18n'
import { haptic } from '../../../hooks/useHaptics'
import { TEAM_COLORS, getRandomTeamColor } from '../../../utils/teamColors'
import { generateUUID } from '../../../utils/uuid'

import ImageCropperModal from '../../../components/common/ImageCropperModal'

const emptyForm = {
  name: '',
  manager: '',
  players: [{ key: generateUUID(), value: '' }],
  logo: null,
  color: null,
  group: '',
}

export default function TeamFormModal({ isOpen, onClose, onSubmit, team, maxTeamsReached, existingColors = [] }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [playerPhotos, setPlayerPhotos] = useState({})
  const { t, isAr } = useI18n()
  const isEditing = Boolean(team)

  // Image crop flow state
  const [cropState, setCropState] = useState({
    isOpen: false,
    imageSrc: '',
    targetType: 'logo',
    playerIndex: null,
  })

  useEffect(() => {
    if (isOpen) {
      if (team) {
        setForm({
          name: team.name || '',
          manager: team.manager || '',
          players: team.players?.length > 0
            ? team.players.map((p) => ({ key: generateUUID(), value: p?.name || '' }))
            : [{ key: generateUUID(), value: '' }],
          logo: team.logo || null,
          color: team.color || getRandomTeamColor(existingColors).id,
          group: team.group || '',
        })
        // Load existing player photos
        const photos = {}
        team.players.forEach((p, i) => {
          if (p.photo) photos[i] = p.photo
        })
        setPlayerPhotos(photos)
      } else {
        const randomColor = getRandomTeamColor(existingColors)
        setForm({ ...emptyForm, color: randomColor.id })
        setPlayerPhotos({})
      }
      setErrors({})
      setSubmitting(false)
    }
  }, [isOpen, team, existingColors])

  const MAX_FILE_SIZE = 12 * 1024 * 1024 // 12MB

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, logo: t('teams.logoError') }))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, logo: isAr ? 'حجم الصورة كبير جداً (الأقصى 12 ميجابايت)' : 'File is too large (max 12MB)' }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropState({
        isOpen: true,
        imageSrc: reader.result,
        targetType: 'logo',
        playerIndex: null,
      })
      setErrors((prev) => ({ ...prev, logo: undefined }))
    }
    reader.readAsDataURL(file)
  }

  const handlePlayerPhoto = async (index, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) return
    if (file.size > MAX_FILE_SIZE) return

    const reader = new FileReader()
    reader.onload = () => {
      setCropState({
        isOpen: true,
        imageSrc: reader.result,
        targetType: 'player',
        playerIndex: index,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = (croppedBase64) => {
    if (cropState.targetType === 'logo') {
      setForm((prev) => ({ ...prev, logo: croppedBase64 }))
    } else if (cropState.targetType === 'player') {
      setPlayerPhotos((prev) => ({ ...prev, [cropState.playerIndex]: croppedBase64 }))
    }
  }

  const addPlayerField = () => {
    haptic.light()
    if (form.players.length >= MAX_PLAYERS) return
    setForm((prev) => ({ ...prev, players: [...prev.players, { key: generateUUID(), value: '' }] }))
  }

  const removePlayerField = (key) => {
    if (form.players.length <= 1) return
    setForm((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.key !== key),
    }))
    // Clean up photo for the removed player
    setPlayerPhotos((prev) => {
      const newPhotos = {}
      let photoIdx = 0
      form.players.forEach((p) => {
        if (p.key === key) return
        if (prev[photoIdx]) newPhotos[photoIdx] = prev[photoIdx]
        photoIdx++
      })
      return newPhotos
    })
  }

  const updatePlayer = (index, value) => {
    setForm((prev) => ({
      ...prev,
      players: prev.players.map((p, i) => (i === index ? { ...p, value } : p)),
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = t('teams.nameRequired')
    if (!form.manager.trim()) nextErrors.manager = t('teams.managerRequired')

    const filledPlayers = form.players.filter((p) => p.value.trim())
    if (filledPlayers.length === 0) {
      nextErrors.players = t('teams.playerRequired')
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isEditing && maxTeamsReached) return
    if (!validate()) return

    setSubmitting(true)
    haptic.intense()
    try {
      const teamColor = form.logo ? null : (form.color || getRandomTeamColor(existingColors).id)
      await onSubmit({
        name: form.name,
        manager: form.manager,
        players: form.players.map((p, i) => ({
          name: p.value,
          photo: playerPhotos[i] || null,
        })),
        logo: form.logo,
        color: teamColor,
      })
      onClose()
    } catch (err) {
      console.error('[TeamFormModal] submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const filledCount = form.players.filter((p) => p.value.trim()).length
  const selectedColor = TEAM_COLORS.find((c) => c.id === form.color) || TEAM_COLORS[0]
  const colorLabel = (c) => (isAr ? c.nameAr : c.nameEn)

  // Shuffle to a random color not used by other teams
  const handleShuffleColor = () => {
    haptic.light()
    const newColor = getRandomTeamColor(existingColors)
    setForm((prev) => ({ ...prev, color: newColor.id }))
  }

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto glass-card rounded-t-2xl md:rounded-2xl border border-border shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-bg-card/95 backdrop-blur-md">
              <h2 className="text-lg font-bold">
                {isEditing ? t('teams.editTeam') : t('teams.addNewTeam')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center hover:bg-bg-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-5 pb-8">
              {/* Logo upload */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">{t('teams.logo')}</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-border flex items-center justify-center overflow-hidden shrink-0"
                    style={
                      form.logo
                        ? { backgroundColor: 'var(--bg-surface)' }
                        : { backgroundColor: selectedColor.hex, borderColor: selectedColor.hex }
                    }
                  >
                    {form.logo ? (
                      <img src={form.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-white">
                        {form.name.trim().charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-bg-surface border border-border text-sm cursor-pointer hover:bg-bg-primary transition-colors">
                      <ImagePlus size={16} className="text-accent" />
                      <span className="truncate">{t('teams.chooseImage')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {form.logo && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, logo: null }))}
                        className="block mt-2 text-xs text-danger hover:underline"
                      >
                        {t('teams.removeLogo')}
                      </button>
                    )}
                    {!form.logo && (
                      <p className="text-[10px] text-text-secondary mt-1.5">{t('teams.colorFallback')}</p>
                    )}
                    {errors.logo && (
                      <p className="text-xs text-danger mt-1">{errors.logo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Team color — shown when no logo */}
              {!form.logo && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-text-secondary">{t('teams.teamColor')}</label>
                    <button
                      type="button"
                      onClick={handleShuffleColor}
                      className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors px-2 py-1 rounded-lg hover:bg-accent/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                      </svg>
                      <span>{isAr ? 'عشوائي' : 'Shuffle'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                    {TEAM_COLORS.map((c) => {
                      const isSelected = form.color === c.id
                      const isTaken = existingColors.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={isTaken ? (isAr ? `${colorLabel(c)} — مستخدم` : `${colorLabel(c)} — In use`) : colorLabel(c)}
                          disabled={isTaken}
                          onClick={() => {
                            if (isTaken) return
                            haptic.light()
                            setForm((prev) => ({ ...prev, color: c.id }))
                          }}
                          className={`relative flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-accent shadow-[0_0_0_3px_rgba(212,175,55,0.25)]'
                              : isTaken
                              ? 'border-transparent opacity-30 cursor-not-allowed'
                              : 'border-transparent hover:border-accent/30'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                              isSelected ? 'scale-110' : isTaken ? '' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </span>
                          <span className="text-[8px] text-text-secondary truncate w-full text-center leading-tight">
                            {colorLabel(c)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {selectedColor && (
                    <p className="text-[11px] text-text-secondary mt-2 text-center">
                      {isAr ? 'اللون المختار:' : 'Selected:'} <span style={{ color: selectedColor.hex }} className="font-semibold">{colorLabel(selectedColor)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Team name */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">{t('teams.teamName')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={isAr ? 'مثال: النجوم' : 'e.g. Stars'}
                  className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
              </div>

              {/* Manager name */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">{t('teams.managerName')}</label>
                <input
                  type="text"
                  value={form.manager}
                  onChange={(e) => setForm((prev) => ({ ...prev, manager: e.target.value }))}
                  placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. Ahmed'}
                  className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                />
                {errors.manager && <p className="text-xs text-danger mt-1">{errors.manager}</p>}
              </div>

              {/* Group selection */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">المجموعة</label>
                <div className="relative">
                  <select
                    value={form.group}
                    onChange={(e) => setForm((prev) => ({ ...prev, group: e.target.value }))}
                    className="w-full bg-bg-surface border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">بدون مجموعة (لم يتم السحب بعد)</option>
                    <option value="A">المجموعة A</option>
                    <option value="B">المجموعة B</option>
                    <option value="C">المجموعة C</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-text-secondary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Players */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-text-secondary">
                    {t('teams.players')} ({filledCount}/{MAX_PLAYERS})
                  </label>
                  <button
                    type="button"
                    onClick={addPlayerField}
                    disabled={form.players.length >= MAX_PLAYERS}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={14} />
                    <span>{t('teams.addPlayer')}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {form.players.map((player, index) => (
                    <div key={player.key} className="flex gap-2 items-center">
                      {/* Player photo */}
                      <label className="w-9 h-9 shrink-0 rounded-full bg-bg-surface border border-border flex items-center justify-center cursor-pointer hover:border-accent/40 hover:text-accent transition-colors overflow-hidden">
                        {playerPhotos[index] ? (
                          <img src={playerPhotos[index]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={14} className="text-text-secondary" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePlayerPhoto(index, e)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={player.value}
                        onChange={(e) => updatePlayer(index, e.target.value)}
                        placeholder={`${isAr ? 'اللاعب' : 'Player'} ${index + 1}`}
                        className="flex-1 bg-bg-surface border border-border rounded-xl py-2.5 px-3 md:px-4 text-sm focus:outline-none focus:border-accent transition-colors"
                      />
                      {form.players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayerField(player.key)}
                          className="w-10 h-10 rounded-xl bg-bg-surface border border-border flex items-center justify-center text-danger hover:bg-danger/10 transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.players && <p className="text-xs text-danger mt-1">{errors.players}</p>}
              </div>

              <button
                type="submit"
                disabled={(!isEditing && maxTeamsReached) || submitting}
                className="w-full bg-accent text-black font-bold py-3.5 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? t('common.loading')
                  : isEditing
                    ? t('teams.saveChanges')
                    : t('teams.addTeamBtn')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <ImageCropperModal
        isOpen={cropState.isOpen}
        imageSrc={cropState.imageSrc}
        targetSize={cropState.targetType === 'logo' ? 256 : 128}
        isAr={isAr}
        onClose={() => setCropState((prev) => ({ ...prev, isOpen: false }))}
        onCropComplete={handleCropComplete}
      />
    </>
  )
}
