import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSets } from './useSets'
import type { AlignerSet, Treatment } from '../types'

vi.mock('../services/firebase', () => ({
  push: vi.fn(() => ({ key: 'new-set-id' })),
  set: vi.fn(),
  update: vi.fn(),
  ref: vi.fn(() => ({})),
  db: {},
  setsRef: vi.fn(() => ({})),
}))

vi.mock('../services/db', () => ({
  localDB: {
    sets: {
      put: vi.fn(),
      update: vi.fn(),
    },
    treatment: {
      update: vi.fn(),
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
  useDataContext: vi.fn(() => ({ sets: [], treatment: null })),
}))

vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('../utils/deviceId', () => ({
  getDeviceId: vi.fn(() => 'test-device'),
}))

vi.mock('../utils/time', () => ({
  nowISO: vi.fn(() => '2026-03-17T10:00:00.000Z'),
}))

import { set as fbSet, update as fbUpdate } from '../services/firebase'
import { localDB } from '../services/db'
import { queueWrite } from '../services/syncManager'
import { useDataContext } from '../contexts/DataContext'
import { useOnlineStatus } from './useOnlineStatus'

const makeSet = (id: string, setNumber: number): AlignerSet => ({
  id,
  setNumber,
  startDate: '2026-03-10T00:00:00.000Z',
  endDate: null,
  durationDaysOverride: null,
  note: null,
})

const makeTreatment = (currentSetNumber: number): Treatment => ({
  currentSetNumber,
  currentSetStartDate: '2026-03-10T00:00:00.000Z',
  totalSets: 30,
  defaultSetDurationDays: 7,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fbSet).mockResolvedValue(undefined as never)
  vi.mocked(fbUpdate).mockResolvedValue(undefined as never)
  vi.mocked(localDB.sets.put).mockResolvedValue(undefined as never)
  vi.mocked(localDB.sets.update).mockResolvedValue(undefined as never)
  vi.mocked(localDB.treatment.update).mockResolvedValue(undefined as never)
  vi.mocked(queueWrite).mockResolvedValue(undefined as never)
  vi.mocked(useDataContext).mockReturnValue({ sets: [], treatment: null } as never)
  vi.mocked(useOnlineStatus).mockReturnValue(true)
})

describe('startNewSet', () => {
  it('creates new set and updates treatment when online', async () => {
    const { result } = renderHook(() => useSets())
    await act(async () => { await result.current.startNewSet(1) })

    expect(localDB.sets.put).toHaveBeenCalledWith(
      expect.objectContaining({ setNumber: 1, uid: 'user1', endDate: null })
    )
    expect(localDB.treatment.update).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({ currentSetNumber: 1 })
    )
    expect(fbSet).toHaveBeenCalled()
    expect(queueWrite).not.toHaveBeenCalled()
  })

  it('throws when set number already exists', async () => {
    vi.mocked(useDataContext).mockReturnValue({
      sets: [makeSet('s1', 3)],
      treatment: makeTreatment(3),
    } as never)

    const { result } = renderHook(() => useSets())

    await expect(
      act(async () => { await result.current.startNewSet(3) })
    ).rejects.toThrow('already exists')
  })

  it('closes current set before starting new one', async () => {
    vi.mocked(useDataContext).mockReturnValue({
      sets: [makeSet('s1', 3)],
      treatment: makeTreatment(3),
    } as never)

    const { result } = renderHook(() => useSets())
    await act(async () => { await result.current.startNewSet(4) })

    // Closes old set
    expect(localDB.sets.update).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ endDate: '2026-03-17T10:00:00.000Z' })
    )
    // Creates new set
    expect(localDB.sets.put).toHaveBeenCalledWith(
      expect.objectContaining({ setNumber: 4 })
    )
    // Updates treatment
    expect(localDB.treatment.update).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({ currentSetNumber: 4 })
    )
  })

  it('queues writes when offline', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)

    const { result } = renderHook(() => useSets())
    await act(async () => { await result.current.startNewSet(1) })

    expect(fbSet).not.toHaveBeenCalled()
    expect(queueWrite).toHaveBeenCalled()
  })

  it('does not close previous set when none exists', async () => {
    vi.mocked(useDataContext).mockReturnValue({
      sets: [],
      treatment: null,
    } as never)

    const { result } = renderHook(() => useSets())
    await act(async () => { await result.current.startNewSet(1) })

    expect(localDB.sets.update).not.toHaveBeenCalled()
    expect(localDB.sets.put).toHaveBeenCalledTimes(1)
  })
})

describe('updateTreatment', () => {
  it('updates treatment in localDB and Firebase when online', async () => {
    const { result } = renderHook(() => useSets())
    await act(async () => {
      await result.current.updateTreatment({ totalSets: 25, defaultSetDurationDays: 14 })
    })

    expect(localDB.treatment.update).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({ totalSets: 25, defaultSetDurationDays: 14 })
    )
    expect(fbUpdate).toHaveBeenCalled()
    expect(queueWrite).not.toHaveBeenCalled()
  })

  it('queues update when offline', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)

    const { result } = renderHook(() => useSets())
    await act(async () => {
      await result.current.updateTreatment({ totalSets: 20 })
    })

    expect(fbUpdate).not.toHaveBeenCalled()
    expect(queueWrite).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'update', path: 'users/user1/treatment' })
    )
  })
})
