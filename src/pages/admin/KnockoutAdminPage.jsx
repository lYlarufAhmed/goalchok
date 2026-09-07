import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, CheckCircle, Lock, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'

import { useKnockoutStore } from '../../stores/useKnockoutStore'
import { useTeamsQuery, useMatchesQuery } from '../../hooks/useQueries'
import { isGroupStageComplete, getQualifiedTeams, computeAllStandings } from '../../utils/knockoutUtils'
import { useI18n } from '../../i18n/useI18n'
import { haptic } from '../../hooks/useHaptics'

import DarkCard from '../../components/common/DarkCard'
import TeamLogo from '../../components/common/TeamLogo'
import ChangeTeamModal from './components/ChangeTeamModal'
import KnockoutMatchFormModal from './components/KnockoutMatchFormModal'
import KnockoutResultFormModal from './components/KnockoutResultFormModal'
import KnockoutMatchCard from './components/KnockoutMatchCard'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import LiveScoreModal from './components/LiveScoreModal'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
}

export default function KnockoutAdminPage() {
  const { t, isAr } = useI18n()
  const navigate = useNavigate()
  
  const koStore = useKnockoutStore()
  const { data: allTeams = [] } = useTeamsQuery()
  const { data: groupMatches = [] } = useMatchesQuery()

  useEffect(() => {
    // Ensure the Firestore listener is active. App.jsx owns the lifecycle,
    // so we do NOT call cleanup() on unmount here — doing so would kill the
    // shared subscription and break the public-facing pages.
    koStore.listenToFirestore()
  }, [])

  const qualifiedTeams = koStore.qualifiedTeams || []
  const knockoutMatches = koStore.knockoutMatches || []

  const isReady = isGroupStageComplete(allTeams, groupMatches)
  const allStandings = computeAllStandings(allTeams, groupMatches)

  // Modals state
  const [changeTeamModal, setChangeTeamModal] = useState({ open: false, index: null, team: null })
  const [matchFormModal, setMatchFormModal] = useState({ open: false, match: null, mode: 'full' })
  const [resultModal, setResultModal] = useState({ open: false, match: null })
  const [liveScoreModal, setLiveScoreModal] = useState({ open: false, match: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, match: null })
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // ─── Step 0: Locked / Ready ──────────────────────────────────────────────────────────────
  if (koStore.step === 0) {
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
        <button
          type="button"
          onClick={() => {
            haptic.light()
            navigate('/admin/dashboard')
          }}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('knockout.title')}</h1>
            <p className="text-sm text-text-secondary">{t('knockout.subtitle')}</p>
          </div>
        </div>

        <DarkCard className="p-6 md:p-8 flex flex-col items-center text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isReady ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
            {isReady ? <CheckCircle size={40} /> : <Lock size={40} />}
          </div>
          
          <div>
            <h2 className="text-lg font-bold mb-2">
              {isReady ? t('knockout.requirements') : t('knockout.notReady')}
            </h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              {t('knockout.requirementsDesc')}
            </p>
          </div>

          <div className="w-full max-w-sm space-y-3 text-start">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border">
              <CheckCircle size={18} className={allTeams.filter(t => t.group).length >= 12 ? 'text-success' : 'text-text-secondary'} />
              <span className="text-sm font-medium">{t('knockout.reqDraw')}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border">
              <CheckCircle size={18} className={isReady ? 'text-success' : 'text-text-secondary'} />
              <span className="text-sm font-medium">{t('knockout.reqMatches')}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!isReady}
            onClick={() => {
              haptic.intense()
              const qualified = getQualifiedTeams(allTeams, groupMatches)
              koStore.initKnockout(qualified)
            }}
            className={`w-full max-w-sm py-3.5 rounded-xl font-bold transition-all ${
              isReady 
                ? 'bg-accent text-white dark:text-black hover:bg-accent-hover shadow-lg shadow-accent/20' 
                : 'bg-bg-surface text-text-secondary cursor-not-allowed opacity-50'
            }`}
          >
            {t('knockout.create')}
          </button>
        </DarkCard>
      </motion.div>
    )
  }

  // ─── Step 1: Qualified Teams Review ────────────────────────────────────────────────────────
  if (koStore.step === 1) {
    const hasAnyEmptyQualified = qualifiedTeams.some(qt => !qt.teamId)
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
        <button
          type="button"
          onClick={() => {
            haptic.light()
            navigate('/admin/dashboard')
          }}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          <span>{t('common.back')}</span>
        </button>

        <div>
          <h1 className="text-xl font-bold">{t('knockout.qualifiedTeams')}</h1>
          <p className="text-sm text-text-secondary">{t('knockout.qualifiedSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qualifiedTeams.map((qt, i) => {
            const hasTeam = !!qt.teamId
            return (
              <DarkCard key={i} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-bold px-2 py-1 bg-accent/10 text-accent rounded-lg border border-accent/20">
                    {t('knockout.seed')} {qt.seed}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {qt.seed >= 7 ? t('knockout.bestThird') : t('knockout.directQualify')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  {hasTeam ? (
                    <div className="flex items-center gap-3">
                      <TeamLogo logo={qt.logo} name={qt.name} color={qt.color} size="md" />
                      <div>
                        <p className="font-bold">{qt.name}</p>
                        <p className="text-xs text-text-secondary">{t('knockout.group')} {qt.group || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 bg-zinc-800/10 flex items-center justify-center text-text-secondary font-bold text-lg">
                        ?
                      </div>
                      <div>
                        <p className="font-bold text-text-secondary">{isAr ? 'اختر فريقاً' : 'Select a team'}</p>
                        <p className="text-xs text-danger font-medium">{isAr ? 'مطلوب للمتابعة' : 'Required to proceed'}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 text-center text-xs" dir="ltr">
                    <div>
                      <p className="font-bold text-accent">{hasTeam ? qt.pts : '—'}</p>
                      <p className="text-[10px] text-text-secondary">PTS</p>
                    </div>
                    <div>
                      <p className="font-bold text-success">{hasTeam ? (qt.gd > 0 ? `+${qt.gd}` : qt.gd) : '—'}</p>
                      <p className="text-[10px] text-text-secondary">GD</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { haptic.light(); setChangeTeamModal({ open: true, index: i, team: qt }) }}
                  className="w-full py-2 bg-bg-surface hover:bg-bg-primary border border-border rounded-xl text-sm font-medium transition-colors"
                >
                  {t('knockout.changeTeam')}
                </button>
              </DarkCard>
            )
          })}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              haptic.medium()
              koStore.resetKnockout()
            }}
            className="flex-1 py-3.5 bg-bg-surface hover:bg-bg-primary text-text-primary rounded-xl font-bold transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={hasAnyEmptyQualified}
            onClick={() => {
              haptic.intense()
              koStore.goToStep2()
            }}
            className={`flex-[2] py-3.5 rounded-xl font-bold transition-colors ${
              hasAnyEmptyQualified
                ? 'bg-bg-surface text-text-secondary cursor-not-allowed opacity-50'
                : 'bg-accent hover:bg-accent-hover text-white dark:text-black shadow-lg shadow-accent/20'
            }`}
          >
            {t('knockout.reviewPairings')}
          </button>
        </div>

        {/* Modal: Change Team */}
        <ChangeTeamModal
          isOpen={changeTeamModal.open}
          onClose={() => setChangeTeamModal({ open: false, index: null, team: null })}
          onSelect={(newTeam) => {
            if (changeTeamModal.index !== null) {
              koStore.replaceQualifiedTeam(changeTeamModal.index, newTeam)
            }
          }}
          currentTeamId={changeTeamModal.team?.teamId}
          currentSeedLabel={`${t('knockout.seed')} ${changeTeamModal.team?.seed}`}
          teams={allTeams}
          allStandings={allStandings}
        />
      </motion.div>
    )
  }

  // ─── Step 2: QF Pairings Review ──────────────────────────────────────────────────────────
  if (koStore.step === 2) {
    const qfMatches = knockoutMatches.filter(m => m.round === 'QF')
    const hasAnyEmptyQF = qfMatches.some(m => !m.teamA || !m.teamB)
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
        <button
          type="button"
          onClick={() => {
            haptic.light()
            navigate('/admin/dashboard')
          }}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          <span>{t('common.back')}</span>
        </button>

        <div>
          <h1 className="text-xl font-bold">{t('knockout.reviewPairings')}</h1>
          <p className="text-sm text-text-secondary">{t('knockout.pairingsSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qfMatches.map((match) => {
            const teamA = allTeams.find(t => t.id === match.teamA)
            const teamB = allTeams.find(t => t.id === match.teamB)
            return (
              <DarkCard key={match.id} className="p-4 space-y-4 relative">
                <div className="text-center pb-2 border-b border-border">
                  <span className="text-sm font-bold text-accent">{match.matchLabel}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <TeamLogo logo={teamA?.logo} name={teamA?.name} color={teamA?.color} size="md" />
                    <span className="font-bold text-sm text-center line-clamp-1">{teamA?.name || '—'}</span>
                  </div>
                  <span className="text-lg font-bold text-text-secondary px-4">VS</span>
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <TeamLogo logo={teamB?.logo} name={teamB?.name} color={teamB?.color} size="md" />
                    <span className="font-bold text-sm text-center line-clamp-1">{teamB?.name || '—'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { haptic.light(); setMatchFormModal({ open: true, match, mode: 'full' }) }}
                    className="w-full py-2 bg-bg-surface hover:bg-bg-primary border border-border rounded-xl text-sm font-medium transition-colors"
                  >
                    {t('knockout.editMatch')}
                  </button>
                </div>
              </DarkCard>
            )
          })}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              haptic.medium()
              koStore.goToStep1()
            }}
            className="flex-1 py-3.5 bg-bg-surface hover:bg-bg-primary text-text-primary rounded-xl font-bold transition-colors"
          >
            {t('knockout.backToQualified')}
          </button>
          <button
            type="button"
            disabled={hasAnyEmptyQF}
            onClick={() => {
              haptic.intense()
              koStore.confirmBracket()
            }}
            className={`flex-[2] py-3.5 rounded-xl font-bold transition-colors ${
              hasAnyEmptyQF
                ? 'bg-bg-surface text-text-secondary cursor-not-allowed opacity-50'
                : 'bg-accent hover:bg-accent-hover text-white dark:text-black shadow-lg shadow-accent/20'
            }`}
          >
            {t('knockout.confirmBracket')}
          </button>
        </div>

        {/* Modal: Edit QF Match (Pre-confirm) */}
        <KnockoutMatchFormModal
          isOpen={matchFormModal.open}
          onClose={() => setMatchFormModal({ open: false, match: null, mode: 'full' })}
          onSubmit={(data) => {
            if (matchFormModal.match) {
              koStore.updatePreConfirmMatch(matchFormModal.match.id, data)
            }
          }}
          match={matchFormModal.match}
          teams={allTeams}
          mode={matchFormModal.mode}
        />
      </motion.div>
    )
  }

  // ─── Step 3: Active Knockout Stage Management ──────────────────────────────────────────────
  if (koStore.step === 3) {
  const renderMatchesList = (round, roundLabel, matches, forceShow = false) => {
    // Only show empty state for rounds that are forced (QF), skip others if empty
    if (!forceShow && matches.length === 0) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-bold">{roundLabel}</h2>
          <span className="text-xs px-2 py-0.5 bg-bg-surface rounded-full text-text-secondary">{matches.length}</span>
        </div>
        
        {matches.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <p className="text-sm font-medium">{t('knockout.noMatches')}</p>
            <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
              {round === 'QF' 
                ? (isAr ? 'أضف المباريات يدوياً أو انتظر إكمال الجولات السابقة' : 'Add matches manually or wait for previous rounds to complete')
                : (isAr ? 'ستظهر تلقائياً بعد إكمال الجولة السابقة' : 'Will appear automatically after previous round completes')
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {matches.map(m => (
              <KnockoutMatchCard
                key={m.id}
                match={m}
                teamA={allTeams.find(t => t.id === m.teamA)}
                teamB={allTeams.find(t => t.id === m.teamB)}
                onEditResult={(match) => setResultModal({ open: true, match })}
                onEditDate={(match) => setMatchFormModal({ open: true, match, mode: 'schedule' })}
                onEditFull={(match) => setMatchFormModal({ open: true, match, mode: 'full' })}
                onStartLive={(match) => koStore.setKOMatchLive(match.id)}
                onUpdateLive={(match) => setLiveScoreModal({ open: true, match })}
                onPostpone={(match) => koStore.postponeKOMatch(match.id)}
                onRestore={(match) => koStore.restoreKOMatch(match.id)}
                onDelete={(match) => setDeleteModal({ open: true, match })}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const matches = knockoutMatches
  const qfMatches = matches.filter(m => m.round === 'QF')
  const sfMatches = matches.filter(m => m.round === 'SF')
  const fMatches = matches.filter(m => m.round === 'F')

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6 pb-12">
      <button
        type="button"
        onClick={() => {
          haptic.light()
          navigate('/admin/dashboard')
        }}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
      >
        <ArrowLeft size={16} className="rtl:rotate-180" />
        <span>{t('common.back')}</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t('knockout.title')}</h1>
          <p className="text-sm text-text-secondary">{t('knockout.dashboardDesc')}</p>
        </div>
        
        {koStore.champion && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-accent">
            <Trophy size={16} />
            <span className="text-sm font-bold">{t('knockout.champion')}</span>
          </div>
        )}
      </div>

      {koStore.champion && (
        <DarkCard className="p-4 md:p-6 bg-gradient-to-br from-accent/20 to-bg-surface border-accent/30 text-center">
          <Trophy size={48} className="text-accent mx-auto mb-3" />
          <h2 className="text-xl md:text-2xl font-bold mb-1">{t('knockout.championCongrats')}</h2>
          <p className="text-lg font-bold text-accent">
            {allTeams.find(t => t.id === koStore.champion)?.name}
          </p>
        </DarkCard>
      )}

      {renderMatchesList('F', t('knockout.final'), fMatches)}
      {renderMatchesList('SF', t('knockout.sf'), sfMatches)}
      {renderMatchesList('QF', t('knockout.qf'), qfMatches, true)}

      {/* Auto-generate from groups button - only show if no QF matches exist */}
      {qfMatches.length === 0 && (
        <div className="pt-4">
          <button
            type="button"
            onClick={async () => {
              haptic.intense()
              const result = await koStore.autoGenerateFromGroups(allTeams, groupMatches)
              if (result.success) {
                alert(isAr ? 'تم إنشاء دور الـ 8 من ترتيب المجموعات!' : 'Quarter-Finals generated from group standings!')
              } else {
                alert(isAr ? result.message || 'فشل الإنشاء' : result.message || 'Generation failed')
              }
            }}
            className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white dark:text-black border border-accent/30 rounded-xl font-bold transition-colors shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            {isAr ? 'توليد دور الـ 8 من ترتيب المجموعات' : 'Generate QF from Group Standings'}
          </button>
        </div>
      )}

      {/* Edit Qualified Teams button - only show after QF are generated */}
      {qfMatches.length > 0 && (
        <div className="pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => {
              haptic.medium()
              koStore.goToStep1()
            }}
            className="w-full py-3.5 bg-bg-surface hover:bg-bg-primary border border-accent/30 text-accent rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            {isAr ? 'تعديل الفرق المتأهلة' : 'Edit Qualified Teams'}
          </button>
        </div>
      )}

      <div className="pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => { haptic.medium(); setResetModalOpen(true) }}
          className="w-full py-3.5 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw size={18} />
          {t('knockout.reset')}
        </button>
      </div>

      {/* Modals for Step 3 */}
      <KnockoutMatchFormModal
        isOpen={matchFormModal.open}
        onClose={() => setMatchFormModal({ open: false, match: null, mode: 'full' })}
        onSubmit={(data) => {
          if (matchFormModal.match) {
            if (matchFormModal.mode === 'schedule') {
              koStore.updateKOMatchSchedule(matchFormModal.match.id, data)
            } else {
              koStore.updateKOMatch(matchFormModal.match.id, data)
            }
          } else {
            koStore.addKOMatch(data)
          }
        }}
        match={matchFormModal.match}
        teams={allTeams}
        mode={matchFormModal.mode}
      />

      <KnockoutResultFormModal
        isOpen={resultModal.open}
        onClose={() => setResultModal({ open: false, match: null })}
        onSubmit={(result) => {
          if (resultModal.match) koStore.saveKOResult(resultModal.match.id, result)
        }}
        match={resultModal.match}
        teamA={allTeams.find(t => t.id === resultModal.match?.teamA)}
        teamB={allTeams.find(t => t.id === resultModal.match?.teamB)}
      />

      <LiveScoreModal
        isOpen={liveScoreModal.open}
        onClose={() => setLiveScoreModal({ open: false, match: null })}
        onSubmit={(data) => {
          if (liveScoreModal.match) koStore.updateKOLiveScore(liveScoreModal.match.id, data)
        }}
        match={liveScoreModal.match}
        teamA={allTeams.find(t => t.id === liveScoreModal.match?.teamA)}
        teamB={allTeams.find(t => t.id === liveScoreModal.match?.teamB)}
        liveData={liveScoreModal.match?.result}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, match: null })}
        onConfirm={() => {
          if (deleteModal.match) {
            koStore.deleteKOMatch(deleteModal.match.id)
          }
        }}
        title={isAr ? 'حذف المباراة' : 'Delete Match'}
        message={isAr ? 'هل أنت متأكد من حذف هذه المباراة؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to delete this match?'}
      />

      <DeleteConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={() => koStore.resetKnockout()}
        title={t('knockout.resetTitle')}
        message={t('knockout.resetMsg')}
        confirmText={isAr ? 'إعادة ضبط' : 'Reset'}
      />
    </motion.div>
  )
  }

  // Fallback for invalid step states
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="text-center py-12">
        <AlertCircle size={48} className="text-warning mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">{isAr ? 'خطأ في حالة المرحلة' : 'Invalid Step State'}</h2>
        <p className="text-sm text-text-secondary mb-4">
          {isAr ? 'حدث خطأ في بيانات مرحلة خروج المغلوب' : 'There was an error with the knockout stage data'}
        </p>
        <button
          type="button"
          onClick={() => {
            haptic.medium()
            koStore.resetKnockout()
          }}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white dark:text-black font-bold rounded-xl transition-colors"
        >
          {isAr ? 'إعادة ضبط المرحلة' : 'Reset Stage'}
        </button>
      </div>
    </motion.div>
  )
}
