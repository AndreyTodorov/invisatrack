import type { SetStats } from '../../hooks/useReports'
import { formatDuration } from '../../utils/time'

interface Props {
  setNumber: number
  current: SetStats
  previous: SetStats | null
  durationDays: number | null
  goalMinutes: number
}

function Delta({ current, previous, suffix = '', invert = false }: {
  current: number
  previous: number | null
  suffix?: string
  invert?: boolean
}) {
  if (previous === null) return null
  const diff = current - previous
  if (diff === 0) return null
  const isPositive = diff > 0
  const isGood = invert ? !isPositive : isPositive
  const color = isGood ? 'var(--green)' : 'var(--rose)'
  return (
    <span style={{ fontSize: 10, color, marginLeft: 5, fontWeight: 500 }}>
      {isPositive ? '+' : ''}{Number.isInteger(diff) ? diff : diff.toFixed(1)}{suffix}
    </span>
  )
}

export default function SetReportCard({ setNumber, current, previous, durationDays, goalMinutes }: Props) {
  const noData = current.totalRemovals === 0 && current.complianceDays === 0
  const avgWornMinutes = 1440 - current.avgOffMinutes
  const wornFillPct = noData ? 0 : Math.min((avgWornMinutes / 1440) * 100, 100)
  const goalNotchPct = Math.min((goalMinutes / 1440) * 100, 100)
  const goalHours = Math.round(goalMinutes / 60)

  const wornColor = noData
    ? 'var(--text-faint)'
    : avgWornMinutes >= goalMinutes
      ? 'var(--green)'
      : avgWornMinutes >= goalMinutes * 0.9
        ? 'var(--amber)'
        : 'var(--rose)'

  const complianceValue = noData
    ? '—'
    : durationDays !== null
      ? `${current.complianceDays} / ${durationDays}`
      : String(current.complianceDays)

  const rows = [
    {
      label: 'Avg Worn / Day',
      value: noData ? '—' : formatDuration(Math.round(avgWornMinutes)),
      delta: noData ? null : (
        <Delta
          current={avgWornMinutes}
          previous={previous?.totalRemovals ? (previous.avgOffMinutes != null ? 1440 - previous.avgOffMinutes : null) : null}
          suffix="m"
        />
      ),
      color: wornColor,
    },
    {
      label: 'Compliance Days',
      value: complianceValue,
      delta: noData ? null : <Delta current={current.complianceDays} previous={previous?.complianceDays ?? null} />,
      color: noData ? 'var(--text-faint)' : 'var(--text)',
    },
    {
      label: 'Avg Off / Day',
      value: noData ? '—' : formatDuration(Math.round(current.avgOffMinutes)),
      delta: noData ? null : <Delta current={current.avgOffMinutes} previous={previous?.totalRemovals ? (previous.avgOffMinutes ?? null) : null} suffix="m" invert />,
      color: noData ? 'var(--text-faint)' : 'var(--text-muted)',
    },
    {
      label: 'Total Removals',
      value: noData ? '—' : String(current.totalRemovals),
      delta: noData ? null : <Delta current={current.totalRemovals} previous={previous?.totalRemovals ?? null} invert />,
      color: noData ? 'var(--text-faint)' : 'var(--text)',
    },
    {
      label: 'Avg Removals / Day',
      value: noData ? '—' : current.avgRemovalsPerDay.toFixed(1),
      delta: noData ? null : <Delta current={current.avgRemovalsPerDay} previous={previous?.avgRemovalsPerDay ?? null} invert />,
      color: noData ? 'var(--text-faint)' : 'var(--text-muted)',
    },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-card)', boxShadow: 'var(--card-shadow)', padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--cyan)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Set {setNumber}
        </div>
        {durationDays !== null && (
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
            {durationDays} day{durationDays !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Wear bar: 0–24h range */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{
            fontSize: 8, fontWeight: 500, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Avg worn
          </span>
          <span style={{
            fontSize: 16, fontWeight: 700, color: wornColor,
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
          }}>
            {noData ? '—' : formatDuration(Math.round(avgWornMinutes))}
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'visible', position: 'relative' }}>
          <div style={{
            width: `${wornFillPct}%`, height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, #00D8FF 0%, #00E676 100%)',
          }} />
          <div style={{
            position: 'absolute', top: -3, left: `${goalNotchPct}%`,
            width: 2, height: 12, background: 'rgba(255,68,68,0.7)', borderRadius: 1,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>0h</span>
          <span style={{ fontSize: 8, color: 'rgba(255,68,68,0.6)' }}>goal {goalHours}h</span>
          <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>24h</span>
        </div>
      </div>

      {/* Rows: tiny label left, large value right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{
              fontSize: 9, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500,
            }}>
              {row.label}
            </span>
            <span style={{
              fontSize: 17, fontWeight: 700, color: row.color,
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
            }}>
              {row.value}{row.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
