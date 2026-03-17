import { ref, set, update, remove, db } from './firebase'
import { localDB } from './db'
import { SyncQueueItem } from '../types'
import { nowISO } from '../utils/time'
import { SYNC_MAX_RETRIES } from '../constants'

async function executeOperation(item: SyncQueueItem): Promise<void> {
  const fbRef = ref(db, item.path)
  switch (item.operation) {
    case 'set':    await set(fbRef, item.data); break
    case 'update': await update(fbRef, item.data as object); break
    case 'delete': await remove(fbRef); break
  }
}

export async function drainSyncQueue(): Promise<void> {
  const items = await localDB.syncQueue.orderBy('timestamp').toArray()
  for (const item of items) {
    let attempts = 0
    let lastError: unknown = undefined
    while (attempts < SYNC_MAX_RETRIES) {
      try {
        await executeOperation(item)
        await localDB.syncQueue.delete(item.id!)
        lastError = undefined
        break
      } catch (err) {
        lastError = err
        attempts++
        if (attempts < SYNC_MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000))
        }
      }
    }
    // FIX CR-7: move permanently failing items to dead-letter table
    if (lastError !== undefined) {
      await localDB.syncDeadLetter.add({
        ...item,
        id: undefined,
        retryCount: SYNC_MAX_RETRIES,
        failedAt: nowISO(),
        reason: lastError instanceof Error ? lastError.message : String(lastError),
      })
      await localDB.syncQueue.delete(item.id!)
    }
  }
}

export async function queueWrite(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  await localDB.syncQueue.add({ ...item, retryCount: 0 })
}

export function getSyncQueueCount(): Promise<number> {
  return localDB.syncQueue.count()
}

export function getDeadLetterCount(): Promise<number> {
  return localDB.syncDeadLetter.count()
}
