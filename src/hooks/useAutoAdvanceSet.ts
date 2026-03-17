import { useState, useEffect, useRef } from 'react'
import { useDataContext } from '../contexts/DataContext'
import { useSets } from './useSets'
import { addDays, todayLocalDate } from '../utils/time'

export function useAutoAdvanceSet() {
  const { treatment, sets, loaded } = useDataContext()
  const { startNewSet } = useSets()
  const [autoAdvancedSets, setAutoAdvancedSets] = useState<number[]>([])
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (!loaded || !treatment || sets.length === 0 || hasRunRef.current) return

    const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
    if (!currentSet?.endDate) return  // legacy set with no endDate, skip

    const today = todayLocalDate()
    const endDateNorm = currentSet.endDate.slice(0, 10)
    if (endDateNorm > today) return  // not yet expired

    hasRunRef.current = true
    const defaultDuration = treatment.defaultSetDurationDays

    ;(async () => {
      const created: number[] = []
      let prevEndDate = endDateNorm
      let nextSetNumber = treatment.currentSetNumber + 1

      while (prevEndDate <= today) {
        const exists = sets.find(s => s.setNumber === nextSetNumber)
        if (exists) {
          prevEndDate = exists.endDate ?? addDays(prevEndDate, defaultDuration)
          nextSetNumber++
          continue
        }
        await startNewSet(nextSetNumber, prevEndDate, defaultDuration)
        created.push(nextSetNumber)
        prevEndDate = addDays(prevEndDate, defaultDuration)
        nextSetNumber++
      }

      if (created.length > 0) setAutoAdvancedSets(created)
    })()
  }, [loaded, treatment?.currentSetNumber, sets.length])

  return { autoAdvancedSets, dismiss: () => setAutoAdvancedSets([]) }
}
