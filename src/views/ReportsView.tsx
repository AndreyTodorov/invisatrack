import { useState, useRef } from 'react'
import { useSwipeTab } from '../hooks/useSwipeTab'
import { useReports } from '../hooks/useReports'
import { useDataContext } from '../contexts/DataContext'
import WearChart from '../components/reports/WearChart'
import StatsGrid from '../components/reports/StatsGrid'
import SetReportCard from '../components/reports/SetReportCard'
import CalendarHeatmap from '../components/dashboard/CalendarHeatmap'
import { DEFAULT_DAILY_WEAR_GOAL_MINUTES } from '../constants'
import { dateDiffDays, formatDuration } from '../utils/time'
import type { DailyStats } from '../types'

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function BestWorstCallout({ stats, todayStr }: { stats: DailyStats[], todayStr: string }) {
  const completedStats = stats.filter(s => s.date < todayStr)
  if (completedStats.length < 2) return null

  const best = completedStats.reduce((a, b) => a.wearPercentage >= b.wearPercentage ? a : b)
  const worst = completedStats.reduce((a, b) => a.wearPercentage <= b.wearPercentage ? a : b)

  if (best.date === worst.date) return null

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{
        flex: 1,
        background: 'rgba(74,222,128,0.07)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: 14, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 8, color: 'rgba(74,222,128,0.6)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
          Best Day
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
          {formatDuration(1440 - best.totalOffMinutes)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatDayLabel(best.date)}
        </div>
      </div>
      <div style={{
        flex: 1,
        background: 'rgba(248,113,113,0.07)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 14, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 8, color: 'rgba(248,113,113,0.6)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
          Worst Day
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: worst.compliant ? 'var(--text)' : 'var(--rose)', fontFamily: "'JetBrains Mono', monospace" }}>
          {formatDuration(1440 - worst.totalOffMinutes)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatDayLabel(worst.date)}
        </div>
      </div>
    </div>
  )
}

type Period = '7d' | 'week' | 'month' | 'set'

// FIX OS-4: get today's date in LOCAL timezone
function getTodayLocal(): string {
  const now = new Date()
  const offsetMs = -now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() + offsetMs).toISOString().slice(0, 10)
}

function getDateRange(period: Exclude<Period, 'set'>, offset: number): string[] {
  const todayStr = getTodayLocal()
  const today = new Date(todayStr + 'T00:00:00')
  const dates: string[] = []

  if (period === '7d') {
    // offset ignored for 7d — always trailing 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(d.toLocaleDateString('sv'))
    }
  } else if (period === 'week') {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((day + 6) % 7) - offset * 7)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toLocaleDateString('sv'))
    }
  } else {
    // month
    const totalMonths = today.getFullYear() * 12 + today.getMonth() - offset
    const year = Math.floor(totalMonths / 12)
    const month = totalMonths % 12
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      dates.push(d.toLocaleDateString('sv'))
    }
  }
  return dates
}

function NavRow({
  label,
  isPrevDisabled,
  isNextDisabled,
  showToday,
  onPrev,
  onNext,
  onToday,
}: {
  label: string
  isPrevDisabled: boolean
  isNextDisabled: boolean
  showToday: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const btnBase: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'opacity 0.15s',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase,
    color: 'var(--cyan)',
    borderColor: 'var(--cyan)',
  }
  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor: 'default',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button
        style={isPrevDisabled ? btnDisabled : btnBase}
        disabled={isPrevDisabled}
        onClick={onPrev}
      >
        ‹ Prev
      </button>

      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {showToday && (
          <button style={btnActive} onClick={onToday}>
            Today
          </button>
        )}
        <button
          style={isNextDisabled ? btnDisabled : btnBase}
          disabled={isNextDisabled}
          onClick={onNext}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}

const PERIOD_ORDER: Period[] = ['7d', 'week', 'month', 'set']

function getPeriodStart(period: 'week' | 'month', offset: number): string {
  const todayStr = getTodayLocal()
  const today = new Date(todayStr + 'T00:00:00')
  if (period === 'week') {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((day + 6) % 7) - offset * 7)
    return monday.toLocaleDateString('sv')
  } else {
    const totalMonths = today.getFullYear() * 12 + today.getMonth() - offset
    const year = Math.floor(totalMonths / 12)
    const month = totalMonths % 12
    return new Date(year, month, 1).toLocaleDateString('sv')
  }
}

export default function ReportsView() {
  const [period, setPeriod] = useState<Period>(
    () => (localStorage.getItem('reports-period') as Period | null) ?? '7d'
  )
  const [enterClass, setEnterClass] = useState('')
  const [offset, setOffset] = useState(0)
  const prevPeriodRef = useRef(period)

  const handleSetPeriod = (p: Period) => {
    const dir = PERIOD_ORDER.indexOf(p) > PERIOD_ORDER.indexOf(prevPeriodRef.current) ? 'tab-enter-right' : 'tab-enter-left'
    prevPeriodRef.current = p
    setEnterClass(dir)
    localStorage.setItem('reports-period', p)
    setPeriod(p)
    setOffset(0)
  }

  const swipeHandlers = useSwipeTab((dir) => {
    const idx = PERIOD_ORDER.indexOf(period)
    const next = PERIOD_ORDER[dir === 'left' ? idx + 1 : idx - 1]
    if (next) handleSetPeriod(next)
  })
  const { profile, sets } = useDataContext()
  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_DAILY_WEAR_GOAL_MINUTES
  const { getDailyStatsRange, getSetStats, allSegments, streak } = useReports(goalMinutes)

  // Earliest date any session was recorded
  const firstSessionDate = allSegments.length > 0
    ? allSegments.reduce((min, s) => s.date < min ? s.date : min, allSegments[0].date)
    : null

  // Nav helpers (only meaningful for week/month)
  const navPeriod = period === 'week' || period === 'month' ? period : null

  const isPrevDisabled = (() => {
    if (!navPeriod || !firstSessionDate) return true
    const currentStart = getPeriodStart(navPeriod, offset)
    let firstPeriodStart: string
    if (navPeriod === 'week') {
      const d = new Date(firstSessionDate + 'T00:00:00')
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((day + 6) % 7))
      firstPeriodStart = monday.toLocaleDateString('sv')
    } else {
      firstPeriodStart = firstSessionDate.slice(0, 7) + '-01'
    }
    return currentStart <= firstPeriodStart
  })()

  const isNextDisabled = offset === 0

  const periodLabel = (() => {
    if (period === 'week') {
      const startStr = getPeriodStart('week', offset)
      const start = new Date(startStr + 'T12:00:00')
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const todayYear = new Date().getFullYear()
      const startYear = start.getFullYear()
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const yearSuffix = startYear !== todayYear ? `, ${startYear}` : ''
      return `${fmt(start)}–${fmt(end).replace(/\w+ /, '')}${yearSuffix}`
    } else if (period === 'month') {
      const startStr = getPeriodStart('month', offset)
      const d = new Date(startStr + 'T12:00:00')
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    return period === '7d' ? 'last 7 days' : ''
  })()

  const tabs: { key: Period; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'set', label: 'By Set' },
  ]

  const todayStr = getTodayLocal()
  const stats = period !== 'set'
    ? getDailyStatsRange(getDateRange(period, offset)).filter(s => {
        if (s.date > todayStr) return false
        return firstSessionDate !== null && s.date >= firstSessionDate
      })
    : []

  return (
    <div style={{ padding: '0 16px 16px', maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }} {...swipeHandlers}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Reports
        </h1>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 18, fontWeight: 700, color: 'var(--cyan)',
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
            }}>
              {streak}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              day streak
            </span>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14, padding: 4,
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleSetPeriod(t.key)}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: 10, border: 'none',
              fontSize: 13, fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
              background: period === t.key ? 'var(--surface-3)' : 'transparent',
              color: period === t.key ? 'var(--cyan)' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(period === 'week' || period === 'month') && (
        <NavRow
          label={periodLabel}
          isPrevDisabled={isPrevDisabled}
          isNextDisabled={isNextDisabled}
          showToday={offset > 0}
          onPrev={() => setOffset(o => o + 1)}
          onNext={() => setOffset(o => o - 1)}
          onToday={() => setOffset(0)}
        />
      )}

      <div key={period} className={enterClass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {period !== 'set' && stats.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text-faint)', fontSize: 14, marginBottom: 6 }}>
            {period === '7d'
              ? 'No sessions recorded in the last 7 days.'
              : `No sessions recorded for ${periodLabel}.`}
          </p>
          <p style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            Start tracking wear time to see your data here.
          </p>
        </div>
      )}

      {period !== 'set' && stats.length > 0 && (
        <>
          <WearChart data={stats} goalMinutes={goalMinutes} period={period as '7d' | 'week' | 'month'} periodLabel={periodLabel} />
          <StatsGrid stats={stats} goalMinutes={goalMinutes} />
          <BestWorstCallout stats={stats} todayStr={todayStr} />
          {period === 'month' && (() => {
            const sessionDates = new Set(allSegments.map(s => s.date))
            const sessionDatesArr = Array.from(sessionDates)
            const statsArr = getDailyStatsRange(sessionDatesArr)
            const dateStatsMap = new Map(sessionDatesArr.map((d, i) => [d, statsArr[i]]))
            return (
              <CalendarHeatmap
                dateStatsMap={dateStatsMap}
                sessionDates={sessionDates}
                goalMinutes={goalMinutes}
                today={todayStr}
              />
            )
          })()}
        </>
      )}

      {period === 'set' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...sets]
            .sort((a, b) => b.setNumber - a.setNumber)
            .map(s => {
              const current = getSetStats(s.setNumber)
              const prevSet = sets.find(x => x.setNumber === s.setNumber - 1)
              const previous = prevSet ? getSetStats(prevSet.setNumber) : null
              const durationDays = s.startDate && s.endDate
                ? dateDiffDays(s.startDate, s.endDate)
                : null
              return (
                <SetReportCard
                  key={s.id}
                  setNumber={s.setNumber}
                  current={current}
                  previous={previous}
                  durationDays={durationDays}
                  goalMinutes={goalMinutes}
                />
              )
            })}
        </div>
      )}

      </div>
    </div>
  )
}
