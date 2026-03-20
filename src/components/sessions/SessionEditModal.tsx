import { useState } from 'react'
import { useSessions } from '../../hooks/useSessions'
import type { Session } from '../../types'

// FIX CR-5: convert UTC ISO to local time for datetime-local input
function toDatetimeLocal(utcIso: string, offsetMinutes: number): string {
  const local = new Date(new Date(utcIso).getTime() + offsetMinutes * 60_000)
  return local.toISOString().slice(0, 16)
}

// Inverse of toDatetimeLocal: converts a datetime-local string back to UTC ISO
// using the stored offset, not the current device timezone.
// Appends 'Z' to treat the string as UTC before subtracting the offset.
function fromDatetimeLocal(localStr: string, offsetMinutes: number): string {
  return new Date(new Date(localStr + ':00.000Z').getTime() - offsetMinutes * 60_000).toISOString()
}

interface Props {
  session: Session
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

export default function SessionEditModal({ session, onClose }: Props) {
  const { updateSession, deleteSession } = useSessions()
  // FIX CR-5: initialize with LOCAL time using session's own timezone offset
  const [startTime, setStartTime] = useState(
    toDatetimeLocal(session.startTime, session.startTimezoneOffset)
  )
  const [endTime, setEndTime] = useState(
    session.endTime
      ? toDatetimeLocal(session.endTime, session.endTimezoneOffset ?? session.startTimezoneOffset)
      : ''
  )
  const [error, setError] = useState<string | null>(null)
  // FIX SF-2: in-UI confirmation instead of window.confirm()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [closing, setClosing] = useState(false)
  const handleClose = () => setClosing(true)

  const initialStartTime = toDatetimeLocal(session.startTime, session.startTimezoneOffset)
  const initialEndTime = session.endTime
    ? toDatetimeLocal(session.endTime, session.endTimezoneOffset ?? session.startTimezoneOffset)
    : ''
  const hasChanges = startTime !== initialStartTime || endTime !== initialEndTime

  const handleSave = async () => {
    if (!hasChanges) return
    try {
      const updates: Partial<Pick<Session, 'startTime' | 'endTime'>> = {
        startTime: startTime !== initialStartTime
          ? fromDatetimeLocal(startTime, session.startTimezoneOffset)
          : session.startTime,
      }
      if (endTime !== initialEndTime && endTime) {
        updates.endTime = fromDatetimeLocal(endTime, session.endTimezoneOffset ?? session.startTimezoneOffset)
      }
      await updateSession(session.id, updates)
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  const handleDelete = async () => {
    await deleteSession(session.id)
    onClose()
  }

  return (
    <div
      onClick={handleClose}
      onTouchStart={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      <div
        className={closing ? 'animate-slide-down' : 'animate-slide-up'}
        onClick={e => e.stopPropagation()}
        onAnimationEnd={() => { if (closing) onClose() }}
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-strong)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 36px',
          width: '100%', maxWidth: 440,
          maxHeight: 'calc(100% - 40px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '-8px auto 0' }} />

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Edit Session</h2>

        {error && (
          <p style={{
            fontSize: 13, color: 'var(--rose)',
            background: 'var(--rose-bg)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, padding: '10px 14px',
          }}>{error}</p>
        )}

        <div>
          <label style={labelStyle}>Start Time</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>End Time</label>
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>

        {confirmingDelete ? (
          <div style={{
            background: 'var(--rose-bg)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 14, padding: '14px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <p style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 500, textAlign: 'center' }}>
              Delete this session?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmingDelete(false)} style={{ ...btnBase, background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ ...btnBase, background: 'var(--rose)', color: '#fff' }}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleClose}
                disabled={!hasChanges}
                style={{
                  ...btnBase, flex: 1,
                  background: hasChanges ? 'var(--surface-3)' : 'transparent',
                  color: hasChanges ? 'var(--text-muted)' : 'var(--text-faint)',
                  border: hasChanges ? '1px solid var(--border)' : '1px solid transparent',
                  cursor: hasChanges ? 'pointer' : 'default',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                style={{
                  ...btnBase,
                  flex: 2,
                  background: hasChanges ? 'var(--cyan)' : 'var(--surface-3)',
                  color: hasChanges ? '#06090f' : 'var(--text-faint)',
                  border: hasChanges ? 'none' : '1px solid var(--border)',
                  cursor: hasChanges ? 'pointer' : 'default',
                }}
              >
                Save
              </button>
            </div>
            <button
              onClick={() => setConfirmingDelete(true)}
              style={{
                display: 'block', width: 'fit-content', margin: '0 auto',
                border: 'none', background: 'transparent',
                padding: '6px 12px', fontSize: 13, fontWeight: 500,
                fontFamily: 'inherit', cursor: 'pointer', color: 'var(--text-faint)',
              }}
            >
              Delete Session
            </button>
          </>
        )}
      </div>
    </div>
  )
}
