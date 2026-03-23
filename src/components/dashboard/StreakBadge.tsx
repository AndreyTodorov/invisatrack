interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  if (streak === 0) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,194,0,0.1)',
      border: 'var(--border-width) solid rgba(255,194,0,0.2)',
      borderRadius: 'var(--radius-badge)',
      padding: '3px 10px 3px 8px',
    }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
        {streak}d
      </span>
    </div>
  )
}
