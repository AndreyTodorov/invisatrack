import { useState, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useDataContext } from '../contexts/DataContext'
import { useSets } from '../hooks/useSets'
import ExportButton from '../components/settings/ExportButton'
import { update, ref, db } from '../services/firebase'
import { localDB } from '../services/db'
import { addDays, dateDiffDays } from '../utils/time'
import {
  DEFAULT_DAILY_WEAR_GOAL_MINUTES,
  DEFAULT_REMINDER_THRESHOLD_MINUTES,
  DEFAULT_AUTO_CAP_MINUTES,
} from '../constants'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 18, padding: '18px 18px',
  display: 'flex', flexDirection: 'column', gap: 16,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
}


function SaveButton({
  state,
  dirty,
  idleLabel,
  onClick,
}: {
  state: SaveState
  dirty: boolean
  idleLabel: string
  onClick: () => void
}) {
  const label =
    state === 'saving' ? 'Saving…' :
    state === 'saved'  ? 'Saved ✓' :
    idleLabel

  const isDisabled = state === 'saving' || (!dirty && state === 'idle')

  const bg =
    state === 'saved'   ? 'var(--green)' :
    state === 'error'   ? 'var(--rose)' :
    isDisabled          ? 'var(--surface-3)' :
    'var(--cyan)'

  const textColor = isDisabled ? 'var(--text-faint)' : '#06090f'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {dirty && state === 'idle' && (
        <p style={{ fontSize: 11, color: 'var(--amber)', textAlign: 'right', margin: 0 }}>
          Unsaved changes
        </p>
      )}
      <button
        onClick={onClick}
        disabled={isDisabled}
        style={{
          width: '100%', background: bg, color: textColor,
          border: isDisabled ? '1px solid var(--border)' : 'none',
          borderRadius: 12, padding: '13px 0',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          cursor: isDisabled ? 'default' : 'pointer',
          letterSpacing: '0.02em',
          transition: 'background 0.25s, opacity 0.2s',
        }}
      >
        {label}
      </button>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0', padding: 0 }}>
      {message}
    </p>
  )
}

export default function SettingsPageView() {
  const { user, signOut } = useAuthContext()
  const { profile, treatment, sets } = useDataContext()
  const { updateTreatment, updateSet } = useSets()

  // Goal split into hours + minutes
  const [goalHours, setGoalHours] = useState(Math.floor(DEFAULT_DAILY_WEAR_GOAL_MINUTES / 60))
  const [goalMins, setGoalMins] = useState(DEFAULT_DAILY_WEAR_GOAL_MINUTES % 60)
  const [reminderMins, setReminderMins] = useState(DEFAULT_REMINDER_THRESHOLD_MINUTES)
  const [autoCapMins, setAutoCapMins] = useState(DEFAULT_AUTO_CAP_MINUTES)
  const [totalSets, setTotalSets] = useState<string>('')
  const [defaultDuration, setDefaultDuration] = useState(7)

  // Track initial values to detect unsaved changes
  const [profileInit, setProfileInit] = useState({
    goalHours: Math.floor(DEFAULT_DAILY_WEAR_GOAL_MINUTES / 60),
    goalMins: DEFAULT_DAILY_WEAR_GOAL_MINUTES % 60,
    reminderMins: DEFAULT_REMINDER_THRESHOLD_MINUTES,
    autoCapMins: DEFAULT_AUTO_CAP_MINUTES,
  })
  const [treatmentInit, setTreatmentInit] = useState({ totalSets: '', defaultDuration: 7 })

  const [profileSaveState, setProfileSaveState] = useState<SaveState>('idle')
  const [treatmentSaveState, setTreatmentSaveState] = useState<SaveState>('idle')

  const [touched, setTouched] = useState({
    goalHours: false, goalMins: false, reminderMins: false, autoCapMins: false, defaultDuration: false,
  })
  const touch = (field: keyof typeof touched) =>
    setTouched(prev => ({ ...prev, [field]: true }))

  // Current set duration override
  const [setDurationOverride, setSetDurationOverride] = useState<string>('')
  const [setDurationOverrideInit, setSetDurationOverrideInit] = useState<string>('')
  const [setDurationSaveState, setSetDurationSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (profile) {
      const h = Math.floor(profile.dailyWearGoalMinutes / 60)
      const m = profile.dailyWearGoalMinutes % 60
      setGoalHours(h)
      setGoalMins(m)
      setReminderMins(profile.reminderThresholdMinutes)
      setAutoCapMins(profile.autoCapMinutes)
      setProfileInit({ goalHours: h, goalMins: m, reminderMins: profile.reminderThresholdMinutes, autoCapMins: profile.autoCapMinutes })
    }
    if (treatment) {
      const ts = treatment.totalSets ? String(treatment.totalSets) : ''
      const dd = treatment.defaultSetDurationDays
      setTotalSets(ts)
      setDefaultDuration(dd)
      setTreatmentInit({ totalSets: ts, defaultDuration: dd })

      // Pre-fill current set's duration (derived from endDate - startDate)
      const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
      const overrideStr = currentSet?.endDate
        ? String(dateDiffDays(currentSet.startDate, currentSet.endDate))
        : ''
      setSetDurationOverride(overrideStr)
      setSetDurationOverrideInit(overrideStr)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile, treatment, sets])

  // Dirty detection
  const profileDirty =
    goalHours !== profileInit.goalHours ||
    goalMins !== profileInit.goalMins ||
    reminderMins !== profileInit.reminderMins ||
    autoCapMins !== profileInit.autoCapMins

  const treatmentDirty = totalSets !== treatmentInit.totalSets || defaultDuration !== treatmentInit.defaultDuration

  // Validation
  const totalGoalMins = goalHours * 60 + goalMins
  const goalError =
    totalGoalMins < 60  ? 'Goal must be at least 1 hour' :
    totalGoalMins > 1380 ? 'Goal cannot exceed 23 hours' :
    undefined

  const reminderError =
    reminderMins < 5    ? 'Minimum 5 minutes' :
    reminderMins >= autoCapMins ? 'Reminder must be less than auto-cap duration' :
    undefined

  const autoCapError =
    autoCapMins < 30    ? 'Minimum 30 minutes' :
    autoCapMins > 480   ? 'Maximum 8 hours' :
    undefined

  const profileHasErrors = !!(goalError || reminderError || autoCapError)

  const durationError =
    defaultDuration < 1  ? 'Minimum 1 day' :
    defaultDuration > 30 ? 'Maximum 30 days' :
    undefined

  const treatmentHasErrors = !!durationError

  const saveProfile = async () => {
    setTouched(prev => ({ ...prev, goalHours: true, goalMins: true, reminderMins: true, autoCapMins: true }))
    if (!user || profileHasErrors) return
    setProfileSaveState('saving')
    try {
      const updates = {
        dailyWearGoalMinutes: totalGoalMins,
        reminderThresholdMinutes: reminderMins,
        autoCapMinutes: autoCapMins,
      }
      await update(ref(db, `users/${user.uid}/profile`), updates)
      await localDB.profile.update(user.uid, updates)
      setProfileInit({ goalHours, goalMins, reminderMins, autoCapMins })
      setTouched(prev => ({ ...prev, goalHours: false, goalMins: false, reminderMins: false, autoCapMins: false }))
      setProfileSaveState('saved')
      setTimeout(() => setProfileSaveState('idle'), 2000)
    } catch {
      setProfileSaveState('error')
      setTimeout(() => setProfileSaveState('idle'), 3000)
    }
  }

  const saveTreatment = async () => {
    setTouched(prev => ({ ...prev, defaultDuration: true }))
    if (treatmentHasErrors) return
    setTreatmentSaveState('saving')
    try {
      await updateTreatment({
        totalSets: totalSets ? parseInt(totalSets) : null,
        defaultSetDurationDays: defaultDuration,
      })
      setTreatmentInit({ totalSets, defaultDuration })
      setTouched(prev => ({ ...prev, defaultDuration: false }))
      setTreatmentSaveState('saved')
      setTimeout(() => setTreatmentSaveState('idle'), 2000)
    } catch {
      setTreatmentSaveState('error')
      setTimeout(() => setTreatmentSaveState('idle'), 3000)
    }
  }

  const saveSetDurationOverride = async () => {
    if (!treatment) return
    const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
    if (!currentSet || setDurationOverride === '') return
    setSetDurationSaveState('saving')
    try {
      const newEndDate = addDays(currentSet.startDate, parseInt(setDurationOverride))
      await updateSet(currentSet.id, { endDate: newEndDate })
      setSetDurationOverrideInit(setDurationOverride)
      setSetDurationSaveState('saved')
      setTimeout(() => setSetDurationSaveState('idle'), 2000)
    } catch {
      setSetDurationSaveState('error')
      setTimeout(() => setSetDurationSaveState('idle'), 3000)
    }
  }

  return (
    <div style={{ padding: '0 16px 32px', maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Settings</h1>
      </div>

      {/* Wear goal */}
      <div style={sectionStyle}>
        <span style={sectionTitleStyle}>Wear Goal</span>

        <div>
          <label style={labelStyle}>Daily wear goal</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number" min="0" max="23" value={goalHours}
                onChange={e => setGoalHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                onBlur={() => touch('goalHours')}
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0', textAlign: 'center' }}>hours</p>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 300, paddingBottom: 18 }}>:</span>
            <div style={{ flex: 1 }}>
              <input
                type="number" min="0" max="59" step="5" value={goalMins}
                onChange={e => setGoalMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                onBlur={() => touch('goalMins')}
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0', textAlign: 'center' }}>minutes</p>
            </div>
          </div>
          {(touched.goalHours || touched.goalMins) && <FieldError message={goalError} />}
        </div>

        <div>
          <label style={labelStyle}>Reminder threshold (minutes)</label>
          <input
            type="number" min="5" max="120" value={reminderMins}
            onChange={e => setReminderMins(parseInt(e.target.value) || 0)}
            onBlur={() => touch('reminderMins')}
          />
          {touched.reminderMins && <FieldError message={reminderError} />}
        </div>

        <div>
          <label style={labelStyle}>Auto-cap duration (minutes)</label>
          <input
            type="number" min="30" max="480" value={autoCapMins}
            onChange={e => setAutoCapMins(parseInt(e.target.value) || 0)}
            onBlur={() => touch('autoCapMins')}
          />
          {touched.autoCapMins && <FieldError message={autoCapError} />}
        </div>

        <SaveButton
          state={profileHasErrors ? 'idle' : profileSaveState}
          dirty={profileDirty}
          idleLabel="Save Preferences"
          onClick={saveProfile}
        />
      </div>

      {/* Treatment */}
      <div style={sectionStyle}>
        <span style={sectionTitleStyle}>Treatment Plan</span>
        <div>
          <label style={labelStyle}>Total aligner sets (leave blank if unknown)</label>
          <input type="number" min="1" value={totalSets}
            onChange={e => setTotalSets(e.target.value)} placeholder="e.g. 30" />
        </div>
        <div>
          <label style={labelStyle}>Default set duration (days)</label>
          <input
            type="number" min="1" max="30" value={defaultDuration}
            onChange={e => setDefaultDuration(parseInt(e.target.value) || 1)}
            onBlur={() => touch('defaultDuration')}
          />
          {touched.defaultDuration && <FieldError message={durationError} />}
        </div>
        <SaveButton
          state={treatmentHasErrors ? 'idle' : treatmentSaveState}
          dirty={treatmentDirty}
          idleLabel="Save Treatment Settings"
          onClick={saveTreatment}
        />
      </div>

      {/* Current set duration override */}
      {treatment && (() => {
        const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
        const defaultDur = treatment.defaultSetDurationDays
        const currentDur = currentSet?.endDate ? dateDiffDays(currentSet.startDate, currentSet.endDate) : defaultDur
        const overrideDirty = setDurationOverride !== setDurationOverrideInit
        const overrideError: string | null = setDurationOverride !== ''
          ? parseInt(setDurationOverride) < 1 ? 'Minimum 1 day'
          : parseInt(setDurationOverride) > 90 ? 'Maximum 90 days'
          : null
          : null
        return (
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={sectionTitleStyle}>Current Set</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set {treatment.currentSetNumber}</span>
            </div>
            <div>
              <label style={labelStyle}>Duration (days)</label>
              <input
                type="number" min="1" max="90"
                value={setDurationOverride}
                placeholder={`${currentDur} days`}
                onChange={e => setSetDurationOverride(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '5px 0 0' }}>
                {currentSet?.endDate
                  ? `Ends ${currentSet.endDate} · ${currentDur} days`
                  : `No end date set — enter days to set a duration.`}
              </p>
              {overrideError && <FieldError message={overrideError} />}
            </div>
            <SaveButton
              state={overrideError ? 'idle' : setDurationSaveState}
              dirty={overrideDirty}
              idleLabel="Save Duration"
              onClick={saveSetDurationOverride}
            />
          </div>
        )
      })()}

      <ExportButton />

      <button
        onClick={signOut}
        style={{
          width: '100%', background: 'transparent',
          color: 'var(--rose)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        Sign Out
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>
        v{__APP_VERSION__} · {__BUILD_DATE__}
      </p>
    </div>
  )
}
