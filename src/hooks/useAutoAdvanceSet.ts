import { useState, useEffect, useRef } from 'react'
import { useDataContext } from '../contexts/DataContext'
import { useSets } from './useSets'
import { addDays, todayLocalDate } from '../utils/time'

export function useAutoAdvanceSet() {
  const { treatment, sets, loaded } = useDataContext()
  const { startNewSet, updateTreatment } = useSets()
  const [autoAdvancedSets, setAutoAdvancedSets] = useState<number[]>([])
  const hasRunRef = useRef<number | null>(null)

  useEffect(() => {
    if (!loaded || !treatment || sets.length === 0) return
    if (hasRunRef.current === treatment.currentSetNumber) return

    const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
    if (!currentSet?.endDate) return  // legacy set with no endDate, skip

    const today = todayLocalDate()
    const endDateNorm = currentSet.endDate.slice(0, 10)
    if (endDateNorm > today) return  // not yet expired

    hasRunRef.current = treatment.currentSetNumber
    const defaultDuration = treatment.defaultSetDurationDays

    ;(async () => {
      const advanced: number[] = []
      let prevEndDate = endDateNorm
      let nextSetNumber = treatment.currentSetNumber + 1

      while (prevEndDate <= today) {
        const exists = sets.find(s => s.setNumber === nextSetNumber)
        if (exists) {
          // Pre-existing set: only count it as advanced if its start date has arrived
          if (exists.startDate.slice(0, 10) <= today) {
            advanced.push(exists.setNumber)
          }
          prevEndDate = exists.endDate ?? addDays(prevEndDate, defaultDuration)
          nextSetNumber++
          continue
        }
        await startNewSet(nextSetNumber, prevEndDate, defaultDuration)
        advanced.push(nextSetNumber)
        prevEndDate = addDays(prevEndDate, defaultDuration)
        nextSetNumber++
      }

      // startNewSet handles treatment updates for newly-created sets.
      // For pre-existing sets, we must update treatment manually.
      // Check if the last set in the chain is pre-existing (still in the original `sets` snapshot).
      if (advanced.length > 0) {
        const lastAdvanced = advanced[advanced.length - 1]
        const lastIsPreExisting = Boolean(sets.find(s => s.setNumber === lastAdvanced))
        if (lastIsPreExisting) {
          const lastSet = sets.find(s => s.setNumber === lastAdvanced)!
          await updateTreatment({
            currentSetNumber: lastAdvanced,
            currentSetStartDate: lastSet.startDate.slice(0, 10),
          })
        }
        setAutoAdvancedSets(advanced)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, treatment?.currentSetNumber, sets.length])

  return { autoAdvancedSets, dismiss: () => setAutoAdvancedSets([]) }
}
