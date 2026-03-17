import { useState } from 'react'
import { useSets } from '../../hooks/useSets'
import { addDays, dateDiffDays } from '../../utils/time'
import type { AlignerSet } from '../../types'

interface Props {
  set: AlignerSet
  stats: {
    avgWearPct: number
    totalRemovals: number
    complianceDays: number
    avgRemovalsPerDay: number
  }
  isCurrent: boolean
  prevSet: AlignerSet | null
  nextSet: AlignerSet | null
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

export default function SetEditModal({ set, stats, isCurrent, prevSet, nextSet, onClose }: Props) {
  const { updateSet } = useSets()

  const currentDays = set.endDate ? dateDiffDays(set.startDate, set.endDate) : null
  const [startDate, setStartDate] = useState(set.startDate.slice(0, 10))
  const [durationDays, setDurationDays] = useState(currentDays !== null ? String(currentDays) : '')
  const [note, setNote] = useState(set.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationNum = parseInt(durationDays)
  const durationError =
    durationDays !== '' && (isNaN(durationNum) || durationNum < 1) ? 'Minimum 1 day' :
    durationDays !== '' && durationNum > 90 ? 'Maximum 90 days' :
    null

  const startDateError = startDate === '' ? 'Required' : null

  const computedEndDate = durationDays !== '' && !durationError ? addDays(startDate, durationNum) : null

  // What changed relative to the saved set
  const startChanged = startDate !== set.startDate.slice(0, 10)
  // endChanged: true whenever the computed end date differs from the saved one.
  // If set.endDate is null (legacy open set), any computed end date counts as changed —
  // this is intentional: first-time setting an end date should cascade to the next set.
  const endChanged = computedEndDate !== null && computedEndDate !== set.endDate?.slice(0, 10)

  // Advisory text shown inline near each field
  const prevAdjustNote = startChanged && prevSet
    ? `Set ${prevSet.setNumber} end date will adjust to ${startDate}`
    : null
  const nextAdjustNote = endChanged && nextSet && computedEndDate
    ? `Set ${nextSet.setNumber} start date will adjust to ${computedEndDate}`
    : null

  // Overshoot validation (blocks save)
  const prevOvershotError = startChanged && prevSet
    && startDate <= prevSet.startDate.slice(0, 10)
    ? `Start date must be after Set ${prevSet.setNumber}'s start (${prevSet.startDate.slice(0, 10)})`
    : null

  // nextOvershotError is only checked when nextSet.endDate is non-null.
  // If the next set is a legacy open set (endDate: null), no overshoot check is applied —
  // the cascade still sets nextSet.startDate but there's no upper bound to validate against.
  const nextOvershotError = computedEndDate !== null && nextSet?.endDate
    && computedEndDate >= nextSet.endDate.slice(0, 10)
    ? `End date must be before Set ${nextSet.setNumber}'s end (${nextSet.endDate.slice(0, 10)})`
    : null

  const adjacencyError = prevOvershotError ?? nextOvershotError ?? null

  const canSave = !saving && !durationError && !startDateError && !adjacencyError

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const updates: Partial<Pick<AlignerSet, 'startDate' | 'endDate' | 'note'>> = {
        startDate,
        endDate: computedEndDate,
        note: note.trim() || null,
      }
      await updateSet(set.id, updates)

      // Adjust adjacent sets
      if (startChanged && prevSet) {
        await updateSet(prevSet.id, { endDate: startDate })
      }
      if (computedEndDate && endChanged && nextSet) {
        await updateSet(nextSet.id, { startDate: computedEndDate })
      }

      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            Set {set.setNumber}
          </h2>
          {isCurrent && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--cyan)',
              background: 'var(--cyan-bg)', border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              Current
            </span>
          )}
        </div>

        {/* Stats summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}>
          {[
            { label: 'Avg Wear', value: `${Math.round(stats.avgWearPct)}%`, color: stats.avgWearPct >= 95 ? 'var(--green)' : stats.avgWearPct >= 75 ? 'var(--amber)' : 'var(--rose)' },
            { label: 'Sessions', value: String(stats.totalRemovals), color: 'var(--text)' },
            { label: 'Per Day', value: stats.avgRemovalsPerDay > 0 ? stats.avgRemovalsPerDay.toFixed(1) : '—', color: 'var(--text)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color, lineHeight: 1, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </div>

        {error && (
          <p style={{
            fontSize: 13, color: 'var(--rose)',
            background: 'var(--rose-bg)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, padding: '10px 14px', margin: 0,
          }}>{error}</p>
        )}

        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          {startDateError && <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0' }}>{startDateError}</p>}
          {prevAdjustNote && !prevOvershotError && (
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0' }}>
              → {prevAdjustNote}
            </p>
          )}
          {prevOvershotError && (
            <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0' }}>{prevOvershotError}</p>
          )}
        </div>

        <div>
          <label style={labelStyle}>Duration (days)</label>
          <input
            type="number" min="1" max="90"
            value={durationDays}
            placeholder="e.g. 14"
            onChange={e => setDurationDays(e.target.value)}
          />
          {computedEndDate && !durationError && (
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0' }}>
              Ends {computedEndDate}
            </p>
          )}
          {nextAdjustNote && !nextOvershotError && (
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0' }}>
              → {nextAdjustNote}
            </p>
          )}
          {nextOvershotError && (
            <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0' }}>{nextOvershotError}</p>
          )}
          {durationError && <p style={{ fontSize: 11, color: 'var(--rose)', margin: '4px 0 0' }}>{durationError}</p>}
        </div>

        <div>
          <label style={labelStyle}>Note</label>
          <input
            type="text"
            value={note}
            placeholder="Optional note…"
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...btnBase, background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...btnBase,
              background: canSave ? 'var(--cyan)' : 'var(--surface-3)',
              color: canSave ? '#06090f' : 'var(--text-faint)',
              border: canSave ? 'none' : '1px solid var(--border)',
              cursor: canSave ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
