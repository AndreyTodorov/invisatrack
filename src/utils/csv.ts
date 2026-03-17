import { Session } from '../types'

export function sessionsToCSV(sessions: Session[]): string {
  const header = [
    'id', 'startTime', 'endTime', 'durationMinutes',
    'setNumber', 'autoCapped', 'createdOffline',
  ].join(',')

  const rows = sessions
    .filter(s => s.endTime !== null)
    .map(s => {
      const duration = s.endTime
        ? ((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000).toFixed(1)
        : ''
      return [
        s.id, s.startTime, s.endTime, duration,
        s.setNumber, s.autoCapped, s.createdOffline,
      ].join(',')
    })

  return [header, ...rows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
