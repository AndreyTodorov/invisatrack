import { useCallback } from 'react'
import { push, set, update, ref, db, setsRef } from '../services/firebase'
import { localDB } from '../services/db'
import { queueWrite } from '../services/syncManager'
import { useDataContext } from '../contexts/DataContext'
import { useAuthContext } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'
import { getDeviceId } from '../utils/deviceId'
import { nowISO, addDays, todayLocalDate } from '../utils/time'
import type { AlignerSet, Treatment } from '../types'

export function useSets() {
  const { user } = useAuthContext()
  const { sets, treatment } = useDataContext()
  const online = useOnlineStatus()
  const uid = user!.uid
  const deviceId = getDeviceId()

  const startNewSet = useCallback(async (setNumber: number, startDateStr: string, durationDays: number) => {
    const alreadyExists = sets.find(s => s.setNumber === setNumber)
    if (alreadyExists) throw new Error(`Set ${setNumber} already exists.`)

    const now = nowISO()
    const endDate = addDays(startDateStr, durationDays)

    // Only close legacy sets when the new set is starting today or earlier
    if (startDateStr <= todayLocalDate() && treatment?.currentSetNumber) {
      const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
      if (currentSet && currentSet.endDate === null) {
        const path = `users/${uid}/sets/${currentSet.id}`
        const updates = { endDate: startDateStr }
        await localDB.sets.update(currentSet.id, updates)
        if (online) await update(ref(db, path), updates)
        else await queueWrite({ operation: 'update', path, data: updates, timestamp: now, deviceId })
      }
    }

    // Create new set with pre-computed endDate
    const newRef = push(setsRef(uid))
    const id = newRef.key!
    const newSet: AlignerSet = {
      id,
      setNumber,
      startDate: startDateStr,
      endDate,
      note: null,
    }
    await localDB.sets.put({ ...newSet, uid })
    const path = `users/${uid}/sets/${id}`
    if (online) await set(ref(db, path), newSet)
    else await queueWrite({ operation: 'set', path, data: newSet, timestamp: now, deviceId })

    // Only advance current set if the new set starts today or earlier
    if (startDateStr <= todayLocalDate()) {
      const treatmentUpdates: Partial<Treatment> = {
        currentSetNumber: setNumber,
        currentSetStartDate: startDateStr,
      }
      await localDB.treatment.update(uid, treatmentUpdates)
      const treatPath = `users/${uid}/treatment`
      if (online) await update(ref(db, treatPath), treatmentUpdates)
      else await queueWrite({ operation: 'update', path: treatPath, data: treatmentUpdates, timestamp: now, deviceId })
    }
  }, [uid, online, deviceId, sets, treatment])

  const updateTreatment = useCallback(async (updates: Partial<Treatment>) => {
    const path = `users/${uid}/treatment`
    await localDB.treatment.update(uid, updates)
    if (online) await update(ref(db, path), updates)
    else await queueWrite({ operation: 'update', path, data: updates, timestamp: nowISO(), deviceId })
  }, [uid, online, deviceId])

  const updateSet = useCallback(async (
    setId: string,
    updates: Partial<Pick<AlignerSet, 'startDate' | 'endDate' | 'note'>>
  ) => {
    const path = `users/${uid}/sets/${setId}`
    await localDB.sets.update(setId, updates)
    if (online) await update(ref(db, path), updates)
    else await queueWrite({ operation: 'update', path, data: updates, timestamp: nowISO(), deviceId })
  }, [uid, online, deviceId])

  return { sets, treatment, startNewSet, updateTreatment, updateSet }
}
