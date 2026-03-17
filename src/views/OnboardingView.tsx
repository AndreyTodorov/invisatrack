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
        dailyWearGoalMinutes: Math.round(goalHours * 60),
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
            width: 56, height: 56, borderRadius: 18,
            background: 'var(--cyan-bg)',
            border: '1px solid rgba(34,211,238,0.2)',
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
            background: 'var(--rose-bg)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--rose)',
          }}>
            {error}
          </div>
        )}

        {/* Form card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: '22px 20px',
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
            <label style={labelStyle}>Daily wear goal (hours)</label>
            <input
              type="number" min="1" max="24" step="0.5" value={goalHours}
              onChange={e => setGoalHours(parseFloat(e.target.value))}
            />
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
            border: 'none', borderRadius: 14,
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
