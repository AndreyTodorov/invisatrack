import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction,
} from 'react'
import { onValue, sessionsRef, setsRef, profileRef, treatmentRef, ref, db } from '../services/firebase'
import { localDB } from '../services/db'
import type { Session, AlignerSet, UserProfile, Treatment } from '../types'

interface DataContextValue {
  sessions: Session[]
  sets: AlignerSet[]
  profile: UserProfile | null
  treatment: Treatment | null
  loaded: boolean
  firebaseTreatmentLoaded: boolean
  connected: boolean | null
  setSessions: Dispatch<SetStateAction<Session[]>>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sets, setSets] = useState<AlignerSet[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [treatment, setTreatment] = useState<Treatment | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [firebaseTreatmentLoaded, setFirebaseTreatmentLoaded] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const firebaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track Firebase connection state globally (not uid-scoped)
  useEffect(() => {
    const unsub = onValue(ref(db, '.info/connected'), snap => {
      setConnected(snap.val() as boolean)
    })
    return unsub
  }, [])

  // If Firebase treatment hasn't responded within 5s of IndexedDB loading,
  // fall back to IndexedDB data so the app isn't stuck waiting indefinitely
  useEffect(() => {
    if (loaded && !firebaseTreatmentLoaded) {
      firebaseTimeoutRef.current = setTimeout(() => setFirebaseTreatmentLoaded(true), 5000)
    }
    return () => {
      if (firebaseTimeoutRef.current) clearTimeout(firebaseTimeoutRef.current)
    }
  }, [loaded, firebaseTreatmentLoaded])

  // Load from IndexedDB first (instant, offline-capable)
  useEffect(() => {
    Promise.all([
      localDB.sessions.where('uid').equals(uid).toArray(),
      localDB.sets.where('uid').equals(uid).toArray(),
      localDB.profile.get(uid),
      localDB.treatment.get(uid),
    ]).then(([s, sets, p, t]) => {
      setSessions(s)
      setSets(sets)
      setProfile(p ?? null)
      setTreatment(t ?? null)
      setLoaded(true)
    }).catch(err => {
      console.error('Failed to load from IndexedDB:', err)
      setLoaded(true)
    })
  }, [uid])

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    const unsubSessions = onValue(sessionsRef(uid), snap => {
      const data = snap.val() ?? {}
      const firebaseSessions: Session[] = Object.entries(data).map(
        ([id, v]) => ({ id, ...(v as object) } as Session)
      )

      // FIX CR-2: Merge Firebase data with local-only (offline) sessions
      // Keep local sessions that aren't in Firebase yet (still in syncQueue)
      setSessions(prev => {
        const firebaseIds = new Set(firebaseSessions.map(s => s.id))
        const localOnly = prev.filter(s => !firebaseIds.has(s.id))
        return [...firebaseSessions, ...localOnly]
      })

      // FIX CR-2: Only persist if Firebase has newer data (prevents overwriting pending offline writes)
      firebaseSessions.forEach(async s => {
        try {
          const existing = await localDB.sessions.get(s.id)
          if (!existing || existing.updatedAt < s.updatedAt) {
            await localDB.sessions.put({ ...s, uid })
          }
        } catch (err) {
          console.error('Failed to persist session to IndexedDB:', err)
        }
      })
    })

    const unsubSets = onValue(setsRef(uid), snap => {
      const data = snap.val() ?? {}
      const arr: AlignerSet[] = Object.entries(data).map(
        ([id, v]) => ({ id, ...(v as object) } as AlignerSet)
      )
      setSets(arr)
      arr.forEach(s => {
        localDB.sets.put({ ...s, uid }).catch(err =>
          console.error('Failed to persist set to IndexedDB:', err)
        )
      })
    })

    const unsubProfile = onValue(profileRef(uid), snap => {
      const p = snap.val() as UserProfile | null
      if (p) {
        setProfile(p)
        localDB.profile.put({ ...p, uid }).catch(err =>
          console.error('Failed to persist profile to IndexedDB:', err)
        )
      }
    })

    const unsubTreatment = onValue(treatmentRef(uid), snap => {
      const t = snap.val() as Treatment | null
      setTreatment(t)
      setFirebaseTreatmentLoaded(true)
      if (t) {
        localDB.treatment.put({ ...t, uid }).catch(err =>
          console.error('Failed to persist treatment to IndexedDB:', err)
        )
      }
    })

    return () => { unsubSessions(); unsubSets(); unsubProfile(); unsubTreatment() }
  }, [uid])

  return (
    <DataContext.Provider value={{ sessions, sets, profile, treatment, loaded, firebaseTreatmentLoaded, connected, setSessions }}>
      {children}
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useDataContext must be inside DataProvider')
  return ctx
}
