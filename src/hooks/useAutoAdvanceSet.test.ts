import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoAdvanceSet } from './useAutoAdvanceSet'
import type { AlignerSet, Treatment } from '../types'

vi.mock('../contexts/DataContext', () => ({
  useDataContext: vi.fn(),
}))

vi.mock('./useSets', () => ({
  useSets: vi.fn(),
}))

// Keep addDays real so the advance-chain logic computes correct dates;
// only mock todayLocalDate to pin "today" to a fixed value.
vi.mock('../utils/time', async () => {
  const actual = await vi.importActual<typeof import('../utils/time')>('../utils/time')
  return { ...actual, todayLocalDate: vi.fn(() => '2026-03-18') }
})

import { useDataContext } from '../contexts/DataContext'
import { useSets } from './useSets'
import { todayLocalDate } from '../utils/time'

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSet(setNumber: number, startDate: string, endDate: string | null): AlignerSet {
  return { id: `set-${setNumber}`, setNumber, startDate, endDate, note: null }
}

function makeTreatment(currentSetNumber: number, defaultSetDurationDays = 7): Treatment {
  return {
    totalSets: null,
    defaultSetDurationDays,
    currentSetNumber,
    currentSetStartDate: '2026-03-01',
  }
}

function mockContext(loaded: boolean, treatment: Treatment | null, sets: AlignerSet[]) {
  vi.mocked(useDataContext).mockReturnValue({ loaded, treatment, sets } as never)
}

function mockSets(startNewSet = vi.fn(), updateTreatment = vi.fn()) {
  vi.mocked(useSets).mockReturnValue({ startNewSet, updateTreatment } as never)
}

// ─── tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(todayLocalDate).mockReturnValue('2026-03-18')
})

describe('useAutoAdvanceSet — guard conditions', () => {
  it('does nothing when data is not loaded', async () => {
    const startNewSet = vi.fn()
    mockContext(false, makeTreatment(1), [makeSet(1, '2026-03-10', '2026-03-17')])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(startNewSet).not.toHaveBeenCalled()
    expect(result.current.autoAdvancedSets).toEqual([])
  })

  it('does nothing when current set has no endDate (legacy set)', async () => {
    const startNewSet = vi.fn()
    mockContext(true, makeTreatment(1), [makeSet(1, '2026-03-01', null)])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(startNewSet).not.toHaveBeenCalled()
    expect(result.current.autoAdvancedSets).toEqual([])
  })

  it('does nothing when current set has not yet expired', async () => {
    const startNewSet = vi.fn()
    // endDate is tomorrow — not expired yet
    mockContext(true, makeTreatment(1), [makeSet(1, '2026-03-11', '2026-03-19')])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(startNewSet).not.toHaveBeenCalled()
    expect(result.current.autoAdvancedSets).toEqual([])
  })
})

describe('useAutoAdvanceSet — single expired set', () => {
  it('creates the next set when the current set expired yesterday', async () => {
    const startNewSet = vi.fn().mockResolvedValue(undefined)
    // Set 1 ended 2026-03-17 (yesterday)
    mockContext(true, makeTreatment(1, 7), [makeSet(1, '2026-03-10', '2026-03-17')])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(startNewSet).toHaveBeenCalledTimes(1)
    expect(startNewSet).toHaveBeenCalledWith(2, '2026-03-17', 7)
    expect(result.current.autoAdvancedSets).toEqual([2])
  })

  it('creates the next set when the current set expired on today exactly', async () => {
    const startNewSet = vi.fn().mockResolvedValue(undefined)
    // endDate is today — counts as expired
    mockContext(true, makeTreatment(1, 7), [makeSet(1, '2026-03-11', '2026-03-18')])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(startNewSet).toHaveBeenCalledWith(2, '2026-03-18', 7)
    expect(result.current.autoAdvancedSets).toEqual([2])
  })
})

describe('useAutoAdvanceSet — chained expired sets', () => {
  it('chains through multiple expired sets in a single pass', async () => {
    const startNewSet = vi.fn().mockResolvedValue(undefined)
    // Set 1 ended 2026-03-10; the following set (set 2) would end 2026-03-17 — both before today
    mockContext(true, makeTreatment(1, 7), [makeSet(1, '2026-03-03', '2026-03-10')])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    // set 2 starts 2026-03-10, ends 2026-03-17 (still ≤ today → keep going)
    // set 3 starts 2026-03-17, ends 2026-03-24 (> today → stop)
    expect(startNewSet).toHaveBeenCalledTimes(2)
    expect(startNewSet).toHaveBeenNthCalledWith(1, 2, '2026-03-10', 7)
    expect(startNewSet).toHaveBeenNthCalledWith(2, 3, '2026-03-17', 7)
    expect(result.current.autoAdvancedSets).toEqual([2, 3])
  })
})

describe('useAutoAdvanceSet — pre-existing sets', () => {
  it('skips creation but updates treatment for a pre-existing set that has started', async () => {
    const startNewSet = vi.fn()
    const updateTreatment = vi.fn().mockResolvedValue(undefined)
    const set1 = makeSet(1, '2026-03-10', '2026-03-17')
    const set2 = makeSet(2, '2026-03-17', '2026-03-24') // already exists, started
    mockContext(true, makeTreatment(1, 7), [set1, set2])
    mockSets(startNewSet, updateTreatment)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(startNewSet).not.toHaveBeenCalled()
    expect(updateTreatment).toHaveBeenCalledWith({
      currentSetNumber: 2,
      currentSetStartDate: '2026-03-17',
    })
    expect(result.current.autoAdvancedSets).toEqual([2])
  })

  it('does not count a pre-existing set whose start date is in the future', async () => {
    const startNewSet = vi.fn()
    const updateTreatment = vi.fn()
    const set1 = makeSet(1, '2026-03-10', '2026-03-17')
    // set 2 exists but startDate is tomorrow — not yet active
    const set2 = makeSet(2, '2026-03-19', '2026-03-26')
    mockContext(true, makeTreatment(1, 7), [set1, set2])
    mockSets(startNewSet, updateTreatment)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    // set2 start date > today, so it should not be pushed to advanced
    expect(result.current.autoAdvancedSets).toEqual([])
    expect(updateTreatment).not.toHaveBeenCalled()
  })
})

describe('useAutoAdvanceSet — dismiss', () => {
  it('clears the advanced sets list', async () => {
    const startNewSet = vi.fn().mockResolvedValue(undefined)
    mockContext(true, makeTreatment(1, 7), [makeSet(1, '2026-03-10', '2026-03-17')])
    mockSets(startNewSet)

    const { result } = renderHook(() => useAutoAdvanceSet())
    await act(async () => {})

    expect(result.current.autoAdvancedSets).toEqual([2])

    act(() => { result.current.dismiss() })

    expect(result.current.autoAdvancedSets).toEqual([])
  })
})
