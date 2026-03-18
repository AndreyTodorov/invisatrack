import { useState, useEffect, useRef, useCallback } from 'react'
import { useSessions } from './useSessions'
import { diffMinutes, nowISO } from '../utils/time'

interface TimerState {
  activeSessionId: string | null
  elapsedMinutes: number
  isRunning: boolean
  reminderFired: boolean
  autoCapped: boolean
}

export function useTimer(
  reminderThresholdMinutes: number,
  autoCapMinutes: number,
  currentSetNumber: number
) {
  const { sessions, startSession, stopSession } = useSessions()
  const activeSession = sessions.find(s => s.endTime == null) ?? null

  const [timerState, setTimerState] = useState<TimerState>({
    activeSessionId: null,
    elapsedMinutes: 0,
    isRunning: false,
    reminderFired: false,
    autoCapped: false,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // FIX LG-6: use refs so interval callback always reads current config
  const reminderRef = useRef(reminderThresholdMinutes)
  const autoCapRef = useRef(autoCapMinutes)
  useEffect(() => { reminderRef.current = reminderThresholdMinutes }, [reminderThresholdMinutes])
  useEffect(() => { autoCapRef.current = autoCapMinutes }, [autoCapMinutes])

  // Guards against auto-cap firing multiple times for the same session
  const autoCapFiredRef = useRef(false)

  // Tick interval — also handles auto-cap on resume (first tick fires immediately)
  useEffect(() => {
    autoCapFiredRef.current = false

    if (!activeSession) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setTimerState(s => ({ ...s, isRunning: false, elapsedMinutes: 0, activeSessionId: null }))
      return
    }

    setTimerState(s => ({ ...s, isRunning: true, activeSessionId: activeSession.id }))

    const tick = () => {
      const elapsed = diffMinutes(activeSession.startTime, nowISO())
      setTimerState(s => {
        const newState = { ...s, elapsedMinutes: elapsed }
        if (!s.reminderFired && elapsed >= reminderRef.current) {
          newState.reminderFired = true
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            osc.connect(ctx.destination)
            osc.frequency.value = 880
            osc.start()
            osc.stop(ctx.currentTime + 0.3)
          } catch { /* audio not available */ }
        }
        if (elapsed >= autoCapRef.current && !autoCapFiredRef.current) {
          autoCapFiredRef.current = true
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
          stopSession(activeSession.id).catch(console.error)
          newState.isRunning = false
          newState.autoCapped = true
        }
        return newState
      })
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id])

  const start = useCallback(async () => {
    await startSession(currentSetNumber)
    setTimerState(s => ({
      ...s,
      elapsedMinutes: 0,
      isRunning: true,
      reminderFired: false,
      autoCapped: false,
    }))
  }, [startSession, currentSetNumber])

  const stop = useCallback(async () => {
    if (!activeSession) return
    await stopSession(activeSession.id)
    setTimerState(s => ({ ...s, isRunning: false, reminderFired: false }))
  }, [activeSession, stopSession])

  return { ...timerState, start, stop }
}
