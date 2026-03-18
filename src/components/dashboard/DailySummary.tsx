import { formatDuration, toLocalDate } from '../../utils/time'
import { MINUTES_PER_DAY } from '../../constants'
import StreakBadge from './StreakBadge'
import type { Session } from '../../types'

interface Props {
  totalOffMinutes: number
  removals: number
  goalMinutes: number
  streak: number
  sessions?: Session[]
  activeMinutes?: number
}

function localMinutesFromMidnight(utcIso: string, offsetMinutes: number): number {
  const local = toLocalDate(utcIso, offsetMinutes)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

export default function DailySummary({ totalOffMinutes, removals, goalMinutes, streak, sessions = [], activeMinutes = 0 }: Props) {
  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes
  const usedOffMinutes = totalOffMinutes + activeMinutes
  const budgetRemainingMinutes = Math.max(0, maxOffMinutes - usedOffMinutes)
  const overBudgetMinutes = Math.max(0, usedOffMinutes - maxOffMinutes)
  const budgetPct = Math.min(100, (usedOffMinutes / maxOffMinutes) * 100)

  const wearMinutes = Math.max(0, MINUTES_PER_DAY - totalOffMinutes - activeMinutes)
  const wearPct = Math.min(100, (wearMinutes / goalMinutes) * 100)

  const wearColor = wearPct >= 95 ? 'var(--green)' : wearPct >= 75 ? 'var(--amber)' : 'var(--rose)'
  const budgetColor = budgetPct >= 85 ? 'var(--rose)' : budgetPct >= 60 ? 'var(--amber)' : 'var(--green)'

  // Build timeline segments for the 24h bar
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  type SegmentType = 'wearing' | 'off' | 'future'
  const segments: { start: number; end: number; type: SegmentType }[] = []
  let cursor = 0

  for (const s of sorted) {
    const start = Math.max(0, Math.min(1440, localMinutesFromMidnight(s.startTime, s.startTimezoneOffset)))
    const end = s.endTime
      ? Math.max(0, Math.min(1440, localMinutesFromMidnight(s.endTime, s.endTimezoneOffset ?? s.startTimezoneOffset)))
      : currentMinutes

    if (start > cursor) segments.push({ start: cursor, end: start, type: 'wearing' })
    if (end > start)   segments.push({ start, end, type: 'off' })
    cursor = Math.max(cursor, end)
  }

  // Wearing gap from last session to now
  if (cursor < currentMinutes) {
    segments.push({ start: cursor, end: currentMinutes, type: 'wearing' })
    cursor = currentMinutes
  }

  // Rest of the day
  if (cursor < 1440) segments.push({ start: cursor, end: 1440, type: 'future' })

  const segmentColor: Record<SegmentType, string> = {
    wearing: wearColor,
    off: 'rgba(248,113,113,0.55)',
    future: 'rgba(255,255,255,0.04)',
  }

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

      {/* Day timeline */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: wearColor, letterSpacing: '0.04em' }}>
            {formatDuration(wearMinutes)} worn
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>24h</span>
        </div>
        <div style={{ width: '100%', height: 18, borderRadius: 9, overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.04)' }}>
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(seg.start / 1440) * 100}%`,
                width: `${((seg.end - seg.start) / 1440) * 100}%`,
                height: '100%',
                background: segmentColor[seg.type],
                transition: 'background 0.4s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
          {([
            { bg: wearColor,                    label: 'Wearing' },
            { bg: 'rgba(248,113,113,0.55)',      label: 'Off' },
            { bg: 'rgba(255,255,255,0.12)',      label: 'Rest of day' },
          ] as const).map(({ bg, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: bg, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
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
