import type { DaySegment } from '../types'

/** Format total minutes (with fractional seconds) as HH:MM:SS */
export function formatDuration(totalMinutes: number): string {
  const totalSeconds = Math.floor(totalMinutes * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

/** Returns current timezone offset in minutes (e.g. -300 for UTC-5) */
export function getTimezoneOffset(): number {
  return -new Date().getTimezoneOffset()
}

/** Parse a UTC ISO string and apply a minutes offset to get local Date */
export function toLocalDate(utcIso: string, offsetMinutes: number): Date {
  const utc = new Date(utcIso).getTime()
  return new Date(utc + offsetMinutes * 60_000)
}

/** Format a local Date as YYYY-MM-DD (reads UTC fields after offset shift) */
export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Split a session by local-time day boundaries.
 * offsetMinutes: the session's start timezone offset (minutes from UTC).
 * Returns one DaySegment per local day the session spans.
 */
export function splitSessionByDay(
  startTime: string,
  endTime: string,
  offsetMinutes: number,
  sessionId = ''
): DaySegment[] {
  const segments: DaySegment[] = []
  let current = toLocalDate(startTime, offsetMinutes)
  const end = toLocalDate(endTime, offsetMinutes)

  while (current < end) {
    const nextMidnight = new Date(current)
    nextMidnight.setUTCHours(24, 0, 0, 0)
    const segmentEnd = end < nextMidnight ? end : nextMidnight
    const durationMinutes = (segmentEnd.getTime() - current.getTime()) / 60_000
    segments.push({ date: formatDateKey(current), durationMinutes, sessionId })
    current = nextMidnight
  }

  return segments
}

/** Format minutes as human-readable: "45 min", "1h 20m", "2h" */
export function formatDurationShort(totalMinutes: number): string {
  const total = Math.floor(totalMinutes)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Difference in minutes between two UTC ISO strings */
export function diffMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000
}

/** Returns current UTC ISO 8601 string */
export function nowISO(): string {
  return new Date().toISOString()
}

/** Adds minutes to a UTC ISO string, returns new ISO string */
export function addMinutes(isoString: string, minutes: number): string {
  return new Date(new Date(isoString).getTime() + minutes * 60_000).toISOString()
}

/** Add calendar days to a date string (YYYY-MM-DD or ISO timestamp), returns YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Difference in calendar days between two date strings (YYYY-MM-DD or ISO timestamp) */
export function dateDiffDays(startStr: string, endStr: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (new Date(endStr.slice(0, 10) + 'T00:00:00Z').getTime() - new Date(startStr.slice(0, 10) + 'T00:00:00Z').getTime()) / msPerDay
  )
}

/** Returns today as YYYY-MM-DD in device local timezone */
export function todayLocalDate(): string {
  const now = new Date()
  const offsetMs = -now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() + offsetMs).toISOString().slice(0, 10)
}
