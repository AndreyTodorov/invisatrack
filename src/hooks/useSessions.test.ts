import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessions } from './useSessions'
import type { Session } from '../types'

vi.mock('../services/firebase', () => ({
  push: vi.fn(() => ({ key: 'new-session-id' })),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  ref: vi.fn(() => ({})),
  db: {},
  sessionsRef: vi.fn(() => ({})),
}))

vi.mock('../services/db', () => ({
  localDB: {
    sessions: {
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({ user: { uid: 'user1' } })),
}))

vi.mock('../contexts/DataContext', () => ({
  useDataContext: vi.fn(() => ({ sessions: [], setSessions: vi.fn() })),
}))

vi.mock('../utils/deviceId', () => ({
  getDeviceId: vi.fn(() => 'test-device'),
}))

vi.mock('../utils/time', () => ({
  nowISO: vi.fn(() => '2026-03-17T10:00:00.000Z'),
  getTimezoneOffset: vi.fn(() => 0),
}))

import { set as fbSet, update as fbUpdate, remove as fbRemove } from '../services/firebase'
import { localDB } from '../services/db'
import { useDataContext } from '../contexts/DataContext'

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fbSet).mockResolvedValue(undefined as never)
  vi.mocked(fbUpdate).mockResolvedValue(undefined as never)
  vi.mocked(fbRemove).mockResolvedValue(undefined as never)
  vi.mocked(localDB.sessions.put).mockResolvedValue(undefined as never)
  vi.mocked(localDB.sessions.update).mockResolvedValue(undefined as never)
  vi.mocked(localDB.sessions.delete).mockResolvedValue(undefined as never)
  vi.mocked(useDataContext).mockReturnValue({ sessions: [], setSessions: vi.fn() } as never)
})

describe('startSession', () => {
  it('writes to localDB and Firebase', async () => {
    const { result } = renderHook(() => useSessions())
    let sessionId: string | undefined

    await act(async () => {
      sessionId = await result.current.startSession(1)
    })

    expect(sessionId).toBe('new-session-id')
    expect(localDB.sessions.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-session-id', setNumber: 1, endTime: null, uid: 'user1' })
    )
    expect(fbSet).toHaveBeenCalled()
  })

  it('throws when a session is already active', async () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [makeSession('active', '2026-03-17T09:00:00.000Z', null)],
    } as never)

    const { result } = renderHook(() => useSessions())

    await expect(
      act(async () => { await result.current.startSession(1) })
    ).rejects.toThrow('already active')
  })
})

describe('stopSession', () => {
  it('updates session with endTime in localDB and Firebase', async () => {
    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.stopSession('s1') })

    expect(localDB.sessions.update).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ endTime: '2026-03-17T10:00:00.000Z' })
    )
    expect(fbUpdate).toHaveBeenCalled()
  })
})

describe('addManualSession', () => {
  it('writes manual session to localDB and Firebase', async () => {
    const { result } = renderHook(() => useSessions())
    await act(async () => {
      await result.current.addManualSession(
        '2026-03-17T10:00:00.000Z',
        '2026-03-17T10:30:00.000Z',
        1
      )
    })

    expect(localDB.sessions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: '2026-03-17T10:00:00.000Z',
        endTime: '2026-03-17T10:30:00.000Z',
        setNumber: 1,
      })
    )
    expect(fbSet).toHaveBeenCalled()
  })

  it('throws when manual session overlaps existing session', async () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [makeSession('x', '2026-03-17T10:00:00.000Z', '2026-03-17T10:30:00.000Z')],
    } as never)

    const { result } = renderHook(() => useSessions())

    await expect(
      act(async () => {
        await result.current.addManualSession(
          '2026-03-17T10:15:00.000Z',
          '2026-03-17T10:45:00.000Z',
          1
        )
      })
    ).rejects.toThrow('overlaps')
  })

  it('throws when end time is before start time', async () => {
    const { result } = renderHook(() => useSessions())

    await expect(
      act(async () => {
        await result.current.addManualSession(
          '2026-03-17T10:30:00.000Z',
          '2026-03-17T10:00:00.000Z',
          1
        )
      })
    ).rejects.toThrow()
  })
})

describe('deleteSession', () => {
  it('removes from localDB and Firebase', async () => {
    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.deleteSession('s1') })

    expect(localDB.sessions.delete).toHaveBeenCalledWith('s1')
    expect(fbRemove).toHaveBeenCalled()
  })

  it('optimistically removes session from React state when deleted', async () => {
    const setSessions = vi.fn()
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [makeSession('s1', '2026-03-17T09:00:00.000Z', null)],
      setSessions,
    } as never)

    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.deleteSession('s1') })

    expect(setSessions).toHaveBeenCalledTimes(1)
    const updater = setSessions.mock.calls[0][0]
    const prev = [
      makeSession('s1', '2026-03-17T09:00:00.000Z', null),
      makeSession('s2', '2026-03-17T08:00:00.000Z', '2026-03-17T08:30:00.000Z'),
    ]
    expect(updater(prev)).toEqual([makeSession('s2', '2026-03-17T08:00:00.000Z', '2026-03-17T08:30:00.000Z')])
  })
})

describe('updateSession', () => {
  it('updates session times in localDB and Firebase', async () => {
    const { result } = renderHook(() => useSessions())
    await act(async () => {
      await result.current.updateSession('s1', {
        startTime: '2026-03-17T09:00:00.000Z',
        endTime: '2026-03-17T09:30:00.000Z',
      })
    })

    expect(localDB.sessions.update).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        startTime: '2026-03-17T09:00:00.000Z',
        endTime: '2026-03-17T09:30:00.000Z',
      })
    )
    expect(fbUpdate).toHaveBeenCalled()
  })

  it('throws on overlap when updating session times', async () => {
    vi.mocked(useDataContext).mockReturnValue({
      sessions: [
        makeSession('other', '2026-03-17T11:00:00.000Z', '2026-03-17T11:30:00.000Z'),
        makeSession('s1', '2026-03-17T09:00:00.000Z', '2026-03-17T09:30:00.000Z'),
      ],
    } as never)

    const { result } = renderHook(() => useSessions())

    await expect(
      act(async () => {
        await result.current.updateSession('s1', {
          startTime: '2026-03-17T11:10:00.000Z',
          endTime: '2026-03-17T11:40:00.000Z',
        })
      })
    ).rejects.toThrow('overlaps')
  })
})
