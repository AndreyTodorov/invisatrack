import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../contexts/AuthContext', () => ({ useAuthContext: () => ({ user: null }) }))
vi.mock('../services/firebase', () => ({ seedVersionRef: vi.fn(), onValue: vi.fn(() => vi.fn()) }))
vi.mock('../services/db', () => ({
  localDB: {
    sessions: { clear: vi.fn() },
    sets: { clear: vi.fn() },
    profile: { clear: vi.fn() },
    treatment: { clear: vi.fn() },
  },
}))

describe('DevBanner', () => {
  const originalTitle = document.title
  let DevBanner: React.ComponentType

  afterEach(() => {
    document.title = originalTitle
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe('when VITE_USE_EMULATOR is not set', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_USE_EMULATOR', '')
      vi.resetModules()
      const mod = await import('./DevBanner')
      DevBanner = mod.default
    })

    it('renders nothing', () => {
      const { container } = render(<DevBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('does not modify document.title', () => {
      document.title = 'InvisaTrack'
      render(<DevBanner />)
      expect(document.title).toBe('InvisaTrack')
    })
  })

  describe('when VITE_USE_EMULATOR is "true"', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_USE_EMULATOR', 'true')
      vi.resetModules()
      const mod = await import('./DevBanner')
      DevBanner = mod.default
    })

    it('renders the developer mode banner', () => {
      render(<DevBanner />)
      expect(screen.getByText(/developer mode/i)).toBeInTheDocument()
    })

    it('prefixes document.title with [DEV]', () => {
      document.title = 'InvisaTrack'
      render(<DevBanner />)
      expect(document.title).toBe('[DEV] InvisaTrack')
    })

    it('restores document.title on unmount', () => {
      document.title = 'InvisaTrack'
      const { unmount } = render(<DevBanner />)
      unmount()
      expect(document.title).toBe('InvisaTrack')
    })

    it('does not double-prefix if title already starts with [DEV]', () => {
      document.title = '[DEV] InvisaTrack'
      render(<DevBanner />)
      expect(document.title).toBe('[DEV] InvisaTrack')
    })
  })
})
