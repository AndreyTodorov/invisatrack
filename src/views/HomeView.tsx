import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimer } from '../hooks/useTimer'
import { useSessions } from '../hooks/useSessions'
import { useReports } from '../hooks/useReports'
import { useDataContext } from '../contexts/DataContext'
import ActiveTimer from '../components/timer/ActiveTimer'
import TimerButton from '../components/timer/TimerButton'
import TimerAlert from '../components/timer/TimerAlert'
import DailySummary from '../components/dashboard/DailySummary'
import SessionList from '../components/dashboard/SessionList'
import TreatmentProgress from '../components/dashboard/TreatmentProgress'
import SessionEditModal from '../components/sessions/SessionEditModal'
import { computeDailyStats } from '../utils/stats'
import { toLocalDate, formatDateKey, formatDurationShort } from '../utils/time'
import type { Session } from '../types'
import {
  DEFAULT_DAILY_WEAR_GOAL_MINUTES,
  DEFAULT_REMINDER_THRESHOLD_MINUTES,
  DEFAULT_AUTO_CAP_MINUTES,
  MINUTES_PER_DAY,
} from '../constants'

export default function HomeView() {
  const { profile, treatment, loaded } = useDataContext()
  const navigate = useNavigate()

  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_DAILY_WEAR_GOAL_MINUTES
  const reminderMins = profile?.reminderThresholdMinutes ?? DEFAULT_REMINDER_THRESHOLD_MINUTES
  const autoCapMins = profile?.autoCapMinutes ?? DEFAULT_AUTO_CAP_MINUTES
  const currentSet = treatment?.currentSetNumber ?? 1

  const { elapsedMinutes, isRunning, reminderFired, autoCapped, start, stop } =
    useTimer(reminderMins, autoCapMins, currentSet)

  const { sessions } = useSessions()
  const { streak, allSegments } = useReports(goalMinutes)

  // FIX LG-1: Use device local timezone to compute "today" date key
  const todayKey = formatDateKey(toLocalDate(new Date().toISOString(), -new Date().getTimezoneOffset()))

  const todayStats = computeDailyStats(todayKey, allSegments, goalMinutes)

  // FIX LG-1: filter today's sessions by LOCAL date using each session's own timezone offset
  const todaySessions = sessions.filter(s => {
    const localDate = formatDateKey(toLocalDate(s.startTime, s.startTimezoneOffset))
    return localDate === todayKey
  })

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [lastSession, setLastSession] = useState<{ durationMinutes: number; budgetLeftMinutes: number } | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [alertShownForSessionRef] = useState<{ id: string | null }>({ id: null })

  // Redirect to onboarding if no treatment set up
  useEffect(() => {
    if (loaded && !treatment) navigate('/onboarding', { replace: true })
  }, [loaded, treatment, navigate])

  // Show alert dialog when reminder fires (once per session)
  useEffect(() => {
    if (reminderFired && alertShownForSessionRef.id !== (treatment ? String(currentSet) : null)) {
      setShowAlert(true)
      alertShownForSessionRef.id = String(currentSet)
    }
  }, [reminderFired])

  useEffect(() => {
    if (isRunning) setLastSession(null)
  }, [isRunning])

  const handleStop = async () => {
    const duration = elapsedMinutes
    await stop()
    const budgetLeft = Math.max(0, (MINUTES_PER_DAY - goalMinutes) - todayStats.totalOffMinutes - duration)
    setLastSession({ durationMinutes: duration, budgetLeftMinutes: budgetLeft })
  }

  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes
  const usedOffMinutes = todayStats.totalOffMinutes + (isRunning ? elapsedMinutes : 0)
  const budgetPercent = Math.min(100, (usedOffMinutes / maxOffMinutes) * 100)

  // Suppress stats rendering until data is loaded
  if (!loaded) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</div>
  )

  return (
    <div style={{ padding: '0 16px 16px', maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          InvisaTrack
        </h1>
        {treatment && (
          <span style={{
            fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '4px 12px',
          }}>
            Set {treatment.currentSetNumber}
            {treatment.totalSets ? `/${treatment.totalSets}` : ''}
          </span>
        )}
      </div>

      {isRunning && (
        <ActiveTimer elapsedMinutes={elapsedMinutes} reminderFired={reminderFired} />
      )}

      {autoCapped && (
        <div style={{
          background: 'var(--amber-bg)',
          border: '1px solid rgba(252,211,77,0.2)',
          borderRadius: 14, padding: '12px 16px',
          fontSize: 13, color: 'var(--amber)',
        }}>
          Session was automatically ended after {autoCapMins} minutes.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <TimerButton
          isRunning={isRunning}
          onPress={isRunning ? handleStop : start}
          budgetPercent={budgetPercent}
        />
      </div>

      {lastSession && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 16,
            padding: '14px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
              Session ended
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Out for {formatDurationShort(lastSession.durationMinutes)} · {formatDurationShort(lastSession.budgetLeftMinutes)} budget left
            </div>
          </div>
          <button
            onClick={() => setLastSession(null)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-faint)',
              fontSize: 18, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>
      )}

      <DailySummary
        totalOffMinutes={todayStats.totalOffMinutes}
        removals={todayStats.removals}
        goalMinutes={goalMinutes}
        streak={streak}
        activeMinutes={isRunning ? elapsedMinutes : 0}
      />

      <div>
        <h3 style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Today's Sessions
        </h3>
        <SessionList sessions={todaySessions} onEdit={setEditingSession} />
      </div>

      <TreatmentProgress
        treatment={treatment}
        defaultSetDurationDays={treatment?.defaultSetDurationDays ?? 7}
      />

      {showAlert && (
        <TimerAlert
          thresholdMinutes={reminderMins}
          onDismiss={() => setShowAlert(false)}
        />
      )}

      {editingSession && (
        <SessionEditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  )
}

