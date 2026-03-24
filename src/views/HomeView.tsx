import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimer } from '../hooks/useTimer'
import { useSessions } from '../hooks/useSessions'
import { useReports } from '../hooks/useReports'
import { useAutoAdvanceSet } from '../hooks/useAutoAdvanceSet'
import { useDataContext } from '../contexts/DataContext'
import TimerButton from '../components/timer/TimerButton'
import TimerAlert from '../components/timer/TimerAlert'
import DailySummary from '../components/dashboard/DailySummary'
import SessionList from '../components/dashboard/SessionList'
import TreatmentProgress from '../components/dashboard/TreatmentProgress'
import SessionEditModal from '../components/sessions/SessionEditModal'
import AddSessionModal from '../components/sessions/AddSessionModal'
import { computeDailyStats } from '../utils/stats'
import { toLocalDate, formatDateKey, formatDurationShort, dateDiffDays, todayLocalDate } from '../utils/time'
import type { Session } from '../types'
import {
  DEFAULT_DAILY_WEAR_GOAL_MINUTES,
  DEFAULT_REMINDER_THRESHOLD_MINUTES,
  DEFAULT_AUTO_CAP_MINUTES,
  MINUTES_PER_DAY,
} from '../constants'

const SNOOZE_MINUTES = 10

export default function HomeView() {
  const { profile, treatment, sets, loaded, firebaseTreatmentLoaded, connected } = useDataContext()
  const syncing = loaded && !firebaseTreatmentLoaded && treatment !== null
  const navigate = useNavigate()

  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_DAILY_WEAR_GOAL_MINUTES
  const reminderMins = profile?.reminderThresholdMinutes ?? DEFAULT_REMINDER_THRESHOLD_MINUTES
  const autoCapMins = profile?.autoCapMinutes ?? DEFAULT_AUTO_CAP_MINUTES
  const currentSet = treatment?.currentSetNumber ?? 1

  const { elapsedMinutes, isRunning, reminderFired, autoCapped, start, stop } =
    useTimer(reminderMins, autoCapMins, currentSet)

  const { sessions } = useSessions()
  const { streak, allSegments, getSetStats } = useReports(goalMinutes)
  const { autoAdvancedSets, dismiss: dismissAutoAdvance } = useAutoAdvanceSet()
  const currentSetStats = treatment ? getSetStats(treatment.currentSetNumber) : null
  const currentSetAvgWear = currentSetStats && currentSetStats.totalRemovals > 0
    ? currentSetStats.avgWearPct
    : undefined
  const currentSetData = sets.find(s => s.setNumber === currentSet)
  const effectiveSetDuration = currentSetData?.endDate
    ? dateDiffDays(currentSetData.startDate, currentSetData.endDate) + 1
    : treatment?.defaultSetDurationDays ?? 7

  const effectiveSetStartDate = (currentSetData?.startDate ?? treatment?.currentSetStartDate ?? '').slice(0, 10)

  const todayKey = todayLocalDate()

  const currentSetDayStatus = useMemo(() => {
    const setEnd = currentSetData?.endDate?.slice(0, 10)
    const map = new Map<string, boolean>()
    const datesInSet = new Set(
      allSegments
        .filter(seg => seg.date >= effectiveSetStartDate && (!setEnd || seg.date <= setEnd) && seg.date <= todayKey)
        .map(seg => seg.date)
    )
    datesInSet.forEach(date => {
      const stats = computeDailyStats(date, allSegments, goalMinutes)
      map.set(date, stats.compliant)
    })
    return map
  }, [allSegments, effectiveSetStartDate, currentSetData, goalMinutes, todayKey])

  const todayStats = computeDailyStats(todayKey, allSegments, goalMinutes)

  // FIX LG-1: filter today's sessions by LOCAL date using each session's own timezone offset
  const todaySessions = sessions.filter(s => {
    const localDate = formatDateKey(toLocalDate(s.startTime, s.startTimezoneOffset))
    return localDate === todayKey
  })

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const snoozeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSession, setLastSession] = useState<{ durationMinutes: number; budgetLeftMinutes: number } | null>(null)
  // snoozedUntil: null = not snoozed, Infinity = dismissed for session, timestamp = snoozed until that time
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null)
  const [autoCappedDismissed, setAutoCappedDismissed] = useState(false)
  const showAlert = reminderFired && !snoozedUntil

  // Redirect to onboarding if no treatment set up
  useEffect(() => {
    if (loaded && firebaseTreatmentLoaded && !treatment) navigate('/onboarding', { replace: true })
  }, [loaded, firebaseTreatmentLoaded, treatment, navigate])

  // Clear snooze timer when session stops
  useEffect(() => {
    if (!isRunning && snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current)
      snoozeTimerRef.current = null
    }
  }, [isRunning])

  const handleStart = async () => {
    setSnoozedUntil(null)
    setLastSession(null)
    setAutoCappedDismissed(false)
    await start()
  }

  const handleDismiss = () => {
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current)
      snoozeTimerRef.current = null
    }
    setSnoozedUntil(Infinity)
  }

  const handleSnooze = () => {
    setSnoozedUntil(Date.now() + SNOOZE_MINUTES * 60 * 1000)
    snoozeTimerRef.current = setTimeout(() => setSnoozedUntil(null), SNOOZE_MINUTES * 60 * 1000)
  }

  const handleStop = async () => {
    const duration = elapsedMinutes
    await stop()
    const budgetLeft = Math.max(0, (MINUTES_PER_DAY - goalMinutes) - todayStats.totalOffMinutes - duration)
    setLastSession({ durationMinutes: duration, budgetLeftMinutes: budgetLeft })
  }

  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes
  const usedOffMinutes = todayStats.totalOffMinutes + (isRunning ? elapsedMinutes : 0)
  const budgetPercent = Math.min(100, (usedOffMinutes / maxOffMinutes) * 100)

  if (!loaded) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>Loading your data…</div>
  )

  // IndexedDB was empty — waiting for Firebase to confirm whether treatment exists
  if (!treatment && !firebaseTreatmentLoaded) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>Syncing with server…</div>
  )

  return (
    <div style={{ padding: '0 16px 16px', maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          InvisaTrack
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {syncing && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(251,191,36,0.08)', border: 'var(--border-width) solid rgba(251,191,36,0.25)',
              borderRadius: 'var(--radius-badge)', padding: '4px 10px',
            }}>
              <div className="sync-dot-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--amber)' }}>Syncing…</span>
            </div>
          )}
          {!syncing && connected === false && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(100,116,139,0.08)', border: 'var(--border-width) solid rgba(100,116,139,0.2)',
              borderRadius: 'var(--radius-badge)', padding: '4px 10px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-faint)' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)' }}>Offline</span>
            </div>
          )}
          {treatment && (
            <span style={{
              fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
              background: 'var(--surface)', border: 'var(--border-width) solid var(--border)',
              borderRadius: 'var(--radius-badge)', padding: '4px 12px',
            }}>
              Set {treatment.currentSetNumber}
              {treatment.totalSets ? `/${treatment.totalSets}` : ''}
            </span>
          )}
        </div>
      </div>

      {autoAdvancedSets.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: 'var(--border-width) solid rgba(0,216,255,0.2)',
          borderRadius: 'var(--radius-card)', padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--cyan)' }}>
            {autoAdvancedSets.length === 1
              ? `Set ${autoAdvancedSets[0]} started automatically`
              : `Sets ${autoAdvancedSets[0]}–${autoAdvancedSets[autoAdvancedSets.length - 1]} started automatically`}
          </span>
          <button
            onClick={dismissAutoAdvance}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 18, cursor: 'pointer', padding: '0 4px', fontFamily: 'inherit' }}
          >×</button>
        </div>
      )}

      {autoCapped && !autoCappedDismissed && (
        <div style={{
          background: 'var(--amber-bg)',
          border: 'var(--border-width) solid rgba(255,194,0,0.2)',
          borderRadius: 'var(--radius-card)', padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 13, color: 'var(--amber)',
        }}>
          <span>Session was automatically ended after {autoCapMins} minutes.</span>
          <button
            onClick={() => setAutoCappedDismissed(true)}
            style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 18, cursor: 'pointer', padding: '0 4px', fontFamily: 'inherit', opacity: 0.7 }}
          >×</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <TimerButton
          isRunning={isRunning}
          onPress={isRunning ? handleStop : handleStart}
          budgetPercent={budgetPercent}
          elapsedMinutes={elapsedMinutes}
          reminderFired={reminderFired}
        />
      </div>

      {lastSession && !isRunning && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--surface)',
            border: 'var(--border-width) solid rgba(0,230,118,0.2)',
            borderRadius: 'var(--radius-card)',
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
            <div style={{ fontSize: 12, marginTop: 4, color: todayStats.compliant ? 'var(--green)' : 'var(--amber)' }}>
              {todayStats.compliant ? 'On track today' : 'Below goal today'}
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
        sessions={todaySessions}
        activeMinutes={isRunning ? elapsedMinutes : 0}
      />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Today's Sessions
          </h3>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              fontSize: 12, fontWeight: 600, color: 'var(--cyan)',
              background: 'var(--cyan-bg)', border: 'var(--border-width) solid rgba(0,216,255,0.2)',
              borderRadius: 'var(--radius-btn)', padding: '3px 10px',
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>
        <SessionList
          sessions={todaySessions}
          onEdit={setEditingSession}
          activeSession={isRunning ? (sessions.find(s => s.endTime == null) ?? null) : null}
          activeElapsedMinutes={elapsedMinutes}
        />
      </div>

      <TreatmentProgress
        treatment={treatment}
        defaultSetDurationDays={effectiveSetDuration}
        currentSetStartDate={effectiveSetStartDate}
        currentSetEndDate={currentSetData?.endDate}
        currentSetDayStatus={currentSetDayStatus}
        avgWearPct={currentSetAvgWear}
        goalMinutes={goalMinutes}
      />

      {showAlert && (
        <TimerAlert
          thresholdMinutes={reminderMins}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
        />
      )}

      {editingSession && (
        <SessionEditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}

      {showAdd && <AddSessionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

