export default function NavRow({
  label,
  isPrevDisabled,
  isNextDisabled,
  showToday,
  onPrev,
  onNext,
  onToday,
}: {
  label: string
  isPrevDisabled: boolean
  isNextDisabled: boolean
  showToday: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const btnBase: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: 'var(--radius-btn)',
    border: 'var(--border-width) solid var(--border)',
    background: 'transparent',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'opacity 0.15s',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase,
    color: 'var(--cyan)',
    borderColor: 'var(--cyan)',
  }
  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor: 'default',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button
        style={isPrevDisabled ? btnDisabled : btnBase}
        disabled={isPrevDisabled}
        onClick={onPrev}
      >
        ‹ Prev
      </button>

      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {showToday && (
          <button style={btnActive} onClick={onToday}>
            Today
          </button>
        )}
        <button
          style={isNextDisabled ? btnDisabled : btnBase}
          disabled={isNextDisabled}
          onClick={onNext}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
