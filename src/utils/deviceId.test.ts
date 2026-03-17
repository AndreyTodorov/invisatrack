import { describe, it, expect, beforeEach } from 'vitest'
import { getDeviceId } from './deviceId'

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates a UUID on first call', () => {
    const id = getDeviceId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('returns the same ID on subsequent calls', () => {
    const id1 = getDeviceId()
    const id2 = getDeviceId()
    expect(id1).toBe(id2)
  })

  it('persists ID in localStorage', () => {
    const id = getDeviceId()
    expect(localStorage.getItem('alignertrack_device_id')).toBe(id)
  })
})
