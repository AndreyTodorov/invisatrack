import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useSets } from '../hooks/useSets'
import { update, ref, db } from '../services/firebase'
import { localDB } from '../services/db'
import { nowISO, todayLocalDate } from '../utils/time'
import {
  DEFAULT_REMINDER_THRESHOLD_MINUTES,
  DEFAULT_AUTO_CAP_MINUTES,
  DEFAULT_SET_DURATION_DAYS,
} from '../constants'

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6,
}

const hintStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-faint)', marginTop: 4,
}

export default function OnboardingView() {
  const { user } = useAuthContext()
  const { startNewSet } = useSets()
  const navigate = useNavigate()
  const [currentSet, setCurrentSet] = useState('1')
  const [totalSets, setTotalSets] = useState('')
  const [goalHours, setGoalHours] = useState(22)
  const [goalMins, setGoalMins] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!user) return
    const setNum = parseInt(currentSet)
    if (isNaN(setNum) || setNum < 1) {
      setError('Please enter a valid set number (1 or higher).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const profile = {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        timezone: 'auto',
        dailyWearGoalMinutes: goalHours * 60 + goalMins,
        reminderThresholdMinutes: DEFAULT_REMINDER_THRESHOLD_MINUTES,
        autoCapMinutes: DEFAULT_AUTO_CAP_MINUTES,
        createdAt: nowISO(),
      }
      await update(ref(db, `users/${user.uid}/profile`), profile)
      await localDB.profile.put({ ...profile, uid: user.uid })

      const treatment = {
        totalSets: totalSets ? parseInt(totalSets) : null,
        defaultSetDurationDays: DEFAULT_SET_DURATION_DAYS,
        currentSetNumber: setNum,
        currentSetStartDate: nowISO(),
      }
      await update(ref(db, `users/${user.uid}/treatment`), treatment)
      await localDB.treatment.put({ ...treatment, uid: user.uid })

      await startNewSet(setNum, todayLocalDate(), DEFAULT_SET_DURATION_DAYS)
      navigate('/', { replace: true })
    } catch (e: unknown) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-card)',
            background: 'var(--cyan-bg)',
            border: 'var(--border-width) solid rgba(0,216,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 16px',
          }}>
            🦷
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Set up your treatment
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Welcome{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}. A few quick details to get started.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--rose-bg)', border: 'var(--border-width) solid rgba(255,68,68,0.2)',
            borderRadius: 'var(--radius-card)', padding: '12px 14px', fontSize: 13, color: 'var(--rose)',
          }}>
            {error}
          </div>
        )}

        {/* Form card */}
        <div style={{
          background: 'var(--surface)',
          border: 'var(--border-width) solid var(--border)',
          borderRadius: 'var(--radius-card)', padding: '22px 20px',
          boxShadow: 'var(--card-shadow)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <label style={labelStyle}>Current aligner set #</label>
            <input
              type="number" min="1" value={currentSet}
              onChange={e => setCurrentSet(e.target.value)}
            />
            <p style={hintStyle}>Which set are you wearing right now?</p>
          </div>

          <div>
            <label style={labelStyle}>Total sets in treatment</label>
            <input
              type="number" min="1" value={totalSets}
              onChange={e => setTotalSets(e.target.value)}
              placeholder="e.g. 30 (optional)"
            />
            <p style={hintStyle}>Leave blank if you don't know yet.</p>
          </div>

          <div>
            <label style={labelStyle}>Daily wear goal</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number" min="0" max="23" value={goalHours} style={{ width: '100%' }}
                  onChange={e => setGoalHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                />
                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0', textAlign: 'center' }}>hours</p>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 300, paddingBottom: 18 }}>:</span>
              <div style={{ flex: 1 }}>
                <input
                  type="number" min="0" max="59" step="5" value={goalMins} style={{ width: '100%' }}
                  onChange={e => setGoalMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0', textAlign: 'center' }}>minutes</p>
              </div>
            </div>
            <p style={hintStyle}>Most orthodontists recommend 20–22 hours.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            background: saving ? 'var(--surface-3)' : 'var(--cyan)',
            color: saving ? 'var(--text-muted)' : '#06090f',
            border: 'none', borderRadius: 'var(--radius-btn)',
            padding: '15px 0', fontSize: 16, fontWeight: 700,
            fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            letterSpacing: '0.01em',
          }}
        >
          {saving ? 'Saving…' : 'Start Tracking →'}
        </button>
      </div>
    </div>
  )
}
