import { describe, it, expect } from 'vitest'
import { sessionsToCSV } from './csv'
import { Session } from '../types'

const base: Session = {
  id: 'abc', startTime: '2026-03-17T10:00:00Z', endTime: '2026-03-17T10:30:00Z',
  startTimezoneOffset: 0, endTimezoneOffset: 0,
  setNumber: 1, autoCapped: false, createdOffline: false,
  deviceId: 'dev1', updatedAt: '2026-03-17T10:30:00Z',
}

describe('sessionsToCSV', () => {
  it('includes header row', () => {
    const csv = sessionsToCSV([base])
    expect(csv.split('\n')[0]).toContain('startTime')
  })
  it('outputs correct duration', () => {
    const csv = sessionsToCSV([base])
    expect(csv).toContain('30.0')
  })
  it('excludes sessions with null endTime', () => {
    const active = { ...base, endTime: null }
    const csv = sessionsToCSV([active])
    expect(csv.split('\n').length).toBe(1) // header only
  })
})
