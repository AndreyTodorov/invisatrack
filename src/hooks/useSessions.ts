import { useCallback, useRef } from 'react'
import { push, set, update, remove, ref, db, sessionsRef } from '../services/firebase'
import { localDB } from '../services/db'
import { useDataContext } from '../contexts/DataContext'
import { useAuthContext } from '../contexts/AuthContext'
import { getDeviceId } from '../utils/deviceId'
import { nowISO, getTimezoneOffset } from '../utils/time'
import { validateSession } from '../utils/sessionValidation'
import type { Session } from '../types'

export function useSessions() {
  const { user } = useAuthContext()
  const { sessions, setSessions } = useDataContext()
  const uid = user!.uid
  const deviceId = getDeviceId()
  // FIX SF-3: prevent concurrent writes from double-taps
  const isSubmittingRef = useRef(false)

  // FIX CR-1: all Firebase imports at module top, no require() calls
  const writeToFirebase = useCallback(async (
    path: string,
    data: unknown,
    operation: 'set' | 'update'
  ) => {
    const fbRef = ref(db, path)
    if (operation === 'set') await set(fbRef, data)
    else await update(fbRef, data as object)
  }, [])

  const startSession = useCallback(async (setNumber: number): Promise<string> => {
    // FIX CR-3: prevent multiple active sessions
    const alreadyActive = sessions.find(s => s.endTime === null)
    if (alreadyActive) {
      throw new Error('A session is already active. Please put aligners back first.')
    }
    if (isSubmittingRef.current) throw new Error('A write is already in progress.')
    isSubmittingRef.current = true
    try {
      const newRef = push(sessionsRef(uid))
      const id = newRef.key!
      const now = nowISO()
      const session: Session = {
        id,
        startTime: now,
        endTime: null,
        startTimezoneOffset: getTimezoneOffset(),
        endTimezoneOffset: null,
        setNumber,
        autoCapped: false,
        createdOffline: false,
        deviceId,
        updatedAt: now,
      }
      await localDB.sessions.put({ ...session, uid })
      await writeToFirebase(`users/${uid}/sessions/${id}`, session, 'set')
      return id
    } finally {
      isSubmittingRef.current = false
    }
  }, [uid, deviceId, sessions, writeToFirebase])

  const stopSession = useCallback(async (sessionId: string) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    try {
      const endTime = nowISO()
      const updates = { endTime, endTimezoneOffset: getTimezoneOffset(), updatedAt: endTime }
      await localDB.sessions.update(sessionId, updates)
      await writeToFirebase(`users/${uid}/sessions/${sessionId}`, updates, 'update')
    } finally {
      isSubmittingRef.current = false
    }
  }, [uid, writeToFirebase])

  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<Pick<Session, 'startTime' | 'endTime'>>
  ) => {
    if (updates.startTime && updates.endTime) {
      const otherSessions = sessions.filter(s => s.id !== sessionId)
      validateSession(updates.startTime, updates.endTime, otherSessions, sessionId)
    }
    const payload = { ...updates, updatedAt: nowISO() }
    await localDB.sessions.update(sessionId, payload)
    await writeToFirebase(`users/${uid}/sessions/${sessionId}`, payload, 'update')
  }, [uid, sessions, writeToFirebase])

  const deleteSession = useCallback(async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    await localDB.sessions.delete(sessionId)
    await remove(ref(db, `users/${uid}/sessions/${sessionId}`))
  }, [uid, setSessions])

  const addManualSession = useCallback(async (
    startTime: string,
    endTime: string,
    setNumber: number
  ) => {
    validateSession(startTime, endTime, sessions)
    const newRef = push(sessionsRef(uid))
    const id = newRef.key!
    const session: Session = {
      id,
      startTime,
      endTime,
      startTimezoneOffset: getTimezoneOffset(),
      endTimezoneOffset: getTimezoneOffset(),
      setNumber,
      autoCapped: false,
      createdOffline: false,
      deviceId,
      updatedAt: nowISO(),
    }
    await localDB.sessions.put({ ...session, uid })
    await writeToFirebase(`users/${uid}/sessions/${id}`, session, 'set')
  }, [uid, sessions, deviceId, writeToFirebase])

  return { sessions, startSession, stopSession, updateSession, deleteSession, addManualSession }
}
