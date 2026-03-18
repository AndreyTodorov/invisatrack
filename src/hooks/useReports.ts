import { useMemo, useCallback } from 'react'
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

export interface SetStats {
  avgWearPct: number
  avgOffMinutes: number
  totalRemovals: number
  complianceDays: number
  avgRemovalsPerDay: number
}

export function useReports(goalMinutes: number) {
  const { sessions, sets } = useDataContext()

  const allSegments = useMemo(() => getSegmentsForSessions(sessions), [sessions])

  const getDailyStatsRange = useCallback((dates: string[]): DailyStats[] =>
    dates.map(date => computeDailyStats(date, allSegments, goalMinutes)),
  [allSegments, goalMinutes])

  const streak = useMemo(() => {
    if (allSegments.length === 0) return 0
    const sorted = [...allSegments].sort((a, b) => a.date.localeCompare(b.date))
    const earliestDate = sorted[0].date
    // FIX CR-6: use device local timezone for "today"
    const today = formatDateKey(toLocalDate(new Date().toISOString(), -new Date().getTimezoneOffset()))
    const allDates = enumerateDates(earliestDate, today)
    const statsArr = allDates.map(d => computeDailyStats(d, allSegments, goalMinutes))
    return computeStreak(statsArr, allDates)
  }, [allSegments, goalMinutes])

  // Pre-compute stats for all sets at once to avoid recomputing per render
  const allSetStatsMap = useMemo(() => {
    const map = new Map<number, SetStats>()

    const buildStats = (setSessions: Session[]): SetStats => {
      const setSegments = getSegmentsForSessions(setSessions)
      const uniqueDates = [...new Set(setSegments.map(s => s.date))]
      const statsArr = uniqueDates.map(d => computeDailyStats(d, setSegments, goalMinutes))
      const numDays = statsArr.length
      return {
        avgWearPct: computeAverageWear(statsArr),
        avgOffMinutes: numDays > 0 ? statsArr.reduce((sum, s) => sum + s.totalOffMinutes, 0) / numDays : 0,
        totalRemovals: setSessions.length,
        complianceDays: statsArr.filter(s => s.compliant).length,
        avgRemovalsPerDay: numDays > 0 ? setSessions.length / numDays : 0,
      }
    }

    // Compute for sets with known date ranges
    sets.forEach(set => {
      const setSessions = sessions.filter(s => {
        if (!s.endTime) return false
        const sessionDate = formatDateKey(toLocalDate(s.startTime, s.startTimezoneOffset))
        if (sessionDate < set.startDate.slice(0, 10)) return false
        if (set.endDate && sessionDate >= set.endDate.slice(0, 10)) return false
        return true
      })
      map.set(set.setNumber, buildStats(setSessions))
    })

    // Fallback: compute for set numbers in sessions that have no AlignerSet (legacy data)
    const sessionSetNumbers = new Set(sessions.filter(s => s.endTime).map(s => s.setNumber))
    sessionSetNumbers.forEach(setNumber => {
      if (!map.has(setNumber)) {
        map.set(setNumber, buildStats(sessions.filter(s => s.endTime && s.setNumber === setNumber)))
      }
    })

    return map
  }, [sets, sessions, goalMinutes])

  const getSetStats = useCallback((setNumber: number): SetStats =>
    allSetStatsMap.get(setNumber) ?? { avgWearPct: 0, avgOffMinutes: 0, totalRemovals: 0, complianceDays: 0, avgRemovalsPerDay: 0 },
  [allSetStatsMap])

  return { getDailyStatsRange, streak, getSetStats, allSegments, sets }
}
