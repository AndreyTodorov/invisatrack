/**
 * Phase 1: Types, Theme Definitions & CSS Variables
 *
 * Tests validating: resolveTheme() fallback logic, THEMES array integrity,
 *                   DEFAULT_THEME_ID correctness
 * Spec sections:    §4.3 Business Rules (rules 1, 4), §7 Edge Cases (case 1)
 * Plan tasks:       "Create theme definitions file — src/themes.ts"
 */

import { describe, it, expect } from 'vitest'
import { resolveTheme, THEMES, DEFAULT_THEME_ID, type ThemeDefinition } from './themes'

// ─── resolveTheme() ──────────────────────────────────────────────────────────

describe('resolveTheme — invalid / missing input falls back to obsidian', () => {
  // Spec §4.3 Business Rule 1: "If profile.theme is null, undefined, or an
  // unrecognised string, fall back to 'obsidian'."
  // Spec §7 Edge Case 1: "resolveTheme() falls back to 'obsidian'. The DOM
  // applies the Obsidian theme silently."

  it('returns obsidian for null', () => {
    expect(resolveTheme(null)).toBe('obsidian')
  })

  it('returns obsidian for undefined', () => {
    expect(resolveTheme(undefined)).toBe('obsidian')
  })

  it('returns obsidian for empty string', () => {
    expect(resolveTheme('')).toBe('obsidian')
  })

  it('returns obsidian for an unrecognised theme id', () => {
    expect(resolveTheme('garbage')).toBe('obsidian')
  })

  it('returns obsidian for a future theme id that no longer exists', () => {
    expect(resolveTheme('sunset-gold')).toBe('obsidian')
  })
})

describe('resolveTheme — valid theme ids pass through unchanged', () => {
  it('returns obsidian for obsidian', () => {
    expect(resolveTheme('obsidian')).toBe('obsidian')
  })

  it('returns neobrutalism for neobrutalism', () => {
    expect(resolveTheme('neobrutalism')).toBe('neobrutalism')
  })

  it('passes through every theme id in the THEMES array', () => {
    THEMES.forEach((theme: ThemeDefinition) => {
      expect(resolveTheme(theme.id)).toBe(theme.id)
    })
  })
})

// ─── THEMES array ────────────────────────────────────────────────────────────

describe('THEMES array — structure and ordering', () => {
  // Spec §4.3 Business Rule 4: "Theme cards must display in a deterministic
  // order defined by the THEMES array."

  it('obsidian is the first theme', () => {
    expect(THEMES[0].id).toBe('obsidian')
  })

  it('neobrutalism is the second theme', () => {
    expect(THEMES[1].id).toBe('neobrutalism')
  })

  it('every theme has an id, name, and exactly 3 swatch colors', () => {
    THEMES.forEach((theme: ThemeDefinition) => {
      expect(theme.id).toBeTruthy()
      expect(theme.name).toBeTruthy()
      expect(theme.swatchColors).toHaveLength(3)
    })
  })

  it('all swatch colors are non-empty strings', () => {
    THEMES.forEach((theme: ThemeDefinition) => {
      theme.swatchColors.forEach((color: string) => {
        expect(typeof color).toBe('string')
        expect(color.length).toBeGreaterThan(0)
      })
    })
  })

  it('all theme ids are unique', () => {
    const ids = THEMES.map((t: ThemeDefinition) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─── DEFAULT_THEME_ID ────────────────────────────────────────────────────────

describe('DEFAULT_THEME_ID', () => {
  it('is obsidian', () => {
    expect(DEFAULT_THEME_ID).toBe('obsidian')
  })

  it('corresponds to an entry in the THEMES array', () => {
    expect(THEMES.find((t: ThemeDefinition) => t.id === DEFAULT_THEME_ID)).toBeDefined()
  })
})
