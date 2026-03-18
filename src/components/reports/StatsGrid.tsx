import type { DailyStats } from '../../types'
import { computeAverageWear } from '../../utils/stats'
import { formatDuration, formatDurationShort } from '../../utils/time'

interface Props { stats: DailyStats[] }

export default function StatsGrid({ stats }: Props) {
  const avgWear = computeAverageWear(stats)
  const totalRemovals = stats.reduce((s, d) => s + d.removals, 0)
  const avgRemovals = stats.length > 0 ? totalRemovals / stats.length : 0
  const longestRemoval = stats.length > 0
    ? Math.max(...stats.map(d => d.longestRemovalMinutes))
    : 0
  const totalOffMinutes = stats.reduce((s, d) => s + d.totalOffMinutes, 0)
  const complianceDays = stats.filter(d => d.compliant).length

  const items = [
    { label: 'Avg Wear', value: `${avgWear.toFixed(1)}%`, color: avgWear >= 90 ? 'var(--green)' : avgWear >= 75 ? 'var(--amber)' : 'var(--rose)' },
    { label: 'Total Removals', value: String(totalRemovals), color: 'var(--text)' },
    { label: 'Avg / Day', value: String(Math.round(avgRemovals)), color: 'var(--text)' },
    { label: 'Longest Off', value: formatDuration(longestRemoval), color: 'var(--text-muted)' },
    { label: 'Total Off', value: formatDurationShort(totalOffMinutes), color: 'var(--text-muted)' },
    { label: 'Compliant', value: `${complianceDays}/${stats.length}`, color: complianceDays === stats.length && stats.length > 0 ? 'var(--green)' : 'var(--text)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {items.map(item => (
        <div
          key={item.label}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: item.color,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1, marginBottom: 6,
          }}>
            {item.value}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}
