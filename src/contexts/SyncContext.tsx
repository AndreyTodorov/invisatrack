import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { ref, onValue, db } from '../services/firebase'
import { drainSyncQueue, getSyncQueueCount } from '../services/syncManager'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncContextValue {
  status: SyncStatus
  queueCount: number
  triggerSync: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ uid: _uid, children }: { uid: string; children: ReactNode }) {
  const online = useOnlineStatus()
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [queueCount, setQueueCount] = useState(0)

  // FIX CR-4: useCallback captures online from closure, so effects that include
  // triggerSync in their dep arrays will re-run when online changes
  const triggerSync = useCallback(async () => {
    if (!online) return
    setStatus('syncing')
    try {
      await drainSyncQueue()
      setQueueCount(await getSyncQueueCount())
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [online])  // online is the key dependency

  // Auto-sync when coming back online
  useEffect(() => {
    if (online) triggerSync()
    else setStatus('offline')
  }, [online, triggerSync])  // FIX CR-4: triggerSync in deps

  // Sync when Firebase reports connected
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected')
    return onValue(connectedRef, snap => {
      if (snap.val() === true) triggerSync()
    })
  }, [triggerSync])  // FIX CR-4: triggerSync in deps

  return (
    <SyncContext.Provider value={{ status, queueCount, triggerSync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSyncContext must be inside SyncProvider')
  return ctx
}
