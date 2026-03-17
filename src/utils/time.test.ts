import { describe, it, expect } from 'vitest'
import { formatDuration, splitSessionByDay, getTimezoneOffset } from './time'

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
