import { describe, it, expect } from 'vitest'
import {
  formatDuration, splitSessionByDay,
  toLocalDate, formatDateKey, formatDurationShort,
  diffMinutes, addMinutes, addDays, dateDiffDays,
} from './time'

describe('formatDuration', () => {
  it('formats zero as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })
  it('formats 90 minutes correctly', () => {
    expect(formatDuration(90)).toBe('01:30:00')
  })
  it('formats 125 minutes and 30 seconds', () => {
    expect(formatDuration(125.5)).toBe('02:05:30')
  })
})

describe('splitSessionByDay', () => {
  it('returns single segment for same-day session', () => {
    const segments = splitSessionByDay('2026-03-17T10:00:00Z', '2026-03-17T10:30:00Z', 0)
    expect(segments).toHaveLength(1)
    expect(segments[0].durationMinutes).toBe(30)
    expect(segments[0].date).toBe('2026-03-17')
  })

  it('splits midnight-spanning session into two segments', () => {
    const segments = splitSessionByDay('2026-03-17T23:00:00Z', '2026-03-18T01:00:00Z', 0)
    expect(segments).toHaveLength(2)
    expect(segments[0].date).toBe('2026-03-17')
    expect(segments[0].durationMinutes).toBe(60)
    expect(segments[1].date).toBe('2026-03-18')
    expect(segments[1].durationMinutes).toBe(60)
  })

  it('respects timezone offset for midnight boundary', () => {
    // UTC-5 (offset=-300): 2026-03-18T02:00Z is 2026-03-17T21:00 local
    const segments = splitSessionByDay('2026-03-18T02:00:00Z', '2026-03-18T04:00:00Z', -300)
    expect(segments).toHaveLength(1)
    expect(segments[0].date).toBe('2026-03-17')
    expect(segments[0].durationMinutes).toBe(120)
  })
})

describe('toLocalDate', () => {
  it('shifts a UTC timestamp forward by a positive offset', () => {
    // UTC+60 min: 2026-03-17T23:00Z becomes 2026-03-18T00:00 local
    const result = toLocalDate('2026-03-17T23:00:00Z', 60)
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(2) // March
    expect(result.getUTCDate()).toBe(18)
    expect(result.getUTCHours()).toBe(0)
  })

  it('shifts a UTC timestamp backward by a negative offset', () => {
    // UTC-300 min (UTC-5): 2026-03-18T05:00Z becomes 2026-03-18T00:00 local
    const result = toLocalDate('2026-03-18T05:00:00Z', -300)
    expect(result.getUTCDate()).toBe(18)
    expect(result.getUTCHours()).toBe(0)
  })

  it('returns the same instant for zero offset', () => {
    const result = toLocalDate('2026-03-17T10:00:00Z', 0)
    expect(result.getTime()).toBe(new Date('2026-03-17T10:00:00Z').getTime())
  })
})

describe('formatDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateKey(new Date('2026-03-17T00:00:00Z'))).toBe('2026-03-17')
  })

  it('pads single-digit month and day with zeros', () => {
    expect(formatDateKey(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05')
  })
})

describe('formatDurationShort', () => {
  it('formats under 60 minutes as "X min"', () => {
    expect(formatDurationShort(0)).toBe('0 min')
    expect(formatDurationShort(1)).toBe('1 min')
    expect(formatDurationShort(45)).toBe('45 min')
    expect(formatDurationShort(59)).toBe('59 min')
  })

  it('formats exact hours as "Xh"', () => {
    expect(formatDurationShort(60)).toBe('1h')
    expect(formatDurationShort(120)).toBe('2h')
  })

  it('formats hours with remaining minutes as "Xh Ym"', () => {
    expect(formatDurationShort(90)).toBe('1h 30m')
    expect(formatDurationShort(125)).toBe('2h 5m')
  })
})

describe('diffMinutes', () => {
  it('returns elapsed minutes between two ISO strings', () => {
    expect(diffMinutes('2026-03-17T10:00:00Z', '2026-03-17T10:30:00Z')).toBe(30)
  })

  it('returns fractional minutes for sub-minute intervals', () => {
    expect(diffMinutes('2026-03-17T10:00:00Z', '2026-03-17T10:00:30Z')).toBe(0.5)
  })

  it('returns negative when end is before start', () => {
    expect(diffMinutes('2026-03-17T10:30:00Z', '2026-03-17T10:00:00Z')).toBe(-30)
  })
})

describe('addMinutes', () => {
  it('adds minutes to an ISO string', () => {
    expect(addMinutes('2026-03-17T10:00:00.000Z', 30)).toBe('2026-03-17T10:30:00.000Z')
  })

  it('handles crossing midnight', () => {
    expect(addMinutes('2026-03-17T23:45:00.000Z', 30)).toBe('2026-03-18T00:15:00.000Z')
  })
})

describe('addDays', () => {
  it('adds calendar days to a YYYY-MM-DD string', () => {
    expect(addDays('2026-03-17', 7)).toBe('2026-03-24')
  })

  it('handles month boundaries', () => {
    expect(addDays('2026-03-28', 7)).toBe('2026-04-04')
  })

  it('uses only the date part of ISO timestamps', () => {
    expect(addDays('2026-03-17T15:30:00Z', 1)).toBe('2026-03-18')
  })
})

describe('dateDiffDays', () => {
  it('returns positive difference in calendar days', () => {
    expect(dateDiffDays('2026-03-10', '2026-03-17')).toBe(7)
  })

  it('returns 0 for the same date', () => {
    expect(dateDiffDays('2026-03-17', '2026-03-17')).toBe(0)
  })

  it('returns negative when end is before start', () => {
    expect(dateDiffDays('2026-03-17', '2026-03-10')).toBe(-7)
  })
})
