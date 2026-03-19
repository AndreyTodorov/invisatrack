import { useState } from 'react'
import type { DailyStats } from '../../types'

interface Props {
  dateStatsMap: Map<string, DailyStats>
  sessionDates: Set<string>
  goalMinutes: number
  today: string
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthOffset(today: string, offset: number): { year: number; month: number } {
  const [y, m] = today.split('-').map(Number)
  let month = m + offset
  let year = y
  while (month <= 0) { month += 12; year -= 1 }
  while (month > 12) { month -= 12; year += 1 }
  return { year, month }
}

export default function CalendarHeatmap({ dateStatsMap, sessionDates, goalMinutes, today }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [offset, setOffset] = useState(0) // 0 = current month, -1 = prev, etc.
  const goalPct = (goalMinutes / 1440) * 100

  const { year, month } = monthOffset(today, offset)
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Mon-first offset

  const isCurrentMonth = offset === 0

  function cellStyle(date: string): { background: string; opacity: number } {
    if (date > today) return { background: 'var(--surface-3)', opacity: 0.3 }
    if (!sessionDates.has(date)) return { background: 'var(--surface-3)', opacity: 0.6 }
    const s = dateStatsMap.get(date)
    if (!s) return { background: 'var(--surface-3)', opacity: 0.6 }
    if (s.compliant) return { background: 'var(--green)', opacity: 0.85 }
    if (s.wearPercentage >= goalPct * 0.85) return { background: 'var(--amber)', opacity: 0.8 }
    return { background: 'var(--rose)', opacity: 0.75 }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', background: 'none', border: 'none', padding: '0 0 10px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Wear Calendar
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Month navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setOffset(o => o - 1)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 18, color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1,
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
            <button
              onClick={() => setOffset(o => o + 1)}
              disabled={isCurrentMonth}
              style={{
                background: 'none', border: 'none', cursor: isCurrentMonth ? 'default' : 'pointer',
                fontFamily: 'inherit', fontSize: 18,
                color: isCurrentMonth ? 'var(--surface-3)' : 'var(--text-muted)',
                padding: '0 4px', lineHeight: 1,
              }}
            >
              ›
            </button>
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAYS.map((l, i) => (
              <div key={i} style={{ fontSize: 9, color: 'var(--text-faint)', textAlign: 'center', marginBottom: 2 }}>{l}</div>
            ))}
            {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1
              const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const isToday = date === today
              const { background, opacity } = cellStyle(date)
              return (
                <div
                  key={date}
                  title={date}
                  style={{
                    aspectRatio: '1', borderRadius: 4,
                    background, opacity,
                    outline: isToday ? '2px solid var(--cyan)' : 'none',
                    outlineOffset: '1px',
                  }}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { color: 'var(--green)', label: 'Compliant' },
              { color: 'var(--amber)', label: 'Near goal' },
              { color: 'var(--rose)', label: 'Missed' },
              { color: 'var(--surface-3)', label: 'No data' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
