import { useSessions } from '../../hooks/useSessions'
import { sessionsToCSV, downloadCSV } from '../../utils/csv'

export default function ExportButton() {
  const { sessions } = useSessions()

  const handleExport = () => {
    const csv = sessionsToCSV(sessions)
    downloadCSV(csv, `aligner-sessions-${new Date().toLocaleDateString('sv')}.csv`)
  }

  return (
    <button
      onClick={handleExport}
      style={{
        width: '100%',
        background: 'var(--surface)',
        color: 'var(--text-muted)',
        border: 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-btn)', padding: '13px 0',
        fontSize: 14, fontWeight: 600,
        fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      Export Sessions as CSV
    </button>
  )
}
