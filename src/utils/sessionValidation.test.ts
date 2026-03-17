import { describe, it, expect } from 'vitest'
import { validateSession } from './sessionValidation'

describe('validateSession', () => {
  it('throws when end before start', () => {
    expect(() => validateSession('2026-03-17T10:30:00Z', '2026-03-17T10:00:00Z', []))
      .toThrow('End time must be after start time')
  })

  it('throws when end equals start', () => {
    expect(() => validateSession('2026-03-17T10:00:00Z', '2026-03-17T10:00:00Z', []))
      .toThrow('End time must be after start time')
  })

  it('throws when session longer than 24h', () => {
    expect(() => validateSession('2026-03-17T00:00:00Z', '2026-03-18T01:00:00Z', []))
      .toThrow('24 hours')
  })

  it('throws on overlap with existing session', () => {
    const existing = [{ id: 'x', startTime: '2026-03-17T12:00:00Z', endTime: '2026-03-17T12:30:00Z' }]
    expect(() => validateSession('2026-03-17T12:15:00Z', '2026-03-17T12:45:00Z', existing))
      .toThrow('overlaps')
  })

  it('does not throw for valid non-overlapping times', () => {
    const existing = [{ id: 'x', startTime: '2026-03-17T12:00:00Z', endTime: '2026-03-17T12:30:00Z' }]
    expect(() => validateSession('2026-03-17T13:00:00Z', '2026-03-17T13:30:00Z', existing))
      .not.toThrow()
  })

  it('does not count excludeId session as conflicting', () => {
    const existing = [{ id: 'x', startTime: '2026-03-17T12:00:00Z', endTime: '2026-03-17T12:30:00Z' }]
    expect(() => validateSession('2026-03-17T12:15:00Z', '2026-03-17T12:45:00Z', existing, 'x'))
      .not.toThrow()
  })

  it('does not check overlap against active sessions (null endTime)', () => {
    const existing = [{ id: 'y', startTime: '2026-03-17T12:00:00Z', endTime: null }]
    expect(() => validateSession('2026-03-17T12:15:00Z', '2026-03-17T12:45:00Z', existing))
      .not.toThrow()
  })
})
