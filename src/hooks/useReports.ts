import { useMemo } from 'react'
import { useDataContext } from '../contexts/DataContext'
import { splitSessionByDay, formatDateKey, toLocalDate } from '../utils/time'
import { computeDailyStats, computeStreak, computeAverageWear } from '../utils/stats'
import type { DailyStats, Session } from '../types'

function getSegmentsForSessions(sessions: Session[]) {
  return sessions
    .filter(s => s.endTime !== null)
    .flatMap(s => splitSessionByDay(s.startTime, s.endTime!, s.startTimezoneOffset, s.id))
}

function enumerateDates(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = []
  const current = new Date(startDateStr + 'T00:00:00Z')
  const end = new Date(endDateStr + 'T00:00:00Z')
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export function useReports(goalMinutes: number) {
  const { sessions, sets } = useDataContext()

  const allSegments = useMemo(() => getSegmentsForSessions(sessions), [sessions])

  const getDailyStatsRange = (dates: string[]): DailyStats[] =>
    dates.map(date => computeDailyStats(date, allSegments, goalMinutes))

  const streak = useMemo(() => {
    if (allSegments.length === 0) return 0
    const sorted = [...allSegments].sort((a, b) => a.date.localeCompare(b.date))
    const earliestDate = sorted[0].date
    // FIX CR-6: use device local timezone for "today"
    const today = formatDateKey(toLocalDate(new Date().toISOString(), -new Date().getTimezoneOffset()))
    // Enumerate ALL dates from earliest session to today
    const allDates = enumerateDates(earliestDate, today)
    const statsArr = allDates.map(d => computeDailyStats(d, allSegments, goalMinutes))
    return computeStreak(statsArr, allDates)
  }, [allSegments, goalMinutes])

  const getSetStats = (setNumber: number) => {
    const targetSet = sets.find(s => s.setNumber === setNumber)
    const setSessions = sessions.filter(s => {
      if (!s.endTime) return false
      if (!targetSet) return s.setNumber === setNumber
      const sessionDate = formatDateKey(toLocalDate(s.startTime, s.startTimezoneOffset))
      if (sessionDate < targetSet.startDate.slice(0, 10)) return false
      if (targetSet.endDate && sessionDate >= targetSet.endDate.slice(0, 10)) return false
      return true
    })
    const setSegments = getSegmentsForSessions(setSessions)
    const uniqueDates = [...new Set(setSegments.map(s => s.date))]
    const statsArr = uniqueDates.map(d => computeDailyStats(d, setSegments, goalMinutes))
    return {
      avgWearPct: computeAverageWear(statsArr),
      totalRemovals: setSessions.length,
      complianceDays: statsArr.filter(s => s.compliant).length,
      avgRemovalsPerDay: statsArr.length > 0 ? setSessions.length / statsArr.length : 0,
    }
  }

  return { getDailyStatsRange, streak, getSetStats, allSegments, sets }
}
