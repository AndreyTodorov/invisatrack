interface Props {
  isRunning: boolean
  onPress: () => void
  disabled?: boolean
  budgetPercent?: number // 0–100, how much of daily off-budget has been consumed
}

const RING_R = 90
const RING_C = 2 * Math.PI * RING_R

function ringColor(pct: number): string {
  if (pct >= 85) return 'var(--rose)'
  if (pct >= 60) return 'var(--amber)'
  return 'var(--cyan)'
}

function ringGlow(pct: number): string {
  if (pct >= 85) return 'var(--rose-glow)'
  if (pct >= 60) return 'var(--amber-bg)'
  return 'var(--cyan-glow)'
}

export default function TimerButton({ isRunning, onPress, disabled, budgetPercent = 0 }: Props) {
  const color = isRunning ? 'var(--rose)' : ringColor(budgetPercent)
  const glow = isRunning ? 'var(--rose-glow)' : ringGlow(budgetPercent)
  const dashOffset = RING_C * (budgetPercent / 100)

  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      {/* Pulsing halo when running */}
      {isRunning && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          border: '2px solid var(--rose)',
          opacity: 0.4,
          animation: 'pulse-ring 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* SVG budget ring */}
      <svg
        width="200" height="200"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {/* Track */}
        <circle
          cx="100" cy="100" r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="5"
        />
        {/* Budget arc — shrinks as budget is consumed */}
        <circle
          cx="100" cy="100" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${RING_C}`}
          strokeDashoffset={`${dashOffset}`}
          transform="rotate(-90 100 100)"
          style={{
            transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease',
            filter: `drop-shadow(0 0 6px ${glow})`,
          }}
        />
      </svg>

      {/* Button circle */}
      <button
        onClick={onPress}
        disabled={disabled}
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          background: isRunning ? 'var(--rose-bg)' : 'var(--surface-2)',
          border: `1px solid ${isRunning ? 'rgba(248,113,113,0.25)' : 'var(--border-strong)'}`,
          color: isRunning ? 'var(--rose)' : 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          transition: 'background 0.2s, transform 0.1s, border-color 0.2s',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
        onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isRunning ? (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="5" height="14" rx="1"/>
              <rect x="14" y="5" width="5" height="14" rx="1"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Put Back
            </span>
          </>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              Remove<br/>Aligners
            </span>
          </>
        )}
      </button>
    </div>
  )
}
