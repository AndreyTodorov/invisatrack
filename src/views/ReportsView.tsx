import { useState } from 'react'
import { useReports } from '../hooks/useReports'
import { useDataContext } from '../contexts/DataContext'
import WearChart from '../components/reports/WearChart'
import StatsGrid from '../components/reports/StatsGrid'
import SetReportCard from '../components/reports/SetReportCard'
import { DEFAULT_DAILY_WEAR_GOAL_MINUTES } from '../constants'

type Period = '7d' | 'week' | 'month' | 'set'

// FIX OS-4: get today's date in LOCAL timezone
function getTodayLocal(): string {
  const now = new Date()
  const offsetMs = -now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() + offsetMs).toISOString().slice(0, 10)
}

function getDateRange(period: Exclude<Period, 'set'>): string[] {
  const todayStr = getTodayLocal()
  // Parse as local midnight
  const today = new Date(todayStr + 'T00:00:00')
  const dates: string[] = []

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(d.toLocaleDateString('sv')) // 'sv' locale gives YYYY-MM-DD in local time
    }
  } else if (period === 'week') {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((day + 6) % 7))
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toLocaleDateString('sv'))
    }
  } else {
    const year = today.getFullYear()
    const month = today.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      dates.push(d.toLocaleDateString('sv'))
    }
  }
  return dates
}

export default function ReportsView() {
  const [period, setPeriod] = useState<Period>('7d')
  const { profile, sets } = useDataContext()
  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_DAILY_WEAR_GOAL_MINUTES
  const { getDailyStatsRange, getSetStats } = useReports(goalMinutes)

  const tabs: { key: Period; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'set', label: 'By Set' },
  ]

  const stats = period !== 'set'
    ? getDailyStatsRange(getDateRange(period)).filter(s => s.removals > 0)
    : []

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 pt-2">Reports</h1>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ` +
              (period === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {period !== 'set' && (
        <>
          <WearChart data={stats} goalMinutes={goalMinutes} />
          <StatsGrid stats={stats} />
        </>
      )}

      {period === 'set' && (
        <div className="space-y-3">
          {[...sets]
            .sort((a, b) => b.setNumber - a.setNumber)
            .map(s => {
              const current = getSetStats(s.setNumber)
              const prevSet = sets.find(x => x.setNumber === s.setNumber - 1)
              const previous = prevSet ? getSetStats(prevSet.setNumber) : null
              return (
                <SetReportCard
                  key={s.id}
                  setNumber={s.setNumber}
                  current={current}
                  previous={previous}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}
