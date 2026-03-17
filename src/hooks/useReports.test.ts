import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReports } from './useReports'
import type { Session } from '../types'

vi.mock('../contexts/DataContext', () => ({
  useDataContext: vi.fn(),
}))

import { useDataContext } from '../contexts/DataContext'

const GOAL = 1320 // 22h

const makeSession = (
  id: string,
  startTime: string,
  endTime: string | null,
  setNumber = 1
): Session => ({
  id,
  startTime,
  endTime,
  startTimezoneOffset: 0,
  endTimezoneOffset: null,
  setNumber,
  autoCapped: false,
  createdOffline: false,
  deviceId: 'dev1',
  updatedAt: startTime,
})

afterEach(() => vi.clearAllMocks())

describe('getDailyStatsRange', () => {
  it('returns empty stats for a day with no sessions', () => {
    vi.mocked(useDataContext).mockReturnValue({ sessions: [], sets: [] } as never)
    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getDailyStatsRange(['2026-03-17'])
    expect(stats).toHaveLength(1)
    expect(stats[0].totalOffMinutes).toBe(0)
    expect(stats[0].compliant).toBe(true)
  })

  it('returns correct off-time for sessions on that day', () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('a', '2026-03-17T10:00:00.000Z', '2026-03-17T10:30:00.000Z'),
        makeSession('b', '2026-03-17T14:00:00.000Z', '2026-03-17T14:20:00.000Z'),
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getDailyStatsRange(['2026-03-17'])

    expect(stats[0].totalOffMinutes).toBe(50)
    expect(stats[0].removals).toBe(2)
    expect(stats[0].compliant).toBe(true)
  })

  it('marks day non-compliant when off-time exceeds threshold', () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('a', '2026-03-17T08:00:00.000Z', '2026-03-17T10:05:00.000Z'), // 125 min
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getDailyStatsRange(['2026-03-17'])

    expect(stats[0].compliant).toBe(false)
  })

  it('ignores active (no endTime) sessions', () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [makeSession('active', '2026-03-17T10:00:00.000Z', null)],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getDailyStatsRange(['2026-03-17'])

    expect(stats[0].totalOffMinutes).toBe(0)
  })

  it('spans multiple dates correctly', () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('a', '2026-03-16T10:00:00.000Z', '2026-03-16T10:40:00.000Z'),
        makeSession('b', '2026-03-17T12:00:00.000Z', '2026-03-17T12:10:00.000Z'),
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getDailyStatsRange(['2026-03-16', '2026-03-17'])

    expect(stats[0].date).toBe('2026-03-16')
    expect(stats[0].totalOffMinutes).toBe(40)
    expect(stats[1].date).toBe('2026-03-17')
    expect(stats[1].totalOffMinutes).toBe(10)
  })
})

describe('getSetStats', () => {
  it('returns zero stats when no sessions for set', () => {
    vi.mocked(useDataContext).mockReturnValue({ sessions: [], sets: [] } as never)
    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getSetStats(1)

    expect(stats.totalRemovals).toBe(0)
    expect(stats.complianceDays).toBe(0)
    expect(stats.avgRemovalsPerDay).toBe(0)
  })

  it('calculates removals and compliance for a set', () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('a', '2026-03-17T10:00:00.000Z', '2026-03-17T10:20:00.000Z', 1),
        makeSession('b', '2026-03-17T14:00:00.000Z', '2026-03-17T14:10:00.000Z', 1),
        makeSession('c', '2026-03-16T10:00:00.000Z', '2026-03-16T10:30:00.000Z', 2),
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getSetStats(1)

    expect(stats.totalRemovals).toBe(2)
    expect(stats.complianceDays).toBe(1) // 30 min total < 120 threshold
    expect(stats.avgRemovalsPerDay).toBe(2)
  })

  it('only counts completed sessions', () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('a', '2026-03-17T10:00:00.000Z', '2026-03-17T10:30:00.000Z', 1),
        makeSession('active', '2026-03-17T12:00:00.000Z', null, 1),
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    const stats = result.current.getSetStats(1)

    expect(stats.totalRemovals).toBe(1)
  })
})

describe('streak', () => {
  it('returns 0 when no sessions', () => {
    vi.mocked(useDataContext).mockReturnValue({ sessions: [], sets: [] } as never)
    const { result } = renderHook(() => useReports(GOAL))
    expect(result.current.streak).toBe(0)
  })

  it('returns 1 for a single compliant day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-17T12:00:00.000Z'))

    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('a', '2026-03-17T10:00:00.000Z', '2026-03-17T10:30:00.000Z'),
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    expect(result.current.streak).toBe(1)

    vi.useRealTimers()
  })

  it('resets streak on non-compliant day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-17T12:00:00.000Z'))

    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        // non-compliant: 130 min off
        makeSession('a', '2026-03-16T08:00:00.000Z', '2026-03-16T10:10:00.000Z'),
        // compliant: 30 min off
        makeSession('b', '2026-03-17T10:00:00.000Z', '2026-03-17T10:30:00.000Z'),
      ],
      sets: [],
    } as never)

    const { result } = renderHook(() => useReports(GOAL))
    expect(result.current.streak).toBe(1)

    vi.useRealTimers()
  })
})
