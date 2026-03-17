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

vi.mock('../services/syncManager', () => ({
  queueWrite: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({ user: { uid: 'user1' } })),
}))

vi.mock('../contexts/DataContext', () => ({
  useDataContext: vi.fn(() => ({ sessions: [] })),
}))

vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
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
import { queueWrite } from '../services/syncManager'
import { useDataContext } from '../contexts/DataContext'
import { useOnlineStatus } from './useOnlineStatus'

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
  vi.mocked(queueWrite).mockResolvedValue(undefined as never)
  vi.mocked(useDataContext).mockReturnValue({ sessions: [] } as never)
  vi.mocked(useOnlineStatus).mockReturnValue(true)
})

describe('startSession', () => {
  it('writes to localDB and Firebase when online', async () => {
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
    expect(queueWrite).not.toHaveBeenCalled()
  })

  it('queues write instead of Firebase when offline', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)

    const { result } = renderHook(() => useSessions())
    await act(async () => {
      await result.current.startSession(1)
    })

    expect(fbSet).not.toHaveBeenCalled()
    expect(queueWrite).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'set', path: 'users/user1/sessions/new-session-id' })
    )
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

  it('includes createdOffline flag correctly', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)

    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.startSession(2) })

    expect(localDB.sessions.put).toHaveBeenCalledWith(
      expect.objectContaining({ createdOffline: true, setNumber: 2 })
    )
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
    expect(queueWrite).not.toHaveBeenCalled()
  })

  it('queues update when offline', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)

    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.stopSession('s1') })

    expect(fbUpdate).not.toHaveBeenCalled()
    expect(queueWrite).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'update', path: 'users/user1/sessions/s1' })
    )
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
  it('removes from localDB and Firebase when online', async () => {
    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.deleteSession('s1') })

    expect(localDB.sessions.delete).toHaveBeenCalledWith('s1')
    expect(fbRemove).toHaveBeenCalled()
    expect(queueWrite).not.toHaveBeenCalled()
  })

  it('queues delete when offline', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)

    const { result } = renderHook(() => useSessions())
    await act(async () => { await result.current.deleteSession('s1') })

    expect(fbRemove).not.toHaveBeenCalled()
    expect(queueWrite).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'delete', path: 'users/user1/sessions/s1' })
    )
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
