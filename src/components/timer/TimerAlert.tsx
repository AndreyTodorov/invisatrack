interface Props {
  thresholdMinutes: number
  onDismiss: () => void
  onSnooze: () => void
}

export default function TimerAlert({ thresholdMinutes, onDismiss, onSnooze }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 24,
    }}>
      <div
        className="animate-fade-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: 24,
          padding: 32,
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(248,113,113,0.15)',
        }}
      >
        <div style={{
          width: 60, height: 60,
          borderRadius: '50%',
          background: 'var(--rose-bg)',
          border: '1px solid rgba(248,113,113,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 28,
        }}>
          ⏰
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--rose)', marginBottom: 8 }}>
          Put Your Aligners Back
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
          Aligners have been out for <strong style={{ color: 'var(--text)' }}>{thresholdMinutes} minutes</strong>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onDismiss}
            style={{
              width: '100%',
              background: 'var(--rose)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '14px 0',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            Got it
          </button>
          <button
            onClick={onSnooze}
            style={{
              width: '100%',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-strong)',
              borderRadius: 14,
              padding: '12px 0',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Snooze 10 min
          </button>
        </div>
      </div>
    </div>
  )
}
