import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Calendar, MapPin, Download, ChevronDown, FileText, Share2 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useKnockoutStore } from '../../stores/useKnockoutStore'
import { haptic } from '../../hooks/useHaptics'
import TeamLogo from './TeamLogo'

export default function TournamentBracketView({ teams = [], isAdmin = false }) {
  const lang = useAppStore((s) => s.language)
  const theme = useAppStore((s) => s.theme)
  const isAr = lang === 'ar'

  const listenToFirestore = useKnockoutStore((s) => s.listenToFirestore)
  const cleanup = useKnockoutStore((s) => s.cleanup)
  const koMatches = useKnockoutStore((s) => s.knockoutMatches)
  const champion = useKnockoutStore((s) => s.champion)

  const bracketRef = useRef(null)
  const [capturing] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    listenToFirestore()
    return () => cleanup()
  }, [listenToFirestore, cleanup])

  const teamsById = useMemo(() => {
    const map = {}
    teams.forEach((t) => (map[t.id] = t))

    const koQualified = useKnockoutStore.getState().qualifiedTeams || []
    koQualified.forEach((t) => {
      if (t.teamId && !map[t.teamId]) {
        map[t.teamId] = {
          id: t.teamId,
          name: t.name,
          logo: t.logo,
          color: t.color,
        }
      }
    })
    if (koMatches?.length > 0) {
      map.__koCount = koMatches.length
    }
    return map
  }, [teams, koMatches])

  const bracketData = useMemo(() => {
    const qf = { qf1: null, qf2: null, qf3: null, qf4: null }
    const sf = { sf1: null, sf2: null }
    let final = null

    const matchesList = koMatches || []
    matchesList.forEach((m) => {
      const round = (m.round || '').toUpperCase()
      const label = (m.matchLabel || '').toLowerCase()

      if (round === 'QF' || round.includes('8') || round.includes('ربع')) {
        if (label.includes('1')) qf.qf1 = m
        else if (label.includes('2')) qf.qf2 = m
        else if (label.includes('3')) qf.qf3 = m
        else if (label.includes('4')) qf.qf4 = m
        else {
          const emptySlot = Object.keys(qf).find((key) => !qf[key])
          if (emptySlot) qf[emptySlot] = m
        }
      } else if (round === 'SF' || round.includes('4') || round.includes('نصف')) {
        if (label.includes('1')) sf.sf1 = m
        else if (label.includes('2')) sf.sf2 = m
        else {
          const emptySlot = Object.keys(sf).find((key) => !sf[key])
          if (emptySlot) sf[emptySlot] = m
        }
      } else if (round === 'F' || round.includes('FINAL') || round.includes('نهائي')) {
        final = m
      }
    })

    return { qf, sf, final }
  }, [koMatches])

  const formatLabel = useCallback(
    (label) => {
      if (isAr && label.includes('QF')) return label.replace('QF', 'دور الـ 8 - ')
      if (isAr && label.includes('SF')) return label.replace('SF', 'دور الـ 4 - ')
      return label
    },
    [isAr]
  )

  const renderTeamRow = (teamId, score, isWinner, isPenaltyWinner, compact = false) => {
    const team = teamsById[teamId]
    const hasTeam = !!teamId && !!team
    const pad = compact ? 'p-1.5' : 'p-2.5'

    return (
      <div
        className={`flex items-center justify-between ${pad} transition-colors ${
          isWinner ? 'bg-accent/5 dark:bg-accent/10' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasTeam ? (
            <>
              <TeamLogo logo={team.logo} name={team.name} color={team.color} size="xs" />
              <span
                className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold truncate ${
                  isWinner ? 'text-accent' : 'text-text-primary'
                }`}
              >
                {team.name}
              </span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full border border-dashed border-border bg-bg-surface flex items-center justify-center text-[10px] text-text-secondary font-bold">
                ?
              </div>
              <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-text-secondary font-medium italic`}>
                {isAr ? 'انتظار المتأهل' : 'TBD'}
              </span>
            </>
          )}
        </div>

        {hasTeam && score !== null && (
          <div className="flex items-center gap-1 shrink-0 ms-2">
            <span
              className={`${compact ? 'text-xs' : 'text-sm'} font-extrabold tabular-nums ${
                isWinner ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              {score}
            </span>
            {isPenaltyWinner && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 whitespace-nowrap">
                {isAr ? 'ترجيح' : 'PEN'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderMatchCard = (match, label, compact = false) => {
    const hasTeams = match && (match.teamA || match.teamB)

    if (!match || !hasTeams) {
      return (
        <div
          className={`w-full glass-card rounded-xl border border-dashed border-border p-3 text-center select-none bg-bg-surface/30 flex flex-col items-center justify-center ${
            compact ? 'min-h-[88px]' : 'min-h-[120px]'
          }`}
        >
          <p className="text-[9px] font-extrabold text-accent mb-1.5 uppercase tracking-wider">
            {formatLabel(label)}
          </p>
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-border/60 bg-bg-surface flex items-center justify-center text-text-secondary text-sm font-bold">
            ?
          </div>
          <p className="text-[9px] text-text-secondary/70 font-bold italic mt-1">
            {isAr ? 'انتظار المتأهل' : 'TBD'}
          </p>
        </div>
      )
    }

    const { teamA, teamB, result, status } = match
    const isCompleted = status === 'completed'
    const isLive = status === 'live'

    const scoreA = result ? result.scoreA : null
    const scoreB = result ? result.scoreB : null

    const hasWinnerA = isCompleted && (scoreA > scoreB || (scoreA === scoreB && result?.penaltyWinner === teamA))
    const hasWinnerB = isCompleted && (scoreB > scoreA || (scoreA === scoreB && result?.penaltyWinner === teamB))

    const isPenaltyWinnerA = isCompleted && scoreA === scoreB && result?.penaltyWinner === teamA
    const isPenaltyWinnerB = isCompleted && scoreA === scoreB && result?.penaltyWinner === teamB

    return (
      <div
        className={`w-full glass-card rounded-xl border transition-all duration-300 relative select-none bg-bg-card overflow-hidden ${
          isLive ? 'border-live ring-1 ring-live/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]' : 'border-border/80 hover:border-accent/30'
        }`}
      >
        <div className="flex items-center justify-between px-2.5 py-1 bg-bg-surface border-b border-border/60">
          <span className="text-[8px] font-extrabold text-accent uppercase tracking-wider truncate">
            {formatLabel(label)}
          </span>
          {isLive && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-live shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              {isAr ? 'مباشر' : 'LIVE'}
            </span>
          )}
        </div>

        <div className="divide-y divide-border/40">
          {renderTeamRow(teamA, scoreA, hasWinnerA, isPenaltyWinnerA, compact)}
          {renderTeamRow(teamB, scoreB, hasWinnerB, isPenaltyWinnerB, compact)}
        </div>

        {(match.date || match.venue) && (
          <div className="px-2.5 py-1 bg-bg-surface/30 border-t border-border/20 text-[8px] text-text-secondary flex justify-between gap-1">
            {match.date && (
              <span className="flex items-center gap-0.5 truncate">
                <Calendar size={8} />
                {match.date}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-0.5 truncate text-end">
                <MapPin size={8} />
                {match.venue}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  const captureBg = theme === 'dark' ? '#0e0e0e' : '#faf8f4'
  const captureCardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff'
  const connectorStroke = theme === 'dark' ? 'rgba(184, 155, 94, 0.55)' : 'rgba(142, 110, 48, 0.55)'
  const connectorFill = theme === 'dark' ? 'rgba(184, 155, 94, 0.35)' : 'rgba(142, 110, 48, 0.35)'

  const prepareBracketForCapture = (target) => {
    const allElements = target.querySelectorAll('*')
    const savedStyles = []
    allElements.forEach((el) => {
      const cs = getComputedStyle(el)
      savedStyles.push({
        el,
        bg: el.style.backgroundColor,
        color: el.style.color,
        borderColor: el.style.borderColor,
        stroke: el.getAttribute('stroke'),
        strokeWidth: el.getAttribute('stroke-width'),
        fill: el.getAttribute('fill'),
      })
      if (cs.backgroundColor?.includes('oklab')) el.style.backgroundColor = 'transparent'
      if (cs.color?.includes('oklab')) el.style.color = theme === 'dark' ? '#a0a0a0' : '#5c5043'
      if (cs.borderColor?.includes('oklab')) el.style.borderColor = theme === 'dark' ? '#2a2a2a' : '#ddd2c2'
    })

    target.querySelectorAll('svg path, svg line, svg polyline').forEach((el) => {
      el.setAttribute('stroke', connectorStroke)
      el.setAttribute('stroke-width', '2')
      el.setAttribute('fill', 'none')
      el.setAttribute('vector-effect', 'non-scaling-stroke')
    })

    target.querySelectorAll('[data-bracket-connector]').forEach((el) => {
      el.style.backgroundColor = connectorFill
    })

    return savedStyles
  }

  const restoreBracketAfterCapture = (savedStyles) => {
    savedStyles.forEach(({ el, bg, color, borderColor, stroke, strokeWidth, fill }) => {
      el.style.backgroundColor = bg
      el.style.color = color
      el.style.borderColor = borderColor
      if (stroke === null) el.removeAttribute('stroke')
      else el.setAttribute('stroke', stroke)
      if (strokeWidth === null) el.removeAttribute('stroke-width')
      else el.setAttribute('stroke-width', strokeWidth)
      if (fill === null) el.removeAttribute('fill')
      else el.setAttribute('fill', fill)
    })
  }

  const captureAndDownload = async (format = 'png') => {
    if (!bracketRef.current) return
    try {
      const { toPng } = await import('html-to-image')
      const target = bracketRef.current

      const savedStyles = prepareBracketForCapture(target)

      const dataUrl = await toPng(target, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: captureBg,
        cacheBust: true,
      })

      restoreBracketAfterCapture(savedStyles)

      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = dataUrl
      })

      const margin = 24
      const canvasWidth = img.width + margin * 2
      const canvasHeight = img.height + margin * 2
      const outCanvas = document.createElement('canvas')
      outCanvas.width = canvasWidth
      outCanvas.height = canvasHeight
      const ctx = outCanvas.getContext('2d')

      ctx.fillStyle = captureBg
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      ctx.fillStyle = captureCardBg
      ctx.fillRect(margin - 4, margin - 4, img.width + 8, img.height + 8)
      ctx.drawImage(img, margin, margin, img.width, img.height)

      const dateStr = new Date().toISOString().split('T')[0]
      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `road-to-final-${dateStr}.png`
        link.href = outCanvas.toDataURL('image/png')
        link.click()
      } else {
        const { jsPDF } = await import('jspdf')
        const imgData = outCanvas.toDataURL('image/jpeg', 1.0)
        const pdf = new jsPDF({
          orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvasWidth, canvasHeight],
        })
        pdf.addImage(imgData, 'JPEG', 0, 0, canvasWidth, canvasHeight)
        pdf.save(`road-to-final-${dateStr}.pdf`)
      }
    } catch (err) {
      console.error('[Bracket] download failed:', err)
      throw err
    }
  }

  const handleShare = async () => {
    if (!bracketRef.current) return
    setIsSharing(true)
    try {
      const { toPng } = await import('html-to-image')
      const target = bracketRef.current

      const savedStyles = prepareBracketForCapture(target)

      const dataUrl = await toPng(target, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: captureBg,
        cacheBust: true,
      })

      restoreBracketAfterCapture(savedStyles)

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `bracket-${Date.now()}.png`, { type: 'image/png' })
      const shareData = {
        title: isAr ? 'طريق النهائي - GoalChok' : 'Road to Finals - GoalChok-গোলছক',
        text: isAr ? 'شاهد طريق الفرق للنهائي في بطولة GoalChok-গোলছক' : 'Check out the road to finals in GoalChok-গোলছক tournament',
        files: [file],
      }
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        const link = document.createElement('a')
        link.download = `bracket-${Date.now()}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(window.location.href)
          alert(isAr ? 'تم نسخ الرابط!' : 'Link copied!')
        } catch {
          alert(isAr ? 'فشل المشاركة' : 'Share failed')
        }
      }
    } finally {
      setIsSharing(false)
    }
  }

  const { qf, sf, final } = bracketData
  const hasBracket = koMatches.length > 0

  const roundTitle = (ar, en) => (
    <p className="text-[10px] font-black text-accent uppercase tracking-widest text-center mb-2">{isAr ? ar : en}</p>
  )

  const mobileBracket = (
    <div className="md:hidden w-full space-y-4" dir="ltr">
      {roundTitle('دور الـ 8', 'Quarter-Finals')}
      <div className="grid grid-cols-2 gap-2">
        {renderMatchCard(qf.qf1, 'QF 1', true)}
        {renderMatchCard(qf.qf2, 'QF 2', true)}
        {renderMatchCard(qf.qf3, 'QF 3', true)}
        {renderMatchCard(qf.qf4, 'QF 4', true)}
      </div>

      <div className="flex justify-center">
        <div className="w-px h-4" data-bracket-connector style={{ backgroundColor: connectorFill }} />
      </div>

      {roundTitle('دور الـ 4', 'Semi-Finals')}
      <div className="grid grid-cols-2 gap-2">
        {renderMatchCard(sf.sf1, 'SF 1', true)}
        {renderMatchCard(sf.sf2, 'SF 2', true)}
      </div>

      <div className="flex justify-center">
        <div className="w-px h-4" data-bracket-connector style={{ backgroundColor: connectorFill }} />
      </div>

      {roundTitle('النهائي', 'The Final')}
      {renderMatchCard(final, isAr ? 'النهائي' : 'Final', true)}
    </div>
  )

  const desktopBracket = (
    <div className="hidden md:block w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
      <div className="flex flex-col gap-1 min-w-[720px] lg:min-w-[960px]" dir="ltr">
        <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr_32px_1fr] gap-0 text-center border-b border-accent/20 pb-3 mb-4 select-none">
          <div className="text-[11px] font-black text-accent uppercase tracking-widest">{isAr ? 'دور الـ 8' : 'Quarter-Finals'}</div>
          <div />
          <div className="text-[11px] font-black text-accent uppercase tracking-widest">{isAr ? 'دور الـ 4' : 'Semi-Finals'}</div>
          <div />
          <div className="text-[11px] font-black text-accent uppercase tracking-widest">{isAr ? 'النهائي' : 'The Final'}</div>
          <div />
          <div className="text-[11px] font-black text-accent uppercase tracking-widest">{isAr ? 'دور الـ 4' : 'Semi-Finals'}</div>
          <div />
          <div className="text-[11px] font-black text-accent uppercase tracking-widest">{isAr ? 'دور الـ 8' : 'Quarter-Finals'}</div>
        </div>

        <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr_32px_1fr] gap-0 items-stretch h-[380px] lg:h-[440px]">
          <div className="flex flex-col justify-between py-4 h-full">
            {renderMatchCard(qf.qf1, 'QF 1')}
            {renderMatchCard(qf.qf4, 'QF 4')}
          </div>
          <div className="h-full relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke={connectorStroke} strokeWidth="2">
              <path d="M 0,22.62 L 50,22.62 L 50,77.38 L 0,77.38 M 50,50 L 100,50" />
            </svg>
          </div>
          <div className="flex flex-col justify-center py-4 h-full">
            {renderMatchCard(sf.sf1, 'SF 1')}
          </div>
          <div className="h-full relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke={connectorStroke} strokeWidth="2">
              <path d="M 0,50 L 100,50" />
            </svg>
          </div>
          <div className="flex flex-col justify-center py-4 h-full">
            {renderMatchCard(final, isAr ? 'النهائي' : 'Final')}
          </div>
          <div className="h-full relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke={connectorStroke} strokeWidth="2">
              <path d="M 0,50 L 100,50" />
            </svg>
          </div>
          <div className="flex flex-col justify-center py-4 h-full">
            {renderMatchCard(sf.sf2, 'SF 2')}
          </div>
          <div className="h-full relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke={connectorStroke} strokeWidth="2">
              <path d="M 100,22.62 L 50,22.62 L 50,77.38 L 100,77.38 M 50,50 L 0,50" />
            </svg>
          </div>
          <div className="flex flex-col justify-between py-4 h-full">
            {renderMatchCard(qf.qf2, 'QF 2')}
            {renderMatchCard(qf.qf3, 'QF 3')}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header with buttons */}
      {hasBracket && (
        <div className="w-full flex items-center gap-3 mb-4 max-w-sm mx-auto">
          <motion.button
            onClick={() => {
              haptic.light()
              handleShare()
            }}
            disabled={isSharing || capturing}
            animate={isSharing ? { scale: [1, 0.95, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, repeat: isSharing ? Infinity : 0 }}
            className="flex-1 h-10 px-3 bg-bg-surface/50 border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-text-primary hover:bg-bg-surface hover:border-border transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm"
          >
            <motion.div
              animate={isSharing ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isSharing ? Infinity : 0, ease: "linear" }}
            >
              <Share2 size={16} />
            </motion.div>
            {isSharing ? (isAr ? 'جاري...' : 'Sharing...') : (isAr ? 'مشاركة' : 'Share')}
          </motion.button>
          <div className="relative flex-1">
            <button
              onClick={() => {
                haptic.medium()
                setShowDownloadMenu(!showDownloadMenu)
              }}
              disabled={capturing}
              className="w-full h-10 px-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent-hover transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-md shadow-accent/20"
            >
              {capturing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Download size={16} />
                </motion.div>
              ) : (
                <Download size={16} />
              )}
              {capturing ? (isAr ? 'جاري...' : 'Downloading...') : (isAr ? 'تحميل' : 'Download')}
              <ChevronDown size={14} className="opacity-70" />
            </button>
            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDownloadMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full end-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl py-1.5 shadow-xl z-20"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {isAr ? 'تنسيق' : 'Format'}
                  </div>
                  <button
                    onClick={() => { captureAndDownload('png'); setShowDownloadMenu(false) }}
                    className="w-full px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-start"
                  >
                    <Download size={12} /> PNG
                  </button>
                  <button
                    onClick={() => { captureAndDownload('pdf'); setShowDownloadMenu(false) }}
                    className="w-full px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-start"
                  >
                    <FileText size={12} /> PDF
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      )}

      {isAdmin && koMatches.length === 0 && (
        <div className="w-full max-w-md p-6 bg-bg-surface border border-border rounded-2xl text-center mb-6">
          <Trophy size={36} className="text-text-secondary mx-auto mb-3" />
          <p className="text-sm font-bold text-text-primary">
            {isAr ? 'مخطط البطولة فارغ حالياً' : 'The tournament bracket is currently empty'}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {isAr ? 'استخدم لوحة الإدارة لإنشاء جدول خروج المغلوب' : 'Use the admin panel to create knockout schedule'}
          </p>
        </div>
      )}

      {!hasBracket && !isAdmin && (
        <div className="w-full max-w-md p-6 bg-bg-surface border border-border rounded-2xl text-center mb-6">
          <Trophy size={36} className="text-text-secondary mx-auto mb-3" />
          <p className="text-sm font-bold text-text-primary">
            {isAr ? 'مخطط البطولة سيظهر قريباً' : 'The tournament bracket will appear soon'}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {isAr ? 'تابعنا لمعرفة متأهلي دور خروج المغلوب' : 'Stay tuned for knockout stage pairings'}
          </p>
        </div>
      )}


      {champion && teamsById[champion] && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-4 bg-linear-to-br from-accent/20 to-bg-surface border border-accent/30 rounded-2xl text-center mb-6 flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/10">
            <Trophy size={32} />
          </div>
          <div>
            <h3 className="text-base font-black text-accent">{isAr ? 'بطل البطولة' : 'Tournament Champion'}</h3>
            <p className="text-lg font-extrabold text-text-primary mt-1">{teamsById[champion].name}</p>
          </div>
        </motion.div>
      )}

      {hasBracket && (
        <div ref={bracketRef} className="w-full px-1 sm:px-2 max-w-5xl mx-auto bg-bg-primary rounded-xl">
          {mobileBracket}
          {desktopBracket}
        </div>
      )}

      {hasBracket && (
        <div className="flex flex-wrap gap-3 text-[10px] text-text-secondary justify-center px-4 mt-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            {isAr ? 'مباراة الإقصاء' : 'Knockout Match'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-live" />
            {isAr ? 'مباشر حالياً' : 'Live Now'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-[8px] px-1" />
            {isAr ? 'حُسمت بركلات الترجيح' : 'Decided via Penalties'}
          </div>
        </div>
      )}
    </div>
  )
}
