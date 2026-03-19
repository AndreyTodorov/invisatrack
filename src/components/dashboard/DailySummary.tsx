import { useState, useEffect } from 'react'
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
  const [, setTick] = useState(0)
  useEffect(() => {
    if (activeMinutes > 0) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [activeMinutes])

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes
  const usedOffMinutes = totalOffMinutes + activeMinutes
  const budgetRemainingMinutes = Math.max(0, maxOffMinutes - usedOffMinutes)
  const overBudgetMinutes = Math.max(0, usedOffMinutes - maxOffMinutes)
  const budgetPct = Math.min(100, (usedOffMinutes / maxOffMinutes) * 100)

  const wearMinutes = Math.max(0, currentMinutes - totalOffMinutes - activeMinutes)
  // Pace: how on-track are we relative to expected wear by now?
  const expectedWearByNow = (currentMinutes / MINUTES_PER_DAY) * goalMinutes
  const pacePct = expectedWearByNow > 0 ? (wearMinutes / expectedWearByNow) * 100 : 100

  const wearColor = pacePct >= 95 ? 'var(--green)' : pacePct >= 75 ? 'var(--amber)' : 'var(--rose)'
  const budgetColor = budgetPct >= 85 ? 'var(--rose)' : budgetPct >= 60 ? 'var(--amber)' : 'var(--green)'

  // Build timeline segments for the 24h bar
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
    wearing: 'var(--green)',
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
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
            color: pacePct >= 95 ? 'var(--green)' : 'var(--amber)',
            background: pacePct >= 95 ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${pacePct >= 95 ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)'}`,
            borderRadius: 20, padding: '2px 8px',
          }}>
            {pacePct >= 95 ? 'On track' : 'Below goal'}
          </span>
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
          {/* Hour grid lines */}
          {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
            <div
              key={h}
              style={{
                position: 'absolute',
                left: `${(h / 24) * 100}%`,
                top: 0,
                width: 1,
                height: '100%',
                background: h % 6 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                pointerEvents: 'none',
              }}
            />
          ))}
          {/* Now indicator */}
          <div
            style={{
              position: 'absolute',
              left: `${(currentMinutes / 1440) * 100}%`,
              top: -2,
              width: 2,
              height: 'calc(100% + 4px)',
              background: 'rgba(255,255,255,0.75)',
              borderRadius: 1,
              boxShadow: '0 0 4px rgba(255,255,255,0.3)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        </div>
        {/* Hour labels + now dot */}
        <div style={{ position: 'relative', height: 14, marginTop: 3 }}>
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => (
            <span
              key={h}
              style={{
                position: 'absolute',
                left: `${(h / 24) * 100}%`,
                transform: h === 0 ? 'none' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
                fontSize: 8,
                color: 'var(--text-faint)',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {h}
            </span>
          ))}
          {/* Now dot */}
          <div
            style={{
              position: 'absolute',
              left: `${(currentMinutes / 1440) * 100}%`,
              top: '50%',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 5px rgba(255,255,255,0.35)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          {([
            { bg: 'var(--green)',                label: 'Wearing' },
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
