import { useState, useEffect, useRef } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useDataContext } from '../contexts/DataContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSets } from '../hooks/useSets'
import ExportButton from '../components/settings/ExportButton'
import { update, ref, db } from '../services/firebase'
import { localDB } from '../services/db'
import { addDays, dateDiffDays } from '../utils/time'
import { THEMES } from '../themes'
import {
  DEFAULT_DAILY_WEAR_GOAL_MINUTES,
  DEFAULT_REMINDER_THRESHOLD_MINUTES,
  DEFAULT_AUTO_CAP_MINUTES,
} from '../constants'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function ProfileCard({ user, onSignOut }: { user: import('firebase/auth').User; onSignOut: () => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 18, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {user.photoURL
        ? <img src={user.photoURL} alt="" style={{
            width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
            border: '2px solid var(--border-strong)',
          }} />
        : <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface-3)', border: '2px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'var(--cyan)',
          }}>
            {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
          </div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName ?? 'User'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
      </div>

      {confirming
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onSignOut}
              style={{
                background: 'var(--rose-bg)', color: 'var(--rose)',
                border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Sign out
            </button>
            <button
              onClick={() => setConfirming(false)}
              style={{
                background: 'var(--surface-3)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        : <button
            onClick={() => setConfirming(true)}
            style={{
              flexShrink: 0, background: 'none', color: 'var(--rose)',
              border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Sign out
          </button>
      }
    </div>
  )
}

type Section = 'wear' | 'treatment' | 'data' | 'appearance'

const rowCard: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '4px 0',
}
const rowDivider = <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />
const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 18px', gap: 12,
}
const rowLabel: React.CSSProperties = { fontSize: 14, color: 'var(--text-muted)', flex: 1 }
const compactInput: React.CSSProperties = {
  width: 56, background: 'var(--surface-3)', border: '1px solid var(--border-strong)',
  borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
  padding: '6px 8px', textAlign: 'center', outline: 'none',
}
const unit: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }

function NavRow({ icon, iconBg, title, summary, onClick }: {
  icon: React.ReactNode; iconBg: string; title: string; summary: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        background: 'none', border: 'none', width: '100%', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: iconBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</div>
      </div>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, color: 'var(--text-faint)' }}>
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
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
  const { savedThemeId, previewThemeId, setPreviewThemeId } = useTheme()
  const { updateTreatment, updateSet } = useSets()

  // Revert live preview when navigating away from Settings via the bottom nav.
  // Refs capture the latest values so the cleanup closure is never stale.
  const savedThemeIdCleanupRef = useRef(savedThemeId)
  useEffect(() => { savedThemeIdCleanupRef.current = savedThemeId }, [savedThemeId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { setPreviewThemeId(savedThemeIdCleanupRef.current) }, [])

  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [navDir, setNavDir] = useState<'push' | 'pop'>('push')
  const [navKey, setNavKey] = useState(0)
  const navigateTo = (section: Section | null, dir: 'push' | 'pop') => {
    setNavDir(dir)
    setNavKey(k => k + 1)
    setActiveSection(section)
  }

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
  const [appearanceSaveState, setAppearanceSaveState] = useState<SaveState>('idle')

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

  const saveAppearance = async () => {
    if (!user) return
    setAppearanceSaveState('saving')
    try {
      const themeUpdate = { theme: previewThemeId }
      await update(ref(db, `users/${user.uid}/profile`), themeUpdate)
      const updated = await localDB.profile.update(user.uid, themeUpdate)
      if (updated === 0 && profile) {
        await localDB.profile.put({ uid: user.uid, ...profile, ...themeUpdate })
      }
      localStorage.setItem('theme', previewThemeId)
      setAppearanceSaveState('saved')
      setTimeout(() => setAppearanceSaveState('idle'), 2000)
    } catch {
      setAppearanceSaveState('error')
      setTimeout(() => setAppearanceSaveState('idle'), 3000)
    }
  }

  // Swipe-right-to-go-back (edge swipe, like iOS)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (touchStartX.current < 40 && dx > 60 && dx > dy) {
      if (activeSection === 'appearance') setPreviewThemeId(savedThemeId)
      navigateTo(null, 'pop')
    }
  }

  // Summaries shown in nav list rows
  const wearSummary = `${goalHours}h ${goalMins}m · ${reminderMins}min reminder`
  const appearanceSummary = THEMES.find(t => t.id === savedThemeId)?.name ?? 'Obsidian'
  const treatmentSummary = treatment
    ? `Set ${treatment.currentSetNumber}${treatment.totalSets ? ` of ${treatment.totalSets}` : ''} · ${defaultDuration}d cycles`
    : 'Not configured'

  const currentSet = treatment ? sets.find(s => s.setNumber === treatment.currentSetNumber) : undefined
  const currentDur = currentSet?.endDate
    ? dateDiffDays(currentSet.startDate, currentSet.endDate)
    : treatment?.defaultSetDurationDays ?? 0
  const overrideDirty = setDurationOverride !== setDurationOverrideInit
  const overrideError: string | null = setDurationOverride !== ''
    ? parseInt(setDurationOverride) < 1 ? 'Minimum 1 day'
    : parseInt(setDurationOverride) > 90 ? 'Maximum 90 days'
    : null
    : null

  const back = (
    <button
      onClick={() => navigateTo(null, 'pop')}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: 'var(--cyan)',
        fontFamily: 'inherit', fontSize: 16, fontWeight: 600,
        cursor: 'pointer', padding: 'max(env(safe-area-inset-top), 28px) 0 8px',
        minHeight: 44,
      }}
    >
      <svg width="9" height="15" viewBox="0 0 7 12" fill="none">
        <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Settings
    </button>
  )

  return (
    <div
      style={{ padding: '0 16px 32px', maxWidth: 440, margin: '0 auto' }}
      onTouchStart={activeSection ? handleTouchStart : undefined}
      onTouchEnd={activeSection ? handleTouchEnd : undefined}
    >
      <div
        key={navKey}
        className={navDir === 'push' ? 'settings-push' : 'settings-pop'}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >

      {/* ── LIST VIEW ── */}
      {activeSection === null && <>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', paddingTop: 20 }}>Settings</h1>

        {user && <ProfileCard user={user} onSignOut={signOut} />}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '4px 0' }}>
          <NavRow
            icon="⏱" iconBg="rgba(34,211,238,0.12)"
            title="Wear Goal" summary={wearSummary}
            onClick={() => navigateTo('wear', 'push')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />
          <NavRow
            icon="🦷" iconBg="rgba(74,222,128,0.1)"
            title="Treatment Plan" summary={treatmentSummary}
            onClick={() => navigateTo('treatment', 'push')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />
          <NavRow
            icon="🎨" iconBg="rgba(168,85,247,0.1)"
            title="Appearance" summary={appearanceSummary}
            onClick={() => navigateTo('appearance', 'push')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />
          <NavRow
            icon="📤" iconBg="rgba(96,165,250,0.1)"
            title="Data & Export" summary="Export your session history"
            onClick={() => navigateTo('data', 'push')}
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', margin: 0, paddingTop: 4 }}>
          v{__APP_VERSION__} · {__BUILD_DATE__}
        </p>
      </>}

      {/* ── WEAR GOAL DETAIL ── */}
      {activeSection === 'wear' && <>
        {back}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Wear Goal</h1>

        <div style={rowCard}>
          <div style={rowStyle}>
            <span style={rowLabel}>Daily goal</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min="0" max="23" value={goalHours}
                onChange={e => setGoalHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                onBlur={() => touch('goalHours')}
                style={compactInput}
              />
              <span style={unit}>h</span>
              <input
                type="number" min="0" max="59" step="5" value={goalMins}
                onChange={e => setGoalMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                onBlur={() => touch('goalMins')}
                style={compactInput}
              />
              <span style={unit}>m</span>
            </div>
          </div>
          {(touched.goalHours || touched.goalMins) && (
            <div style={{ padding: '0 18px 8px' }}><FieldError message={goalError} /></div>
          )}
          {rowDivider}
          <div style={rowStyle}>
            <span style={rowLabel}>Reminder threshold</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min="5" max="120" value={reminderMins}
                onChange={e => setReminderMins(parseInt(e.target.value) || 0)}
                onBlur={() => touch('reminderMins')}
                style={compactInput}
              />
              <span style={unit}>min</span>
            </div>
          </div>
          {touched.reminderMins && (
            <div style={{ padding: '0 18px 8px' }}><FieldError message={reminderError} /></div>
          )}
          {rowDivider}
          <div style={rowStyle}>
            <span style={rowLabel}>Auto-cap duration</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min="30" max="480" value={autoCapMins}
                onChange={e => setAutoCapMins(parseInt(e.target.value) || 0)}
                onBlur={() => touch('autoCapMins')}
                style={compactInput}
              />
              <span style={unit}>min</span>
            </div>
          </div>
          {touched.autoCapMins && (
            <div style={{ padding: '0 18px 8px' }}><FieldError message={autoCapError} /></div>
          )}
        </div>

        <SaveButton
          state={profileHasErrors ? 'idle' : profileSaveState}
          dirty={profileDirty}
          idleLabel="Save Preferences"
          onClick={saveProfile}
        />
      </>}

      {/* ── TREATMENT DETAIL ── */}
      {activeSection === 'treatment' && <>
        {back}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Treatment Plan</h1>

        <div style={rowCard}>
          <div style={rowStyle}>
            <span style={rowLabel}>Total aligner sets</span>
            <input
              type="number" min="1" value={totalSets}
              onChange={e => setTotalSets(e.target.value)}
              placeholder="e.g. 30"
              style={{ ...compactInput, width: 72 }}
            />
          </div>
          {rowDivider}
          <div style={rowStyle}>
            <span style={rowLabel}>Default set duration</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min="1" max="30" value={defaultDuration}
                onChange={e => setDefaultDuration(parseInt(e.target.value) || 1)}
                onBlur={() => touch('defaultDuration')}
                style={compactInput}
              />
              <span style={unit}>days</span>
            </div>
          </div>
          {touched.defaultDuration && (
            <div style={{ padding: '0 18px 8px' }}><FieldError message={durationError} /></div>
          )}
        </div>

        <SaveButton
          state={treatmentHasErrors ? 'idle' : treatmentSaveState}
          dirty={treatmentDirty}
          idleLabel="Save Treatment"
          onClick={saveTreatment}
        />

        {treatment && <>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 8 }}>
            Current Set
            <span style={{ fontSize: 12, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8, color: 'var(--text-muted)' }}>
              Set {treatment.currentSetNumber}
            </span>
          </h2>

          <div style={rowCard}>
            <div style={rowStyle}>
              <div>
                <div style={rowLabel}>Duration override</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {currentSet?.endDate ? `Ends ${currentSet.endDate} · ${currentDur} days` : 'No end date set'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" min="1" max="90"
                  value={setDurationOverride}
                  placeholder={String(currentDur)}
                  onChange={e => setSetDurationOverride(e.target.value)}
                  style={compactInput}
                />
                <span style={unit}>days</span>
              </div>
            </div>
            {overrideError && (
              <div style={{ padding: '0 18px 8px' }}><FieldError message={overrideError} /></div>
            )}
          </div>

          <SaveButton
            state={overrideError ? 'idle' : setDurationSaveState}
            dirty={overrideDirty}
            idleLabel="Save Duration"
            onClick={saveSetDurationOverride}
          />
        </>}
      </>}

      {/* ── DATA DETAIL ── */}
      {activeSection === 'data' && <>
        {back}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Data & Export</h1>
        <ExportButton />
      </>}

      {/* ── APPEARANCE DETAIL ── */}
      {activeSection === 'appearance' && <>
        <button
          onClick={() => { setPreviewThemeId(savedThemeId); navigateTo(null, 'pop') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--cyan)',
            fontFamily: 'inherit', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', padding: 'max(env(safe-area-inset-top), 28px) 0 8px',
            minHeight: 44,
          }}
        >
          <svg width="9" height="15" viewBox="0 0 7 12" fill="none">
            <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Settings
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Appearance</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {THEMES.map(theme => {
            const [bg, accent, textColor] = theme.swatchColors
            const isSelected = previewThemeId === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => setPreviewThemeId(theme.id)}
                style={{
                  background: bg, border: `2px solid ${isSelected ? 'var(--cyan)' : 'var(--border)'}`,
                  borderRadius: 14, padding: 0, cursor: 'pointer', overflow: 'hidden',
                  fontFamily: 'inherit', outline: isSelected ? '2px solid var(--cyan)' : 'none',
                  outlineOffset: 2, position: 'relative',
                }}
              >
                {/* 3-color swatch strip */}
                <div style={{ display: 'flex', height: 40 }}>
                  <div style={{ flex: 1, background: bg }} />
                  <div style={{ flex: 1, background: accent }} />
                  <div style={{ flex: 1, background: textColor }} />
                </div>
                <div style={{ padding: '8px 12px 10px', textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{theme.name}</div>
                </div>
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--cyan)', color: '#06090f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>✓</div>
                )}
              </button>
            )
          })}
        </div>

        <SaveButton
          state={appearanceSaveState}
          dirty={previewThemeId !== savedThemeId}
          idleLabel="Save Appearance"
          onClick={saveAppearance}
        />
      </>}

      </div>
    </div>
  )
}
