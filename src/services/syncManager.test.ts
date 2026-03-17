import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drainSyncQueue, queueWrite, getSyncQueueCount, getDeadLetterCount } from './syncManager'

vi.mock('./firebase', () => ({
  ref: vi.fn(() => ({})),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  db: {},
}))

vi.mock('./db', () => ({
  localDB: {
    syncQueue: {
      orderBy: vi.fn(),
      delete: vi.fn(),
      add: vi.fn(),
      count: vi.fn(),
    },
    syncDeadLetter: {
      add: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('../utils/time', () => ({
  nowISO: vi.fn(() => '2026-03-17T10:00:00.000Z'),
}))

import { set as fbSet, update as fbUpdate, remove as fbRemove } from './firebase'
import { localDB } from './db'

const setupQueue = (items: unknown[]) => {
  vi.mocked(localDB.syncQueue.orderBy).mockReturnValue({
    toArray: vi.fn().mockResolvedValue(items),
  } as never)
}

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  operation: 'set' as const,
  path: 'users/u1/sessions/s1',
  data: { foo: 'bar' },
  timestamp: '2026-03-17T09:00:00.000Z',
  deviceId: 'dev1',
  retryCount: 0,
  ...overrides,
})

describe('queueWrite', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds item to queue with retryCount 0', async () => {
    vi.mocked(localDB.syncQueue.add).mockResolvedValue(1 as never)
    await queueWrite({
      operation: 'set',
      path: 'users/u1/sessions/s1',
      data: {},
      timestamp: '2026-03-17T10:00:00.000Z',
      deviceId: 'dev1',
    })
    expect(localDB.syncQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ retryCount: 0 })
    )
  })
})

describe('getSyncQueueCount', () => {
  it('returns count from syncQueue', async () => {
    vi.mocked(localDB.syncQueue.count).mockResolvedValue(3 as never)
    expect(await getSyncQueueCount()).toBe(3)
  })
})

describe('getDeadLetterCount', () => {
  it('returns count from dead-letter table', async () => {
    vi.mocked(localDB.syncDeadLetter.count).mockResolvedValue(2 as never)
    expect(await getDeadLetterCount()).toBe(2)
  })
})

describe('drainSyncQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(localDB.syncQueue.delete).mockResolvedValue(undefined as never)
    vi.mocked(localDB.syncDeadLetter.add).mockResolvedValue(1 as never)
  })

  it('does nothing when queue is empty', async () => {
    setupQueue([])
    await drainSyncQueue()
    expect(fbSet).not.toHaveBeenCalled()
    expect(localDB.syncQueue.delete).not.toHaveBeenCalled()
  })

  it('processes a set operation and removes it from queue', async () => {
    const item = makeItem()
    setupQueue([item])
    vi.mocked(fbSet).mockResolvedValue(undefined as never)

    await drainSyncQueue()

    expect(fbSet).toHaveBeenCalledWith({}, item.data)
    expect(localDB.syncQueue.delete).toHaveBeenCalledWith(1)
    expect(localDB.syncDeadLetter.add).not.toHaveBeenCalled()
  })

  it('processes an update operation', async () => {
    const item = makeItem({ operation: 'update' })
    setupQueue([item])
    vi.mocked(fbUpdate).mockResolvedValue(undefined as never)

    await drainSyncQueue()

    expect(fbUpdate).toHaveBeenCalledWith({}, item.data)
    expect(localDB.syncQueue.delete).toHaveBeenCalledWith(1)
  })

  it('processes a delete operation', async () => {
    const item = makeItem({ operation: 'delete', data: null })
    setupQueue([item])
    vi.mocked(fbRemove).mockResolvedValue(undefined as never)

    await drainSyncQueue()

    expect(fbRemove).toHaveBeenCalledWith({})
    expect(localDB.syncQueue.delete).toHaveBeenCalledWith(1)
  })

  it('moves item to dead-letter after max retries', async () => {
    vi.useFakeTimers()
    const item = makeItem()
    setupQueue([item])
    vi.mocked(fbSet).mockRejectedValue(new Error('Network error'))

    const promise = drainSyncQueue()
    await vi.runAllTimersAsync()
    await promise

    expect(localDB.syncDeadLetter.add).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Network error',
        failedAt: '2026-03-17T10:00:00.000Z',
      })
    )
    expect(localDB.syncQueue.delete).toHaveBeenCalledWith(1)
    vi.useRealTimers()
  })

  it('processes multiple items in order', async () => {
    const items = [makeItem({ id: 1 }), makeItem({ id: 2, path: 'users/u1/sessions/s2' })]
    setupQueue(items)
    vi.mocked(fbSet).mockResolvedValue(undefined as never)

    await drainSyncQueue()

    expect(localDB.syncQueue.delete).toHaveBeenCalledTimes(2)
    expect(localDB.syncQueue.delete).toHaveBeenCalledWith(1)
    expect(localDB.syncQueue.delete).toHaveBeenCalledWith(2)
  })
})
