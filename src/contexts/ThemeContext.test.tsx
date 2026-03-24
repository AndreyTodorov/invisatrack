/**
 * Phase 2: ThemeContext
 *
 * Tests validating: DOM application of theme, localStorage fast-path (FOUC
 *                   prevention), live preview, Firebase sync behaviour,
 *                   unmount cleanup, and useTheme null guard.
 * Spec sections:    §4.1 User Flows, §4.3 Business Rules (1–3, 5–6),
 *                   §7 Edge Cases (2, 4, 5, 6), §9 Performance
 * Plan tasks:       "Create ThemeContext", "Wire ThemeProvider into App.tsx"
 * Patched risks:    FOUC prevention (Critical Risk #1),
 *                   stale-closure Firebase sync (Critical Risk #2),
 *                   DOM cleanup on unmount (Logical Gap #2),
 *                   useTheme null guard (Logical Gap #4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useTheme } from './ThemeContext'

// ─── Mock DataContext ─────────────────────────────────────────────────────────
// Same pattern as HomeView.test.tsx — mock the module, configure per test.

vi.mock('./DataContext', () => ({ useDataContext: vi.fn() }))

import { useDataContext } from './DataContext'

function mockProfile(theme?: string | null) {
  const profile = theme === null ? null : { theme: theme ?? undefined }
  vi.mocked(useDataContext).mockReturnValue(
    { profile } as unknown as ReturnType<typeof useDataContext>
  )
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getThemeAttr() {
  return document.documentElement.dataset.theme
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // Default: no profile loaded yet
  mockProfile(null)
})

afterEach(() => {
  // Belt-and-suspenders cleanup in case a test unmounts without the effect cleanup
  delete document.documentElement.dataset.theme
})

// ─── Initialization ───────────────────────────────────────────────────────────

describe('ThemeContext — initialization', () => {
  // Spec §4.3 Business Rule 1: default is 'obsidian'
  // Spec §7 Edge Case 6: "ThemeContext applies 'obsidian' as default until profile loads"

  it('defaults to obsidian when profile is null and localStorage is empty', async () => {
    mockProfile(null)

    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.previewThemeId).toBe('obsidian')
    expect(result.current.savedThemeId).toBe('obsidian')
    expect(getThemeAttr()).toBe('obsidian')
  })

  it('initializes from localStorage before profile loads (FOUC prevention)', async () => {
    // Plan patched risk: Critical Risk #1 — localStorage fast-path
    localStorage.setItem('theme', 'neobrutalism')
    mockProfile(null)

    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.previewThemeId).toBe('neobrutalism')
    expect(getThemeAttr()).toBe('neobrutalism')
  })

  it('ignores unrecognised localStorage value and falls back to obsidian', async () => {
    localStorage.setItem('theme', 'not-a-real-theme')
    mockProfile(null)

    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.previewThemeId).toBe('obsidian')
  })
})

// ─── Profile sync ─────────────────────────────────────────────────────────────

describe('ThemeContext — profile sync', () => {
  // Spec §4.1 App Startup: ThemeContext reads profile.theme and applies it
  // Spec §7 Edge Cases 1, 4: Firebase value wins; unknown ID falls back

  it('applies profile.theme to the DOM when profile loads', async () => {
    mockProfile('neobrutalism')

    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.savedThemeId).toBe('neobrutalism')
    expect(result.current.previewThemeId).toBe('neobrutalism')
    expect(getThemeAttr()).toBe('neobrutalism')
  })

  it('falls back to obsidian when profile.theme is an unrecognised string', async () => {
    // Spec §7 Edge Case 1
    mockProfile('corrupted-value')

    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.savedThemeId).toBe('obsidian')
    expect(getThemeAttr()).toBe('obsidian')
  })

  it('falls back to obsidian when profile.theme is undefined', async () => {
    mockProfile(undefined)

    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.savedThemeId).toBe('obsidian')
  })

  it('updates savedThemeId and DOM when Firebase syncs a new theme (not in preview)', async () => {
    // Spec §7 Edge Case 4: "Firebase value wins"
    mockProfile('obsidian')
    const { result, rerender } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(result.current.savedThemeId).toBe('obsidian')

    // Simulate Firebase sync arriving with neobrutalism from another device
    await act(async () => {
      mockProfile('neobrutalism')
      rerender()
    })

    expect(result.current.savedThemeId).toBe('neobrutalism')
    expect(result.current.previewThemeId).toBe('neobrutalism')
    expect(getThemeAttr()).toBe('neobrutalism')
  })

  it('does NOT overwrite previewThemeId when Firebase syncs while user is in preview', async () => {
    // Spec §7 Edge Case 5: "savedThemeId updates, but previewThemeId is not overwritten"
    // Plan patched risk: Critical Risk #2 — stale-closure Firebase sync guard
    mockProfile('obsidian')
    const { result, rerender } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    // User selects neobrutalism — enters preview mode
    act(() => {
      result.current.setPreviewThemeId('neobrutalism')
    })
    expect(result.current.previewThemeId).toBe('neobrutalism')

    // Firebase syncs a different theme from another device
    await act(async () => {
      mockProfile('obsidian')
      rerender()
    })

    // savedThemeId updates to the synced value
    expect(result.current.savedThemeId).toBe('obsidian')
    // previewThemeId must stay on the user's in-progress selection
    expect(result.current.previewThemeId).toBe('neobrutalism')
    expect(getThemeAttr()).toBe('neobrutalism')
  })
})

// ─── Live preview ─────────────────────────────────────────────────────────────

describe('ThemeContext — live preview', () => {
  // Spec §4.1 Primary Flow step 5: "entire app updates immediately"
  // Spec §4.3 Business Rule 5: "live preview must apply before Save"
  // Spec §4.1 Discard Flow step 3: "DOM data-theme reverts"

  it('setPreviewThemeId updates the DOM immediately', async () => {
    mockProfile('obsidian')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.setPreviewThemeId('neobrutalism')
    })

    expect(getThemeAttr()).toBe('neobrutalism')
  })

  it('setPreviewThemeId updates previewThemeId in the context value', async () => {
    mockProfile('obsidian')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.setPreviewThemeId('neobrutalism')
    })

    expect(result.current.previewThemeId).toBe('neobrutalism')
  })

  it('savedThemeId is unchanged after setPreviewThemeId (preview is not a commit)', async () => {
    // Spec §4.3 Business Rule 5: live preview is not persistence
    mockProfile('obsidian')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.setPreviewThemeId('neobrutalism')
    })

    expect(result.current.savedThemeId).toBe('obsidian')
  })

  it('calling setPreviewThemeId(savedThemeId) reverts the DOM — simulates back navigation', async () => {
    // Spec §4.3 Business Rule 6: "revert happens in useEffect cleanup or back-navigation handler"
    mockProfile('obsidian')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    // Enter preview
    act(() => {
      result.current.setPreviewThemeId('neobrutalism')
    })
    expect(getThemeAttr()).toBe('neobrutalism')

    // Simulate back navigation: revert to savedThemeId
    act(() => {
      result.current.setPreviewThemeId(result.current.savedThemeId)
    })

    expect(getThemeAttr()).toBe('obsidian')
    expect(result.current.previewThemeId).toBe('obsidian')
  })

  it('rapid card selections only reflect the last selected theme', async () => {
    // Spec §7 Edge Case 3: "each tap updates previewThemeId immediately"
    mockProfile('obsidian')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.setPreviewThemeId('neobrutalism')
      result.current.setPreviewThemeId('obsidian')
      result.current.setPreviewThemeId('neobrutalism')
    })

    expect(result.current.previewThemeId).toBe('neobrutalism')
    expect(getThemeAttr()).toBe('neobrutalism')
  })
})

// ─── Cleanup on unmount ───────────────────────────────────────────────────────

describe('ThemeContext — cleanup on unmount', () => {
  // Plan patched risk: Logical Gap #2 — DOM cleanup prevents previous user's
  // theme leaking into the login screen after sign-out

  it('removes the data-theme attribute from <html> when ThemeProvider unmounts', async () => {
    mockProfile('neobrutalism')
    const { unmount } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})

    expect(getThemeAttr()).toBe('neobrutalism')

    act(() => {
      unmount()
    })

    expect(getThemeAttr()).toBeUndefined()
  })
})

// ─── useTheme null guard ──────────────────────────────────────────────────────

describe('useTheme — called outside ThemeProvider', () => {
  // Plan patched risk: Logical Gap #4 — surfaces misconfiguration immediately

  it('throws a descriptive error when called outside ThemeProvider', () => {
    // Render the hook with no wrapper — ThemeContext will be null
    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used inside ThemeProvider')
  })
})
