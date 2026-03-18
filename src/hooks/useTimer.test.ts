import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimer } from './useTimer'

vi.mock('./useSessions', () => ({
  useSessions: vi.fn(() => ({
    sessions: [],
    startSession: vi.fn(),
    stopSession: vi.fn(),
  })),
}))

vi.mock('../utils/time', () => ({
  diffMinutes: vi.fn(() => 5),
  nowISO: vi.fn(() => '2026-03-17T10:05:00.000Z'),
}))

import { useSessions } from './useSessions'
import { diffMinutes } from '../utils/time'

const makeActiveSession = (endTime: string | null | undefined) => ({
  id: 'session-1',
  startTime: '2026-03-17T10:00:00.000Z',
  endTime: endTime as string | null,
  startTimezoneOffset: 0,
  endTimezoneOffset: null,
  setNumber: 1,
  autoCapped: false,
  createdOffline: false,
  deviceId: 'dev1',
  updatedAt: '2026-03-17T10:00:00.000Z',
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.mocked(useSessions).mockReturnValue({
    sessions: [],
    startSession: vi.fn(),
    stopSession: vi.fn(),
  } as never)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('active session detection', () => {
  // Regression: Firebase RTDB omits null fields when writing, so endTime comes
  // back as undefined instead of null. The old check (endTime === null) failed
  // to find the active session, leaving the timer frozen at 00:00:00.
  it('recognises active session when endTime is undefined (Firebase null omission)', () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(undefined)],
      startSession: vi.fn(),
      stopSession: vi.fn(),
    } as never)

    const { result } = renderHook(() => useTimer(120, 480, 1))

    expect(result.current.isRunning).toBe(true)
    expect(result.current.activeSessionId).toBe('session-1')
  })

  it('recognises active session when endTime is null', () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(null)],
      startSession: vi.fn(),
      stopSession: vi.fn(),
    } as never)

    const { result } = renderHook(() => useTimer(120, 480, 1))

    expect(result.current.isRunning).toBe(true)
    expect(result.current.activeSessionId).toBe('session-1')
  })

  it('does not start timer when no session is active', () => {
    const { result } = renderHook(() => useTimer(120, 480, 1))

    expect(result.current.isRunning).toBe(false)
    expect(result.current.activeSessionId).toBeNull()
  })

  it('does not treat a completed session as active', () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession('2026-03-17T10:30:00.000Z')],
      startSession: vi.fn(),
      stopSession: vi.fn(),
    } as never)

    const { result } = renderHook(() => useTimer(120, 480, 1))

    expect(result.current.isRunning).toBe(false)
  })
})

describe('reminder', () => {
  it('fires when elapsed minutes reaches the threshold', () => {
    vi.mocked(diffMinutes).mockReturnValue(30)
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(null)],
      startSession: vi.fn(),
      stopSession: vi.fn(),
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 1))

    expect(result.current.reminderFired).toBe(true)
  })

  it('does not fire when elapsed is below the threshold', () => {
    vi.mocked(diffMinutes).mockReturnValue(29)
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(null)],
      startSession: vi.fn(),
      stopSession: vi.fn(),
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 1))

    expect(result.current.reminderFired).toBe(false)
  })
})

describe('auto-cap', () => {
  it('stops the session and sets autoCapped when elapsed reaches the limit', async () => {
    const stopSession = vi.fn().mockResolvedValue(undefined)
    vi.mocked(diffMinutes).mockReturnValue(120)
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(null)],
      startSession: vi.fn(),
      stopSession,
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 1))
    await act(async () => {})

    expect(stopSession).toHaveBeenCalledWith('session-1')
    expect(result.current.autoCapped).toBe(true)
    expect(result.current.isRunning).toBe(false)
  })

  it('does not stop the session before the limit', async () => {
    const stopSession = vi.fn()
    vi.mocked(diffMinutes).mockReturnValue(119)
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(null)],
      startSession: vi.fn(),
      stopSession,
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 1))
    await act(async () => {})

    expect(stopSession).not.toHaveBeenCalled()
    expect(result.current.autoCapped).toBe(false)
  })
})

describe('stop()', () => {
  it('calls stopSession with the active session id', async () => {
    const stopSession = vi.fn().mockResolvedValue(undefined)
    vi.mocked(diffMinutes).mockReturnValue(5)
    vi.mocked(useSessions).mockReturnValue({
      sessions: [makeActiveSession(null)],
      startSession: vi.fn(),
      stopSession,
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 1))
    await act(async () => { await result.current.stop() })

    expect(stopSession).toHaveBeenCalledWith('session-1')
  })

  it('does nothing when there is no active session', async () => {
    const stopSession = vi.fn()
    vi.mocked(useSessions).mockReturnValue({
      sessions: [],
      startSession: vi.fn(),
      stopSession,
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 1))
    await act(async () => { await result.current.stop() })

    expect(stopSession).not.toHaveBeenCalled()
  })
})

describe('start()', () => {
  it('calls startSession with the current set number', async () => {
    const startSession = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useSessions).mockReturnValue({
      sessions: [],
      startSession,
      stopSession: vi.fn(),
    } as never)

    const { result } = renderHook(() => useTimer(30, 120, 3))
    await act(async () => { await result.current.start() })

    expect(startSession).toHaveBeenCalledWith(3)
  })
})
