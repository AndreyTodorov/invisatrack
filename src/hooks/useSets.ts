import { useCallback } from 'react'
import { push, set, update, remove, ref, db, setsRef } from '../services/firebase'
import { localDB } from '../services/db'
import { useDataContext } from '../contexts/DataContext'
import { useAuthContext } from '../contexts/AuthContext'
import { addDays, todayLocalDate } from '../utils/time'
import type { AlignerSet, Treatment } from '../types'

export function useSets() {
  const { user } = useAuthContext()
  const { sets, treatment } = useDataContext()
  const uid = user!.uid

  const startNewSet = useCallback(async (setNumber: number, startDateStr: string, durationDays: number) => {
    const alreadyExists = sets.find(s => s.setNumber === setNumber)
    if (alreadyExists) throw new Error(`Set ${setNumber} already exists.`)

    const endDate = addDays(startDateStr, durationDays)

    // Only close legacy sets when the new set is starting today or earlier
    if (startDateStr <= todayLocalDate() && treatment?.currentSetNumber) {
      const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
      if (currentSet && currentSet.endDate === null) {
        const updates = { endDate: startDateStr }
        await localDB.sets.update(currentSet.id, updates)
        await update(ref(db, `users/${uid}/sets/${currentSet.id}`), updates)
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
    await set(ref(db, `users/${uid}/sets/${id}`), newSet)

    // Only advance current set if the new set starts today or earlier
    if (startDateStr <= todayLocalDate()) {
      const treatmentUpdates: Partial<Treatment> = {
        currentSetNumber: setNumber,
        currentSetStartDate: startDateStr,
      }
      await localDB.treatment.update(uid, treatmentUpdates)
      await update(ref(db, `users/${uid}/treatment`), treatmentUpdates)
    }

  }, [uid, sets, treatment])

  const updateTreatment = useCallback(async (updates: Partial<Treatment>) => {
    await localDB.treatment.update(uid, updates)
    await update(ref(db, `users/${uid}/treatment`), updates)
  }, [uid])

  const updateSet = useCallback(async (
    setId: string,
    updates: Partial<Pick<AlignerSet, 'startDate' | 'endDate' | 'note' | 'setNumber'>>
  ) => {
    await localDB.sets.update(setId, updates)
    await update(ref(db, `users/${uid}/sets/${setId}`), updates)
  }, [uid])

  const deleteSet = useCallback(async (setId: string) => {
    await localDB.sets.delete(setId)
    await remove(ref(db, `users/${uid}/sets/${setId}`))
  }, [uid])

  return { sets, treatment, startNewSet, updateTreatment, updateSet, deleteSet }
}
