import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { haptic } from '../../hooks/useHaptics'

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  targetSize = 256,
  isAr = true,
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const lastPan = useRef({ x: 0, y: 0 })
  const imgRef = useRef(null)
  // Natural image size, captured on load so layout is computed from state
  const [natural, setNatural] = useState(null)

  // Viewport dimensions
  const VIEWPORT_SIZE = 240

  // Calculate layout bounds for a given zoom level
  const getLayout = (z = zoom) => {
    if (!natural) {
      return { fitW: VIEWPORT_SIZE, fitH: VIEWPORT_SIZE, activeW: VIEWPORT_SIZE, activeH: VIEWPORT_SIZE, centerX: 0, centerY: 0 }
    }
    const { w, h } = natural
    let fitW = VIEWPORT_SIZE
    let fitH = VIEWPORT_SIZE

    if (w > h) {
      fitW = (w / h) * VIEWPORT_SIZE
    } else {
      fitH = (h / w) * VIEWPORT_SIZE
    }

    const activeW = fitW * z
    const activeH = fitH * z

    const centerX = (VIEWPORT_SIZE - activeW) / 2
    const centerY = (VIEWPORT_SIZE - activeH) / 2

    return { fitW, fitH, activeW, activeH, centerX, centerY }
  };

  const { fitW, fitH, activeW, activeH, centerX, centerY } = getLayout()

  // Clamp function to keep image covering the viewport
  const clampPan = (x, y, layout = { activeW, activeH }) => {
    const { activeW, activeH } = layout
    const maxX = (activeW - VIEWPORT_SIZE) / 2
    const maxY = (activeH - VIEWPORT_SIZE) / 2
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    }
  }

  // Reset zoom & pan when the modal opens with a new image
  // (render-phase adjustment instead of a state-resetting effect)
  const resetKey = isOpen ? imageSrc : null
  const [prevResetKey, setPrevResetKey] = useState(null)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    if (resetKey !== null) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setNatural(null)
    }
  }

  const handleStart = (clientX, clientY) => {
    haptic.light()
    setIsDragging(true)
    dragStart.current = { x: clientX, y: clientY }
    lastPan.current = { ...pan }
  }

  const handleMove = (clientX, clientY) => {
    if (!isDragging) return
    const dx = clientX - dragStart.current.x
    const dy = clientY - dragStart.current.y
    const nextPan = clampPan(lastPan.current.x + dx, lastPan.current.y + dy)
    setPan(nextPan)
  }

  const handleEnd = () => {
    setIsDragging(false)
  }

  // Adjust zoom and keep pan clamped
  const handleZoomChange = (val) => {
    setZoom(val)
    // Clamp pan against the layout at the new zoom
    setPan(clampPan(pan.x, pan.y, getLayout(val)))
  }

  // Crop drawing onto canvas and export base64
  const handleSave = () => {
    if (!imgRef.current) return
    haptic.intense()

    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Scale from viewport space to target canvas space
    const s = targetSize / VIEWPORT_SIZE

    // Viewport-relative offset is:
    // left = centerX + panX
    // top = centerY + panY
    const dx = (centerX + pan.x) * s
    const dy = (centerY + pan.y) * s
    const dWidth = activeW * s
    const dHeight = activeH * s

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imgRef.current, dx, dy, dWidth, dHeight)

    // Export as high compression JPEG to save space
    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
    onCropComplete(compressedBase64)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm glass-card border border-accent/20 rounded-3xl p-5 shadow-2xl z-10 flex flex-col items-center gap-4"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between border-b border-border pb-3">
              <span className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Move size={16} className="text-accent" />
                {isAr ? 'قص وضبط الصورة' : 'Crop & Adjust Image'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center hover:bg-bg-primary transition-colors text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>

            {/* Viewport Frame Container */}
            <div
              className="relative rounded-full border-2 border-accent bg-zinc-950 shadow-inner overflow-hidden select-none cursor-move touch-none flex items-center justify-center"
              style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
              onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
              onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={(e) => {
                const t = e.touches[0]
                handleStart(t.clientX, t.clientY)
              }}
              onTouchMove={(e) => {
                const t = e.touches[0]
                handleMove(t.clientX, t.clientY)
              }}
              onTouchEnd={handleEnd}
            >
              {imageSrc && (
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop Preview"
                  draggable={false}
                  onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
                    setNatural({ w, h })
                  }}
                  className="absolute pointer-events-none max-w-none origin-center"
                  style={{
                    width: fitW,
                    height: fitH,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                />
              )}
            </div>

            {/* Zoom Slider */}
            <div className="w-full flex items-center gap-3 px-2">
              <ZoomOut size={16} className="text-text-secondary" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-accent h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn size={16} className="text-text-secondary" />
            </div>

            <p className="text-[10px] text-text-secondary text-center -mt-1">
              {isAr ? 'اسحب الصورة للتحريك، واستخدم شريط التمرير للتكبير' : 'Drag to pan, use slider to zoom'}
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 rounded-xl border border-border bg-bg-surface text-text-secondary hover:bg-bg-primary text-xs font-bold transition-all"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-black text-xs font-bold transition-all shadow-lg shadow-accent/15"
              >
                {isAr ? 'قص وحفظ' : 'Crop & Save'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
