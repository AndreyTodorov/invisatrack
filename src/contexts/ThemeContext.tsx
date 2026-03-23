import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useDataContext } from './DataContext'
import { resolveTheme } from '../themes'

interface ThemeContextValue {
  savedThemeId: string
  previewThemeId: string
  setPreviewThemeId: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useDataContext()

  const [savedThemeId, setSavedThemeId] = useState(() => resolveTheme(localStorage.getItem('theme')))
  const [previewThemeId, setPreviewThemeId] = useState(() => resolveTheme(localStorage.getItem('theme')))

  // Refs for stale-closure-safe comparisons inside effects (React StrictMode
  // runs effects twice in development; refs always hold the latest value)
  const savedThemeIdRef = useRef(savedThemeId)
  const previewThemeIdRef = useRef(previewThemeId)

  // Sync with profile (Firebase/IndexedDB). Guard against null so that a
  // localStorage-based init isn't wiped out before the profile loads.
  // Intentionally scoped to profile.theme only — we don't want the effect
  // to re-fire for unrelated profile field changes.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!profile) return
    const resolved = resolveTheme(profile.theme)

    // Capture whether the user is mid-preview BEFORE updating savedThemeIdRef
    const wasInPreviewMode = previewThemeIdRef.current !== savedThemeIdRef.current

    savedThemeIdRef.current = resolved
    setSavedThemeId(resolved)

    if (!wasInPreviewMode) {
      previewThemeIdRef.current = resolved
      setPreviewThemeId(resolved)
    }
  }, [profile?.theme])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Apply theme to DOM; cleanup removes the attribute on unmount (sign-out)
  // so the previous user's theme doesn't leak into the login screen
  useEffect(() => {
    document.documentElement.dataset.theme = previewThemeId
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [previewThemeId])

  function handleSetPreviewThemeId(id: string) {
    previewThemeIdRef.current = id
    setPreviewThemeId(id)
  }

  return (
    <ThemeContext.Provider value={{ savedThemeId, previewThemeId, setPreviewThemeId: handleSetPreviewThemeId }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
