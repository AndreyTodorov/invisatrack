// src/components/sets/StartNewSetModal.tsx
import { useState } from 'react'
import { useSets } from '../../hooks/useSets'
import { todayLocalDate } from '../../utils/time'

interface Props {
  currentSetNumber: number
  defaultDurationDays: number
  onClose: () => void
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6,
}

const btnBase: React.CSSProperties = {
  flex: 1, border: 'none', borderRadius: 12,
  padding: '13px 0', fontSize: 14, fontWeight: 600,
  fontFamily: 'inherit', cursor: 'pointer',
}

export default function StartNewSetModal({ currentSetNumber, defaultDurationDays, onClose }: Props) {
  const { startNewSet } = useSets()
  const [setNumber, setSetNumber] = useState(String(currentSetNumber + 1))
  const [duration, setDuration] = useState(String(defaultDurationDays))
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(todayLocalDate())

  const numVal = parseInt(setNumber)
  const durVal = parseInt(duration)
  const numError = setNumber !== '' && (isNaN(numVal) || numVal < 1) ? 'Enter a valid set number' : null
  const durError = duration !== '' && (isNaN(durVal) || durVal < 1 || durVal > 90)
    ? 'Duration must be 1–90 days' : null
  const canProceed = !numError && !durError && setNumber !== '' && duration !== '' && startDate !== ''

  const handleConfirm = () => {
    if (!canProceed) return
    setError(null)
    setConfirming(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await startNewSet(numVal, startDate, durVal)
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div
        onClick={e => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-strong)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 36px',
          width: '100%', maxWidth: 440,
          display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '-8px auto 0' }} />

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Start New Set
        </h2>

        {error && (
          <p style={{
            fontSize: 13, color: 'var(--rose)',
            background: 'var(--rose-bg)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, padding: '10px 14px', margin: 0,
          }}>{error}</p>
        )}

        {confirming ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--amber)', background: 'var(--amber-bg)', border: '1px solid rgba(252,211,77,0.2)', borderRadius: 12, padding: '14px', margin: 0, textAlign: 'center', fontWeight: 500 }}>
              Start Set {numVal} from {startDate} ({durVal} days)?{startDate > todayLocalDate() ? ' Current set stays active until then.' : ` This will close Set ${currentSetNumber}.`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirming(false)} style={{ ...btnBase, background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Back
              </button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnBase, background: 'var(--green)', color: '#06090f' }}>
                {saving ? 'Starting…' : 'Confirm'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={labelStyle}>New set number</label>
              <input
                type="number" min="1"
                value={setNumber}
                onChange={e => setSetNumber(e.target.value)}
                placeholder={`e.g. ${currentSetNumber + 1}`}
              />
              {numError && <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0' }}>{numError}</p>}
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Duration (days)</label>
              <input
                type="number" min="1" max="90"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
              {duration !== '' && durVal !== defaultDurationDays && !durError && (
                <p style={{ fontSize: 11, color: 'var(--amber)', margin: '4px 0 0' }}>
                  Override: {durVal} days (default is {defaultDurationDays})
                </p>
              )}
              {durError && <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0' }}>{durError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...btnBase, background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canProceed}
                style={{
                  ...btnBase,
                  background: canProceed ? 'var(--cyan)' : 'var(--surface-3)',
                  color: canProceed ? '#06090f' : 'var(--text-faint)',
                  border: canProceed ? 'none' : '1px solid var(--border)',
                  cursor: canProceed ? 'pointer' : 'default',
                }}
              >
                Start New Set
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
