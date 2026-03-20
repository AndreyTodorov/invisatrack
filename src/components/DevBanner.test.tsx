import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import DevBanner from './DevBanner'

describe('DevBanner', () => {
  const originalTitle = document.title

  afterEach(() => {
    document.title = originalTitle
    vi.unstubAllEnvs()
  })

  describe('when VITE_USE_EMULATOR is not set', () => {
    it('renders nothing', () => {
      vi.stubEnv('VITE_USE_EMULATOR', '')
      const { container } = render(<DevBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('does not modify document.title', () => {
      document.title = 'InvisaTrack'
      vi.stubEnv('VITE_USE_EMULATOR', '')
      render(<DevBanner />)
      expect(document.title).toBe('InvisaTrack')
    })
  })

  describe('when VITE_USE_EMULATOR is "true"', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_USE_EMULATOR', 'true')
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
