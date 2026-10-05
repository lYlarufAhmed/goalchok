import { useState } from 'react'
import BottomSheet from './BottomSheet'
import TactileButton from './TactileButton'

export default function TeamCreationSelector({ onSelectTeam, isAr = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [managerName, setManagerName] = useState('')

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTeamName('')
    setManagerName('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!teamName.trim()) return

    onSelectTeam?.({
      id: `new-${Date.now()}`,
      name: teamName,
      manager: managerName || 'N/A',
      players: []
    })
    handleClose()
  }

  return (
    <div className="w-full">
      <TactileButton
        onClick={handleOpen}
        className="w-full py-3 px-4 rounded-xl border border-glass-border bg-glass-panel backdrop-blur-md text-xs font-bold text-text-primary flex items-center justify-center gap-2 hover:bg-glass-panel/90 transition-colors"
      >
        <span>{isAr ? '➕ إضافة فريق جديد' : '➕ Add New Team'}</span>
      </TactileButton>

      <BottomSheet isOpen={isOpen} onClose={handleClose} title={isAr ? 'إنشاء فريق جديد' : 'Create New Team'}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-start" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
              {isAr ? 'اسم الفريق' : 'Team Name'}
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={isAr ? 'مثال: فريق النخبة' : 'e.g. Elite Team'}
              className="w-full px-4 py-3 rounded-xl border border-glass-border bg-bg-surface text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
              {isAr ? 'المدرب / المسؤول' : 'Manager / Coach'}
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder={isAr ? 'اسم المدرب' : 'Manager Name'}
              className="w-full px-4 py-3 rounded-xl border border-glass-border bg-bg-surface text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="pt-2">
            <TactileButton
              type="submit"
              className="w-full py-3.5 bg-accent text-white dark:text-black rounded-xl font-bold text-sm shadow-md hover:bg-accent-hover transition-colors flex items-center justify-center"
            >
              {isAr ? 'حفظ وإضافة الفريق' : 'Save and Add Team'}
            </TactileButton>
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}
