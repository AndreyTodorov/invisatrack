import { useRef, useEffect, useCallback } from 'react'
import { formatDuration } from '../../utils/time'

interface Props {
  isRunning: boolean
  onPress: () => void
  disabled?: boolean
  budgetPercent?: number // 0–100, how much of daily off-budget has been consumed
  elapsedMinutes?: number
  reminderFired?: boolean
}

const HOLD_MS = 1000
const RING_R = 102
const RING_C = 2 * Math.PI * RING_R

// Smooth color gradient: cyan → amber → orange → red
const COLOR_STOPS: readonly [number, number, number, number][] = [
  [0,   34,  211, 238],  // cyan
  [20,  34,  211, 238],  // cyan (hold)
  [50,  252, 211, 77 ],  // amber
  [70,  251, 146, 60 ],  // orange
  [85,  248, 113, 113],  // rose
  [100, 220, 50,  50 ],  // deep red
]

function lerpColor(pct: number): [number, number, number] {
  let lo = COLOR_STOPS[0]
  let hi = COLOR_STOPS[COLOR_STOPS.length - 1]
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (pct >= COLOR_STOPS[i][0] && pct <= COLOR_STOPS[i + 1][0]) {
      lo = COLOR_STOPS[i]; hi = COLOR_STOPS[i + 1]; break
    }
  }
  const range = hi[0] - lo[0]
  const t = range === 0 ? 0 : (pct - lo[0]) / range
  const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  return [
    Math.round(lo[1] + (hi[1] - lo[1]) * e),
    Math.round(lo[2] + (hi[2] - lo[2]) * e),
    Math.round(lo[3] + (hi[3] - lo[3]) * e),
  ]
}

// Pulse duration: 3s (calm) → 0.7s (urgent), quadratic ease-in
function pulseDuration(pct: number): number {
  const t = pct / 100
  return 3.0 - t * t * 2.3
}

export default function TimerButton({ isRunning, onPress, disabled, budgetPercent = 0, elapsedMinutes = 0, reminderFired = false }: Props) {
  const glowRef      = useRef<HTMLDivElement>(null)
  const holdRingRef  = useRef<SVGCircleElement>(null)

  const glowRafRef   = useRef(0)
  const holdRafRef   = useRef(0)
  const isHoldingRef = useRef(false)
  const holdStartRef = useRef(0)
  const budgetRef    = useRef(budgetPercent)
  const onPressRef   = useRef(onPress)

  useEffect(() => { budgetRef.current = budgetPercent }, [budgetPercent])
  useEffect(() => { onPressRef.current = onPress }, [onPress])

  // Adaptive glow — runs at 60fps while timer is active, off otherwise
  useEffect(() => {
    cancelAnimationFrame(glowRafRef.current)
    if (!isRunning) {
      if (glowRef.current) glowRef.current.style.boxShadow = 'none'
      return
    }
    let phase = Math.random() * 2 * Math.PI
    function tick() {
      const pct = budgetRef.current
      const dur  = pulseDuration(pct)
      const [r, g, b] = lerpColor(pct)
      phase += (2 * Math.PI) / (dur * 60)
      const t     = (Math.sin(phase - Math.PI / 2) + 1) / 2
      const alpha = 0.35 + (pct / 100) * 0.4
      const base  = 20  + (pct / 100) * 32
      const outer = 45  + (pct / 100) * 65
      const a1 = Math.min(alpha * (0.5 + 0.5 * t), 0.9)
      const a2 = Math.min(alpha * 0.4 * (0.5 + 0.5 * t), 0.5)
      const s1 = base  * (0.6 + 0.6 * t)
      const s2 = outer * (0.6 + 0.6 * t)
      if (glowRef.current) {
        glowRef.current.style.boxShadow =
          `0 0 ${s1.toFixed(1)}px ${(s1 * 0.4).toFixed(1)}px rgba(${r},${g},${b},${a1.toFixed(2)}), ` +
          `0 0 ${s2.toFixed(1)}px ${(s2 * 0.3).toFixed(1)}px rgba(${r},${g},${b},${a2.toFixed(2)})`
      }
      glowRafRef.current = requestAnimationFrame(tick)
    }
    glowRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(glowRafRef.current)
  }, [isRunning])

  const resetHold = useCallback(() => {
    isHoldingRef.current = false
    cancelAnimationFrame(holdRafRef.current)
    if (holdRingRef.current) {
      holdRingRef.current.style.opacity = '0'
      holdRingRef.current.setAttribute('stroke-dashoffset', String(RING_C))
    }
  }, [])

  const startHold = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    isHoldingRef.current = true
    holdStartRef.current = performance.now()
    function tick() {
      if (!isHoldingRef.current) return
      const progress = Math.min((performance.now() - holdStartRef.current) / HOLD_MS, 1)
      if (holdRingRef.current) {
        holdRingRef.current.style.opacity = '1'
        holdRingRef.current.setAttribute('stroke-dashoffset', String(RING_C * (1 - progress)))
      }
      if (progress >= 1) {
        resetHold()
        onPressRef.current()
        return
      }
      holdRafRef.current = requestAnimationFrame(tick)
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }, [disabled, resetHold])

  const cancelHold = useCallback(() => {
    if (isHoldingRef.current) resetHold()
  }, [resetHold])

  useEffect(() => () => {
    cancelAnimationFrame(glowRafRef.current)
    cancelAnimationFrame(holdRafRef.current)
  }, [])

  const [r, g, b] = isRunning ? lerpColor(budgetPercent) : [34, 211, 238]
  const color      = `rgb(${r},${g},${b})`


  const elapsedColor = reminderFired ? 'var(--rose)' : 'var(--cyan)'

  return (
    <div style={{ position: 'relative', width: 224, height: 224 }}>
      {/* Adaptive glow layer */}
      <div
        ref={glowRef}
        style={{ position: 'absolute', inset: 10, borderRadius: '50%', pointerEvents: 'none' }}
      />

      {/* Budget ring — only visible when timer is not running */}
      {!isRunning && (
        <svg width="224" height="224" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <circle cx="112" cy="112" r={RING_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <circle
            cx="112" cy="112" r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={String(RING_C)}
            strokeDashoffset={String(RING_C * (budgetPercent / 100))}
            transform="rotate(-90 112 112)"
            style={{
              transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease',
              filter: `drop-shadow(0 0 4px ${color})`,
            }}
          />
        </svg>
      )}

      {/* Button */}
      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) cancelHold() }}
        onPointerCancel={cancelHold}
        disabled={disabled}
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          background: isRunning ? `rgba(${r},${g},${b},0.09)` : 'var(--surface-2)',
          border: 'none',
          color: isRunning ? color : 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          transition: 'background 0.5s, border-color 0.5s, color 0.5s',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
      >
        {isRunning ? (
          <>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 36,
              fontWeight: 700,
              color: elapsedColor,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              filter: `drop-shadow(0 0 10px ${elapsedColor})`,
            }}>
              {formatDuration(elapsedMinutes)}
            </span>
            <div style={{ width: 40, height: 1, background: `rgba(${r},${g},${b},0.25)`, margin: '8px 0 4px' }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
              <rect x="5" y="5" width="5" height="14" rx="1"/>
              <rect x="14" y="5" width="5" height="14" rx="1"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.5, marginTop: 1 }}>
              Hold to stop
            </span>
          </>
        ) : (
          <>
            <>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
                {budgetPercent >= 100 ? <>Limit<br/>Reached</> : <>Remove<br/>Aligners</>}
              </span>
              <div style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.1)', margin: '5px 0 3px' }} />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.4 }}>
                Hold to start
              </span>
            </>
          </>
        )}
      </button>

      {/* Budget ring dot — rendered after button so it appears on top */}
      {!isRunning && budgetPercent > 2 && budgetPercent < 98 && (() => {
        const tipAngle = -Math.PI / 2 + (1 - budgetPercent / 100) * 2 * Math.PI
        const tipX = 112 + RING_R * Math.cos(tipAngle)
        const tipY = 112 + RING_R * Math.sin(tipAngle)
        return (
          <svg width="224" height="224" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <circle cx={tipX} cy={tipY} r={5} fill={color} style={{ transition: 'fill 0.5s ease' }} />
          </svg>
        )
      })()}

      {/* Hold indicator — rendered after button so it appears on top */}
      <svg width="224" height="224" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <circle
          ref={holdRingRef}
          cx="112" cy="112" r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={String(RING_C)}
          strokeDashoffset={String(RING_C)}
          transform="rotate(-90 112 112)"
          opacity="0"
          style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.7))' }}
        />
      </svg>
    </div>
  )
}
