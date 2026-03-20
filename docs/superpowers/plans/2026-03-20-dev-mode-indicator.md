# Dev Mode Visual Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a persistent amber "Developer Mode" banner and `[DEV]` tab title prefix when `VITE_USE_EMULATOR=true`, so the developer can instantly tell which app instance is dev vs prod.

**Architecture:** A single `DevBanner` component checks `import.meta.env.VITE_USE_EMULATOR === 'true'` and renders nothing in production. When active, it renders an amber strip at the top of the app shell and manages the `document.title` prefix via `useEffect`. AppShell mounts it as a sibling before `<main>` so it sits outside the scroll area.

**Tech Stack:** React 18, TypeScript, Vite (env vars via `import.meta.env`), Tailwind CSS (inline styles to match existing AppShell pattern), Vitest + `@testing-library/react` + `@testing-library/jest-dom`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/DevBanner.tsx` | Amber banner + `document.title` prefix; renders null when not in dev mode |
| Create | `src/components/DevBanner.test.tsx` | Unit tests for render behavior and title side-effect |
| Modify | `src/components/layout/AppShell.tsx` | Mount `<DevBanner />` as first child before `<main>` |
| Modify | `.gitignore` | Add `.superpowers/` (runtime brainstorm data, not the `docs/superpowers/` specs dir) |

---

## Task 1: DevBanner — tests + implementation

**Files:**
- Create: `src/components/DevBanner.test.tsx`
- Create: `src/components/DevBanner.tsx`

### Step 1.1: Write the failing tests

Create `src/components/DevBanner.test.tsx`:

```tsx
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
```

- [ ] Write the test file above

### Step 1.2: Run tests to confirm they fail

```bash
npx vitest run src/components/DevBanner.test.tsx
```

Expected: fails with `Cannot find module './DevBanner'`

- [ ] Run the command and confirm failure

### Step 1.3: Implement DevBanner

Create `src/components/DevBanner.tsx`:

```tsx
import { useEffect } from 'react'

const IS_DEV = import.meta.env.VITE_USE_EMULATOR === 'true'

export default function DevBanner() {
  useEffect(() => {
    if (!IS_DEV) return
    const original = document.title
    if (!original.startsWith('[DEV]')) {
      document.title = '[DEV] ' + original
    }
    return () => { document.title = original }
  }, [])

  if (!IS_DEV) return null

  return (
    <div style={{
      background: 'rgba(252, 211, 77, 0.12)',
      borderBottom: '1px solid rgba(252, 211, 77, 0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '5px 12px',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#FCD34D',
        boxShadow: '0 0 6px #FCD34D',
        display: 'inline-block',
        animation: 'dev-banner-pulse 1.4s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{
        color: '#FCD34D',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        Developer Mode
      </span>
      <style>{`
        @keyframes dev-banner-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] Write the implementation file above

### Step 1.4: Run tests to confirm they pass

```bash
npx vitest run src/components/DevBanner.test.tsx
```

Expected: all 5 tests pass

- [ ] Run the command and confirm all pass

### Step 1.5: Commit

```bash
git add src/components/DevBanner.tsx src/components/DevBanner.test.tsx
git commit -m "feat: add DevBanner component with title prefix"
```

- [ ] Commit

---

## Task 2: Wire DevBanner into AppShell

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

### Step 2.1: Add DevBanner to AppShell

Open `src/components/layout/AppShell.tsx`. It currently looks like:

```tsx
import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <main className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

Add the `DevBanner` import and render it as the **first child** of the root `<div>`, before `<main>`:

```tsx
import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import DevBanner from '../DevBanner'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <DevBanner />
      <main className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] Apply the edit

### Step 2.2: Run full test suite to confirm nothing broke

```bash
npm test
```

Expected: all tests pass (no change in count)

- [ ] Run and confirm

### Step 2.3: Commit

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: mount DevBanner in AppShell"
```

- [ ] Commit

---

## Task 3: Update .gitignore

**Files:**
- Modify: `.gitignore`

### Step 3.1: Add .superpowers/ entry

Open `.gitignore` and add the following line in the "Claude Code" tools section (after the `.claude/` entry):

```
# Superpowers brainstorm/visual companion runtime data
.superpowers/
```

Note: `docs/superpowers/` (the specs and plans directory already committed to git) is intentionally **not** ignored — only the dot-prefixed `.superpowers/` runtime directory is.

- [ ] Add the entry

### Step 3.2: Verify .superpowers/ is now ignored

```bash
git status
```

Expected: `.superpowers/` directory does **not** appear as untracked

- [ ] Confirm

### Step 3.3: Commit

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers/ runtime data directory"
```

- [ ] Commit

---

## Verification

After all tasks are complete, manually verify the feature:

1. Start the dev server: `npm run dev`
2. Open the app — confirm the amber "Developer Mode" banner appears at the top and the browser tab shows `[DEV] InvisaTrack`
3. In `.env.local`, temporarily change `VITE_USE_EMULATOR=true` to `VITE_USE_EMULATOR=false`, restart dev server — confirm banner and `[DEV]` prefix are gone
4. Restore `VITE_USE_EMULATOR=true`
