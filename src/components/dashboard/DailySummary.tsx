import { formatDuration } from '../../utils/time'
import { MINUTES_PER_DAY } from '../../constants'
import StreakBadge from './StreakBadge'

interface Props {
  totalOffMinutes: number
  removals: number
  goalMinutes: number
  streak: number
  activeMinutes?: number
}

const RING_R = 34
const RING_C = 2 * Math.PI * RING_R

export default function DailySummary({ totalOffMinutes, removals, goalMinutes, streak, activeMinutes = 0 }: Props) {
  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes
  const usedOffMinutes = totalOffMinutes + activeMinutes
  const budgetRemainingMinutes = Math.max(0, maxOffMinutes - usedOffMinutes)
  const overBudgetMinutes = Math.max(0, usedOffMinutes - maxOffMinutes)
  const budgetPct = Math.min(100, (usedOffMinutes / maxOffMinutes) * 100)

  const wearMinutes = MINUTES_PER_DAY - totalOffMinutes - activeMinutes
  const wearPct = Math.min(100, (wearMinutes / goalMinutes) * 100)
  const ringOffset = RING_C * (1 - wearPct / 100)

  const ringColor = wearPct >= 95 ? 'var(--green)' : wearPct >= 75 ? 'var(--amber)' : 'var(--rose)'
  const budgetColor = budgetPct >= 85 ? 'var(--rose)' : budgetPct >= 60 ? 'var(--amber)' : 'var(--green)'

  const stats = [
    {
      label: 'Off Time',
      value: formatDuration(usedOffMinutes),
      color: activeMinutes > 0 ? 'var(--cyan)' : 'var(--text)',
    },
    {
      label: 'Removals',
      value: String(removals),
      color: 'var(--text)',
    },
    overBudgetMinutes > 0
      ? { label: 'Over Limit', value: `+${formatDuration(overBudgetMinutes)}`, color: 'var(--rose)' }
      : { label: 'Budget Left', value: formatDuration(budgetRemainingMinutes), color: budgetColor },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Today
        </span>
        <StreakBadge streak={streak} />
      </div>

      {/* Wear ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 88, height: 88 }}>
          <svg width="88" height="88" style={{ position: 'absolute', inset: 0 }}>
            {/* Track */}
            <circle
              cx="44" cy="44" r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="5"
            />
            {/* Progress */}
            <circle
              cx="44" cy="44" r={RING_R}
              fill="none"
              stroke={ringColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${RING_C}`}
              strokeDashoffset={`${ringOffset}`}
              transform="rotate(-90 44 44)"
              style={{
                transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease',
                filter: `drop-shadow(0 0 5px ${ringColor})`,
              }}
            />
          </svg>
          {/* Center label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: ringColor, lineHeight: 1 }}>
              {Math.round(wearPct)}%
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              wear
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 17,
              fontWeight: 600,
              color,
              lineHeight: 1,
              marginBottom: 6,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.04em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
