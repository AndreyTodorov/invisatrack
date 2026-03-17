import { describe, it, expect } from 'vitest'
import { computeDailyStats, computeStreak } from './stats'
import { DaySegment } from '../types'

const GOAL_MINUTES = 1320 // 22h

describe('computeDailyStats', () => {
  it('returns 0% off-time with no sessions', () => {
    const stats = computeDailyStats('2026-03-17', [], GOAL_MINUTES)
    expect(stats.totalOffMinutes).toBe(0)
    expect(stats.wearPercentage).toBeCloseTo(100)
    expect(stats.compliant).toBe(true)
  })

  it('correctly computes stats for two sessions', () => {
    const segments: DaySegment[] = [
      { date: '2026-03-17', durationMinutes: 30, sessionId: 'a' },
      { date: '2026-03-17', durationMinutes: 25, sessionId: 'b' },
    ]
    const stats = computeDailyStats('2026-03-17', segments, GOAL_MINUTES)
    expect(stats.totalOffMinutes).toBe(55)
    expect(stats.removals).toBe(2)
    expect(stats.longestRemovalMinutes).toBe(30)
    expect(stats.wearPercentage).toBeCloseTo((1440 - 55) / 1440 * 100)
    expect(stats.compliant).toBe(true)
  })

  it('marks non-compliant when off-time exceeds goal threshold', () => {
    const segments: DaySegment[] = [
      { date: '2026-03-17', durationMinutes: 130, sessionId: 'a' },
    ]
    const stats = computeDailyStats('2026-03-17', segments, GOAL_MINUTES)
    expect(stats.compliant).toBe(false)
  })
})

describe('computeStreak', () => {
  it('returns 0 for no dates', () => {
    expect(computeStreak([], [])).toBe(0)
  })

  it('returns correct streak for consecutive compliant days', () => {
    const allDates = ['2026-03-15', '2026-03-16', '2026-03-17']
    const stats = allDates.map(date => ({ date, compliant: true }))
    expect(computeStreak(stats, allDates)).toBe(3)
  })

  it('resets streak on non-compliant day', () => {
    const allDates = ['2026-03-14', '2026-03-15', '2026-03-16', '2026-03-17']
    const stats = [
      { date: '2026-03-14', compliant: true },
      { date: '2026-03-15', compliant: false },
      { date: '2026-03-16', compliant: true },
      { date: '2026-03-17', compliant: true },
    ]
    expect(computeStreak(stats, allDates)).toBe(2)
  })

  it('treats dates missing from stats as compliant', () => {
    // allDates has 3 days, but only 1 has a session (non-compliant)
    // Days with no sessions are treated as compliant
    const allDates = ['2026-03-15', '2026-03-16', '2026-03-17']
    const stats = [
      { date: '2026-03-15', compliant: false }, // this one was bad
      // 03-16 and 03-17 missing = compliant (no removals)
    ]
    // Streak from end: 03-17 (compliant/missing), 03-16 (compliant/missing), 03-15 (non-compliant) → 2
    expect(computeStreak(stats, allDates)).toBe(2)
  })
})
