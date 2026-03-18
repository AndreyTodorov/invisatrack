import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import type { DataSnapshot, Unsubscribe } from 'firebase/database'
import { DataProvider, useDataContext } from './DataContext'

vi.mock('../services/firebase', () => ({
  onValue: vi.fn(),
  sessionsRef: vi.fn(() => 'sessions-ref'),
  setsRef: vi.fn(() => 'sets-ref'),
  profileRef: vi.fn(() => 'profile-ref'),
  treatmentRef: vi.fn(() => 'treatment-ref'),
  ref: vi.fn((_db: unknown, path: string) => path),
  db: {},
}))

vi.mock('../services/db', () => ({
  localDB: {
    sessions: {
      where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })),
    },
    sets: {
      where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })),
    },
    profile: { get: vi.fn(() => Promise.resolve(undefined)) },
    treatment: {
      get: vi.fn(() => Promise.resolve(undefined)),
      put: vi.fn(() => Promise.resolve()),
    },
  },
}))

import { onValue } from '../services/firebase'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DataProvider uid="test-uid">{children}</DataProvider>
)

// Capture Firebase callbacks keyed by ref identifier
function captureCallbacks() {
  const callbacks = new Map<string, (snap: DataSnapshot) => void>()
  vi.mocked(onValue).mockImplementation((ref, callback) => {
    callbacks.set(ref as unknown as string, callback as (snap: DataSnapshot) => void)
    return vi.fn() as unknown as Unsubscribe
  })
  return callbacks
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DataContext — firebaseTreatmentLoaded', () => {
  it('is false before the Firebase treatment callback fires', async () => {
    vi.mocked(onValue).mockReturnValue(vi.fn() as unknown as Unsubscribe)

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    expect(result.current.firebaseTreatmentLoaded).toBe(false)
  })

  it('becomes true when Firebase fires with treatment data', async () => {
    const callbacks = captureCallbacks()

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    act(() => {
      callbacks.get('treatment-ref')!({
        val: () => ({
          currentSetNumber: 1,
          totalSets: 10,
          defaultSetDurationDays: 7,
          currentSetStartDate: '2026-01-01',
        }),
      } as unknown as DataSnapshot)
    })

    expect(result.current.firebaseTreatmentLoaded).toBe(true)
    expect(result.current.treatment).not.toBeNull()
  })

  it('becomes true when Firebase fires with null (user has no treatment)', async () => {
    const callbacks = captureCallbacks()

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    act(() => {
      callbacks.get('treatment-ref')!({ val: () => null } as unknown as DataSnapshot)
    })

    expect(result.current.firebaseTreatmentLoaded).toBe(true)
    expect(result.current.treatment).toBeNull()
  })

  it('becomes true after 5s if Firebase never responds', async () => {
    vi.useFakeTimers()
    vi.mocked(onValue).mockReturnValue(vi.fn() as unknown as Unsubscribe)

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    expect(result.current.firebaseTreatmentLoaded).toBe(false)

    act(() => { vi.advanceTimersByTime(5000) })

    expect(result.current.firebaseTreatmentLoaded).toBe(true)
  })

  it('does not trigger the timeout when Firebase responds before 5s', async () => {

    vi.useFakeTimers()
    const callbacks = captureCallbacks()

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    // Firebase responds after 1s — well before the 5s timeout
    act(() => {
      vi.advanceTimersByTime(1000)
      callbacks.get('treatment-ref')!({ val: () => null } as unknown as DataSnapshot)
    })

    expect(result.current.firebaseTreatmentLoaded).toBe(true)

    // Advancing past the original 5s deadline should not cause issues
    act(() => { vi.advanceTimersByTime(4001) })

    expect(result.current.firebaseTreatmentLoaded).toBe(true)
  })
})

describe('DataContext — connected', () => {
  it('starts as null before .info/connected fires', async () => {
    vi.mocked(onValue).mockReturnValue(vi.fn() as unknown as Unsubscribe)

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    expect(result.current.connected).toBeNull()
  })

  it('becomes true when Firebase reports connected', async () => {
    const callbacks = captureCallbacks()

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    act(() => {
      callbacks.get('.info/connected')!({ val: () => true } as unknown as DataSnapshot)
    })

    expect(result.current.connected).toBe(true)
  })

  it('becomes false when Firebase reports disconnected after being connected', async () => {
    const callbacks = captureCallbacks()

    const { result } = renderHook(() => useDataContext(), { wrapper })
    await act(async () => {})

    act(() => {
      callbacks.get('.info/connected')!({ val: () => true } as unknown as DataSnapshot)
    })
    act(() => {
      callbacks.get('.info/connected')!({ val: () => false } as unknown as DataSnapshot)
    })

    expect(result.current.connected).toBe(false)
  })
})
