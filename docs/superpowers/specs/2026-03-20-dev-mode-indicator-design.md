# Dev Mode Visual Indicator — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Problem

The developer runs prod and dev builds simultaneously. Without a visual cue, it's easy to accidentally make changes to the production app when the dev instance is open in another tab.

Dev mode is defined as `VITE_USE_EMULATOR=true` (Firebase emulator active).

## Solution

Two complementary indicators, both rendered only when `import.meta.env.VITE_USE_EMULATOR === 'true'`:

### 1. Top Banner

A slim amber strip pinned at the very top of the app shell, above all content.

- Background: `rgba(252, 211, 77, 0.12)`
- Border-bottom: `1px solid rgba(252, 211, 77, 0.35)`
- Text: "Developer Mode" in amber (`#FCD34D`), uppercase, ~10px, semibold
- Pulsing amber dot on the left
- Centered layout

### 2. Page Title Prefix

When in dev mode, the document title is prefixed with `[DEV] ` so browser tabs are immediately distinguishable (e.g., `[DEV] InvisaTrack`).

Set via `document.title` in `main.tsx` before the React render, so it applies regardless of route.

## Implementation

- **New file:** `src/components/DevBanner.tsx` — the banner component
- **Modified:** `src/components/layout/AppShell.tsx` — renders `<DevBanner />` above `<main>`
- **Modified:** `src/main.tsx` — sets `document.title` prefix before mount
- **Modified:** `.gitignore` — add `.superpowers/`

## Out of Scope

- No toggle or dismiss button (always visible in dev mode)
- No changes to routing, auth, or data logic
