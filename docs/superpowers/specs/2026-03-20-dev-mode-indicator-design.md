# Dev Mode Visual Indicator — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Problem

The developer runs prod and dev builds simultaneously. Without a visual cue, it's easy to accidentally make changes to the production app when the dev instance is open in another tab.

Dev mode is defined as `VITE_USE_EMULATOR=true` (Firebase emulator active).

## Solution

Two complementary indicators, both active only when `import.meta.env.VITE_USE_EMULATOR === 'true'`:

### 1. Top Banner

A slim amber strip pinned at the very top of the app shell, above all content.

- Background: `rgba(252, 211, 77, 0.12)`
- Border-bottom: `1px solid rgba(252, 211, 77, 0.35)`
- Text: "Developer Mode" in amber (`#FCD34D`), uppercase, ~10px, semibold
- Pulsing amber dot on the left
- Centered layout

### 2. Page Title Prefix

When in dev mode, the document title is prefixed with `[DEV] ` so browser tabs are immediately distinguishable (e.g., `[DEV] InvisaTrack`).

Set via a `useEffect` inside `DevBanner` that sets `document.title = '[DEV] ' + document.title` on mount and restores the original title on unmount. This keeps the logic co-located with the feature and self-contained. Because `DevBanner` is always mounted when in dev mode, no route change or future title write can silently drop the prefix — if something else sets the title, the unmount/remount cycle will not occur and the prefix may be lost, but that is an acceptable known limitation given the feature is only for developer orientation.

## Implementation

- **New file:** `src/components/DevBanner.tsx` — the banner component; also owns the `document.title` prefix logic via `useEffect`
- **Modified:** `src/components/layout/AppShell.tsx` — renders `<DevBanner />` as a direct sibling **before** `<main>` inside the root `<div>`, not inside `<main>` itself. This ensures the banner height is excluded from the `flex-1 overflow-y-auto` scroll area.
- **Modified:** `.gitignore` — add `.superpowers/` (the dot-prefixed runtime brainstorm/server data directory at the repo root). Note: `docs/superpowers/` (the specs and plans directory) is intentionally different and remains tracked in git.

## Out of Scope

- No toggle or dismiss button (always visible in dev mode)
- No changes to routing, auth, or data logic
