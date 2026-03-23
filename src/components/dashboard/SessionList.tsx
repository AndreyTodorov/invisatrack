import type { Session } from '../../types'
import { formatDurationShort, formatDuration, diffMinutes } from '../../utils/time'

interface Props {
  sessions: Session[]
  onEdit: (session: Session) => void
  activeSession?: Session | null
  activeElapsedMinutes?: number
}

// FIX LG-4: reliable local time formatting using explicit UTC field reads after offset shift
function formatLocalTime(isoString: string, offsetMinutes: number): string {
  const local = new Date(new Date(isoString).getTime() + offsetMinutes * 60_000)
  const h = String(local.getUTCHours()).padStart(2, '0')
  const m = String(local.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)', opacity: 0.5, flexShrink: 0 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

export default function SessionList({ sessions, onEdit, activeSession, activeElapsedMinutes = 0 }: Props) {
  const completed = sessions
    .filter(s => s.endTime != null)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))

  if (!activeSession && completed.length === 0) return (
    <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0', fontSize: 14 }}>
      No sessions yet today
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Live session row */}
      {activeSession && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,216,255,0.05)',
          border: 'var(--border-width) solid rgba(0,216,255,0.2)',
          borderRadius: 'var(--radius-card)', padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--cyan)', boxShadow: '0 0 5px var(--cyan)',
              animation: 'session-pulse 1.4s ease-in-out infinite', flexShrink: 0,
            }} className="session-live-dot" />
            <span style={{ fontSize: 14, color: 'var(--cyan)', fontWeight: 400 }}>
              {formatLocalTime(activeSession.startTime, activeSession.startTimezoneOffset)}
              <span style={{ margin: '0 6px', opacity: 0.4 }}>→</span>
              now
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatDuration(activeElapsedMinutes)}
          </span>
        </div>
      )}

      {completed.map(s => {
        const duration = diffMinutes(s.startTime, s.endTime!)
        return (
          <button
            key={s.id}
            onClick={() => onEdit(s)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface)',
              border: 'var(--border-width) solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onPointerEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
            onPointerLeave={e => {
              e.currentTarget.style.background = 'var(--surface)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
              {formatLocalTime(s.startTime, s.startTimezoneOffset)}
              <span style={{ margin: '0 6px', opacity: 0.4 }}>→</span>
              {formatLocalTime(s.endTime!, s.endTimezoneOffset ?? s.startTimezoneOffset)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {s.autoCapped && (
                <span style={{
                  fontSize: 10, color: 'var(--amber)',
                  background: 'var(--amber-bg)',
                  border: 'var(--border-width) solid rgba(255,194,0,0.2)',
                  borderRadius: 'var(--radius-badge)', padding: '2px 6px', fontWeight: 500,
                }}>
                  auto
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {formatDurationShort(duration)}
              </span>
              <EditIcon />
            </div>
          </button>
        )
      })}
    </div>
  )
}
