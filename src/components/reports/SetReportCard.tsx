import type { SetStats } from '../../hooks/useReports'

interface Props {
  setNumber: number
  current: SetStats
  previous: SetStats | null
  durationDays: number | null
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
  // invert: fewer is better (removals), so negative diff = green
  const isPositive = diff > 0
  const isGood = invert ? !isPositive : isPositive
  const color = isGood ? 'var(--green)' : 'var(--rose)'
  return (
    <span style={{ fontSize: 11, color, marginLeft: 6, fontWeight: 500 }}>
      {isPositive ? '+' : ''}{Number.isInteger(diff) ? diff : diff.toFixed(1)}{suffix}
    </span>
  )
}

export default function SetReportCard({ setNumber, current, previous, durationDays }: Props) {
  const noData = current.totalRemovals === 0 && current.complianceDays === 0

  const rows = [
    {
      label: 'Avg Wear',
      value: noData ? '—' : `${current.avgWearPct.toFixed(1)}%`,
      delta: noData ? null : <Delta current={current.avgWearPct} previous={previous?.totalRemovals ? (previous?.avgWearPct ?? null) : null} suffix="%" />,
      color: noData ? 'var(--text-faint)' : current.avgWearPct >= 90 ? 'var(--green)' : current.avgWearPct >= 75 ? 'var(--amber)' : 'var(--rose)',
    },
    {
      label: 'Total Removals',
      value: noData ? '—' : String(current.totalRemovals),
      delta: noData ? null : <Delta current={current.totalRemovals} previous={previous?.totalRemovals ?? null} invert />,
      color: noData ? 'var(--text-faint)' : 'var(--text)',
    },
    {
      label: 'Compliance Days',
      value: noData ? '—' : String(current.complianceDays),
      delta: noData ? null : <Delta current={current.complianceDays} previous={previous?.complianceDays ?? null} />,
      color: noData ? 'var(--text-faint)' : 'var(--text)',
    },
    {
      label: 'Avg Removals/Day',
      value: noData ? '—' : current.avgRemovalsPerDay.toFixed(1),
      delta: noData ? null : <Delta current={current.avgRemovalsPerDay} previous={previous?.avgRemovalsPerDay ?? null} invert />,
      color: noData ? 'var(--text-faint)' : 'var(--text-muted)',
    },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 18, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--cyan)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Set {setNumber}
        </div>
        {durationDays !== null && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            {durationDays} day{durationDays !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: row.color }}>
              {row.value}{row.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
