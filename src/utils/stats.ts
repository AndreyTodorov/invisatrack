import { DailyStats, DaySegment } from '../types'
import { MINUTES_PER_DAY } from '../constants'

export function computeDailyStats(
  date: string,
  segments: DaySegment[],
  goalMinutes: number
): DailyStats {
  const daySegments = segments.filter(s => s.date === date)
  const totalOffMinutes = daySegments.reduce((sum, s) => sum + s.durationMinutes, 0)
  const wearMinutes = MINUTES_PER_DAY - totalOffMinutes
  const wearPercentage = (wearMinutes / MINUTES_PER_DAY) * 100
  const longestRemovalMinutes = daySegments.reduce((max, s) => Math.max(max, s.durationMinutes), 0)
  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes
  return {
    date,
    totalOffMinutes,
    wearPercentage,
    removals: daySegments.length,
    longestRemovalMinutes,
    compliant: totalOffMinutes <= maxOffMinutes,
  }
}

/**
 * Compute streak from daily stats.
 * allDatesInRange: ALL dates in the period (from earliest session date to today).
 * Dates missing from stats are treated as compliant (no removals = 100% wear).
 * A non-compliant day resets the streak.
 */
export function computeStreak(
  stats: Pick<DailyStats, 'date' | 'compliant'>[],
  allDatesInRange: string[]
): number {
  if (allDatesInRange.length === 0) return 0
  const statsByDate = new Map(stats.map(s => [s.date, s.compliant]))
  const sorted = [...allDatesInRange].sort()
  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    // If date has no sessions, it's compliant (aligners were on all day)
    const compliant = statsByDate.has(sorted[i]) ? statsByDate.get(sorted[i])! : true
    if (compliant) streak++
    else break
  }
  return streak
}

export function computeAverageWear(stats: DailyStats[]): number {
  if (stats.length === 0) return 100
  return stats.reduce((sum, s) => sum + s.wearPercentage, 0) / stats.length
}
