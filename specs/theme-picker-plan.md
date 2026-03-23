# Implementation Plan: Theme Picker

**Spec:** `./specs/theme-picker.md`
**Date:** 2026-03-23
**Stack:** React 19 + TypeScript + Tailwind CSS v4 + Firebase Realtime DB + Dexie (IndexedDB) + Vite PWA

---

## Architectural Overview

Theme switching is implemented as a CSS custom property override system: the existing `:root` variables in `src/index.css` remain as the Obsidian default, and each additional theme adds a `[data-theme="<id>"]` attribute selector block that overrides those variables. A new `ThemeContext` (inside `DataProvider`) reads `profile.theme` from IndexedDB on mount and writes `document.documentElement.dataset.theme`, ensuring the correct theme is applied before Firebase responds. The Appearance settings section in `SettingsView` drives a live preview by calling `setPreviewThemeId` from the context without persisting, and reverts on back navigation if the user doesn't save. Persistence uses the same Firebase `update()` + Dexie `profile.update()` pattern already used by all other profile settings.

---

## Phase 1: Types, Theme Definitions & CSS Variables

**Goal:** Establish the data model and visual layer — TypeScript types compile, CSS overrides are in place, and both themes are visually correct in the browser.
**Runnable state after this phase:** Apply `data-theme="neobrutalism"` to `<html>` in the browser DevTools and verify the Neobrutalism palette renders across the app. TypeScript build passes.
**Depends on:** None

### Tasks

- [x] Add `theme` field to `UserProfile` — `src/types/index.ts` — existing file, add `theme?: string` to the interface (optional for backwards compatibility with existing stored profiles that don't have the field yet)

- [x] Create theme definitions file — `src/themes.ts` — **new file** — export `ThemeDefinition` interface, `THEMES` array with Obsidian and Neobrutalism entries, `DEFAULT_THEME_ID = 'obsidian'`, and `resolveTheme(id)` pure function:

  ```ts
  export interface ThemeDefinition {
    id: string
    name: string
    swatchColors: [string, string, string]  // bg, accent, text
  }

  export const THEMES: ThemeDefinition[] = [
    { id: 'obsidian',      name: 'Obsidian',      swatchColors: ['#060913', '#22D3EE', '#E8EEFF'] },
    { id: 'neobrutalism',  name: 'Neobrutalism',  swatchColors: ['#FFFBF0', '#0066FF', '#0A0A0A'] },
  ]

  export const DEFAULT_THEME_ID = 'obsidian'

  export function resolveTheme(id: string | undefined | null): string {
    return THEMES.find(t => t.id === id) ? id! : DEFAULT_THEME_ID
  }
  ```

- [x] Add FOUC-prevention inline script — `index.html` — existing file, insert a synchronous `<script>` block immediately before the `<script type="module" src="/src/main.tsx">` tag. This runs before React mounts and before any CSS is parsed, applying the saved theme with zero latency:

  ```html
  <script>
    try {
      var t = localStorage.getItem('theme')
      if (t) document.documentElement.dataset.theme = t
    } catch {}
  </script>
  ```

  > This is the only mechanism that prevents the flash. `useEffect` in ThemeContext fires after first paint — localStorage is synchronous and available at HTML parse time.

- [x] Add Neobrutalism CSS block — `src/index.css` — existing file, insert the `[data-theme="neobrutalism"]` block immediately after the closing `}` of the `:root` block (before the `* { ... }` reset block):

  ```css
  [data-theme="neobrutalism"] {
    --bg: #FFFBF0;
    --surface: #FFFFFF;
    --surface-2: #F5F0E8;
    --surface-3: #EDE8DC;
    --border: rgba(0, 0, 0, 0.85);
    --border-strong: #000000;

    --text: #0A0A0A;
    --text-muted: #3D3D3D;
    --text-faint: #8A8A8A;

    --cyan: #0066FF;
    --cyan-bg: rgba(0, 102, 255, 0.1);
    --cyan-glow: rgba(0, 102, 255, 0.2);

    --rose: #FF3B30;
    --rose-bg: rgba(255, 59, 48, 0.1);
    --rose-glow: rgba(255, 59, 48, 0.25);

    --amber: #FFD600;
    --amber-bg: rgba(255, 214, 0, 0.15);

    --green: #00C752;
    --green-bg: rgba(0, 199, 82, 0.1);
  }
  ```

### Validation

- [ ] Run `npm run build` — TypeScript compilation must pass with zero errors.
- [ ] Run `npm run dev`, open DevTools → Elements, manually set `data-theme="neobrutalism"` on `<html>`. Verify the app background becomes cream (`#FFFBF0`), text becomes dark, cards become white.
- [ ] Remove the `data-theme` attribute — app must snap back to Obsidian dark theme with no CSS changes.
- [ ] Set `localStorage.setItem('theme', 'neobrutalism')` in the browser console, then hard-refresh — the cream background must appear with no visible flash of the dark theme.

### Rollback

- Revert `src/types/index.ts` — remove the `theme?` field.
- Delete `src/themes.ts`.
- Revert `src/index.css` — remove the `[data-theme="neobrutalism"]` block. `git checkout src/index.css` works.
- Revert `index.html` — remove the inline `<script>` block. `git checkout index.html` works.

---

## Phase 2: ThemeContext

**Goal:** Wire the theme system into React so the correct theme is applied from the user's profile on app load, with a live-preview capability for the settings screen.
**Runnable state after this phase:** The app applies the theme stored in `profile.theme` on load. Adding `theme: 'neobrutalism'` directly to a user's Firebase profile (via Firebase Console) and reloading the app switches to Neobrutalism automatically.
**Depends on:** Phase 1

### Tasks

- [x] Create `ThemeContext` — `src/contexts/ThemeContext.tsx` — **new file**:
  - Import `useDataContext` from `DataContext` to read `profile.theme`.
  - Maintain two state values: `savedThemeId` (last persisted — updated when `profile` changes) and `previewThemeId` (drives the DOM — updated on card selection).
  - Also maintain a `savedThemeIdRef = useRef(savedThemeId)` kept in sync with state. **Use the ref — not the state variable — inside effects for comparisons.** This avoids stale closure bugs in React StrictMode (which this app uses) where effect closures capture outdated state values.
  - `useEffect` watching `profile?.theme`: call `resolveTheme(profile?.theme)`, update `savedThemeId` + `savedThemeIdRef.current`, and only update `previewThemeId` if `previewThemeId === savedThemeIdRef.current` (user is not mid-selection). This respects the edge case where Firebase syncs while the user is on the Appearance screen.
  - `useEffect` watching `previewThemeId`: write `document.documentElement.dataset.theme = previewThemeId`. Add a cleanup function `return () => { delete document.documentElement.dataset.theme }` — this resets the `<html>` attribute when the provider unmounts on sign-out, preventing the previous user's theme from leaking into the login screen.
  - Initialize both state values from `localStorage.getItem('theme')` (falling back to `resolveTheme(undefined)`) so the context immediately reflects the correct theme before the profile effect fires — eliminating the gap window between mount and IndexedDB response.
  - Export `ThemeProvider` component and `useTheme` hook. The `useTheme` hook must include a null guard: `if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')` — this surfaces misconfiguration immediately rather than with a cryptic undefined error.

  ```ts
  interface ThemeContextValue {
    savedThemeId: string
    previewThemeId: string
    setPreviewThemeId: (id: string) => void
  }
  ```

- [x] Wire `ThemeProvider` into `App.tsx` — `src/App.tsx` — existing file, wrap the `<AppShell>` (and its children) inside `<ThemeProvider>`, nested inside `DataProvider` so `ThemeContext` can call `useDataContext`:

  ```tsx
  <DataProvider uid={user.uid}>
    <ThemeProvider>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
    </ThemeProvider>
  </DataProvider>
  ```

### Validation

- [ ] Run `npm run dev`. Open Firebase Console → Realtime Database → `users/<uid>/profile` and set `theme: "neobrutalism"`. Hard-refresh the app — the Neobrutalism palette must be applied on load without touching DevTools.
- [ ] Set `theme: "obsidian"` or delete the `theme` field in Firebase — reload — app returns to dark theme.
- [ ] Set `theme: "invalid_garbage"` in Firebase — reload — app silently falls back to Obsidian (no error, no blank screen).

### Rollback

- Delete `src/contexts/ThemeContext.tsx`.
- Revert `src/App.tsx` — remove the `<ThemeProvider>` wrapper. `git checkout src/App.tsx` works.

---

## Phase 3: Appearance Settings UI

**Goal:** Users can open Settings → Appearance, see theme cards, select a theme with live preview, save it, and have the preview revert on back navigation without saving.
**Runnable state after this phase:** The full user-facing feature is complete and matches the spec's user flows.
**Depends on:** Phase 2

### Tasks

- [ ] Extend `Section` type and add Appearance nav row — `src/views/SettingsView.tsx` — existing file:
  - Add `'appearance'` to the `Section` union type: `type Section = 'wear' | 'treatment' | 'data' | 'appearance'`
  - Add an Appearance `<NavRow>` to the main settings list (between "Treatment Plan" and "Data & Export"), with icon `🎨`, `iconBg="rgba(139,92,246,0.1)"`, title `"Appearance"`, and summary showing the current saved theme name (e.g. `THEMES.find(t => t.id === savedThemeId)?.name ?? 'Obsidian'`).
  - Add the divider between Treatment Plan and the new Appearance row.

- [ ] Add Appearance detail section — `src/views/SettingsView.tsx` — existing file, add the `{activeSection === 'appearance' && ...}` block after the Data detail block:
  - Render the back button (same pattern as other sections).
  - Render `<h1>Appearance</h1>`.
  - Import `THEMES` from `src/themes.ts` and `useTheme` from `src/contexts/ThemeContext.tsx`.
  - Render a 2-column CSS grid of theme cards. Each card:
    - Shows a swatch strip of the 3 `swatchColors` (3 equal-width divs stacked horizontally, height ~40px).
    - Shows the theme name below the swatch.
    - Has a 2px cyan border + small `✓` badge when it is the selected (`previewThemeId`) theme.
    - On tap: calls `setPreviewThemeId(theme.id)`.
  - Dirty detection: `previewThemeId !== savedThemeId`.
  - Reuse the existing `SaveButton` component with:
    - `dirty={previewThemeId !== savedThemeId}`
    - `idleLabel="Save Appearance"`
    - `onClick={saveAppearance}` — a new save handler that calls `resolveTheme(previewThemeId)`, writes to Firebase + IndexedDB using the same pattern as `saveProfile`.
  - On back navigation (the back button and the swipe-left handler), call `setPreviewThemeId(savedThemeId)` before navigating to `null` to revert the live preview.

  ```ts
  const saveAppearance = async () => {
    if (!user) return
    const themeToSave = resolveTheme(previewThemeId)
    setAppearanceSaveState('saving')
    try {
      await update(ref(db, `users/${user.uid}/profile`), { theme: themeToSave })
      // update() returns 0 if the row doesn't exist — fall back to put() in that case
      const updated = await localDB.profile.update(user.uid, { theme: themeToSave })
      if (updated === 0) {
        await localDB.profile.put({ uid: user.uid, theme: themeToSave } as LocalProfile)
      }
      localStorage.setItem('theme', themeToSave)
      setAppearanceSaveState('saved')
      setTimeout(() => setAppearanceSaveState('idle'), 2000)
    } catch {
      setAppearanceSaveState('error')
      setTimeout(() => setAppearanceSaveState('idle'), 3000)
    }
  }
  ```

  - Add `appearanceSaveState` to component state (`useState<SaveState>('idle')`).
  - The swipe-to-go-back handler (`handleTouchEnd`) already navigates to `null` — update it to call `setPreviewThemeId(savedThemeId)` first when `activeSection === 'appearance'`.

### Validation

- [ ] Run `npm run dev`. Navigate to Settings — confirm the "Appearance" nav row appears between "Treatment Plan" and "Data & Export", with the current theme name in the summary.
- [ ] Tap the Appearance row — confirm the detail screen slides in with the push animation.
- [ ] Tap the Neobrutalism card — the entire app background switches to cream immediately (live preview). The Save button becomes active with "Unsaved changes".
- [ ] Tap the back button without saving — the app reverts to Obsidian (or whatever was previously saved). No save occurred.
- [ ] Tap Neobrutalism, then tap Save — Firebase `users/<uid>/profile/theme` reads `"neobrutalism"` in the console. Save button shows "Saved ✓".
- [ ] Hard-refresh — the Neobrutalism theme is applied on load.

### Rollback

- Revert `src/views/SettingsView.tsx`. `git checkout src/views/SettingsView.tsx` works since Phase 1 and 2 changes are in separate files.

---

## Phase 4: Unit Tests

**Goal:** Automated coverage for the pure logic in `resolveTheme` and the DOM-application behavior of `ThemeContext`.
**Runnable state after this phase:** `npm test` passes with all new tests green.
**Depends on:** Phase 2

### Tasks

- [ ] Write `resolveTheme` unit tests — `src/themes.test.ts` — **new file**:
  - `resolveTheme(null)` → `'obsidian'`
  - `resolveTheme(undefined)` → `'obsidian'`
  - `resolveTheme('')` → `'obsidian'`
  - `resolveTheme('garbage')` → `'obsidian'`
  - `resolveTheme('obsidian')` → `'obsidian'`
  - `resolveTheme('neobrutalism')` → `'neobrutalism'`

- [ ] Write `ThemeContext` unit tests — `src/contexts/ThemeContext.test.tsx` — **new file** using `@testing-library/react`:
  - Mock `DataContext` at the top of the file using the same pattern as `HomeView.test.tsx`: `vi.mock('../contexts/DataContext', () => ({ useDataContext: vi.fn() }))`. Configure `useDataContext` to return `{ profile: null }` by default, and override per-test with `vi.mocked(useDataContext).mockReturnValue({ profile: { theme: '...' } })`.
  - Renders without crashing when `profile` is null → `document.documentElement.dataset.theme` is `'obsidian'`.
  - When `profile.theme = 'neobrutalism'` is provided, `document.documentElement.dataset.theme` becomes `'neobrutalism'`.
  - `setPreviewThemeId('neobrutalism')` updates `document.documentElement.dataset.theme` to `'neobrutalism'`.
  - After `setPreviewThemeId('neobrutalism')`, calling `setPreviewThemeId(savedThemeId)` reverts the DOM attribute back to the saved value.
  - On unmount, `document.documentElement.dataset.theme` is deleted (verify the cleanup runs).

  > Note: The existing test setup in `src/test-setup.ts` and `vitest.config.ts` already configures jsdom — no additional setup needed.

### Validation

- [ ] Run `npm test` — all tests pass, including the 6 `resolveTheme` tests and 4 `ThemeContext` tests.
- [ ] Run `npm run test:coverage` — `src/themes.ts` shows 100% function coverage.

### Rollback

- Delete `src/themes.test.ts`.
- Delete `src/contexts/ThemeContext.test.tsx`.

---

## Implementation Order Summary

```
Phase 1 (Foundation)
  ├─ src/types/index.ts         ← add `theme?`
  ├─ src/themes.ts              ← new
  ├─ src/index.css              ← add neobrutalism block
  └─ index.html                 ← add FOUC-prevention inline script

Phase 2 (ThemeContext)
  ├─ src/contexts/ThemeContext.tsx  ← new
  └─ src/App.tsx                    ← add ThemeProvider wrapper

Phase 3 (Settings UI)
  └─ src/views/SettingsView.tsx     ← add Appearance section

Phase 4 (Tests)
  ├─ src/themes.test.ts             ← new
  └─ src/contexts/ThemeContext.test.tsx  ← new
```

Total files changed: 5 existing, 4 new.

---

## Red Team Review

**Reviewed:** 2026-03-23
**Spec:** `./specs/theme-picker.md`
**Verdict:** Gaps found — patch before implementing

### Spec Coverage

- **Covered:** 17/18 spec requirements mapped to plan tasks
- **Missing:** Spec Performance section states "no layout shift or flash of unstyled content" — the plan has no mechanism to apply the theme *before* React mounts (see Critical Risk #1)
- **Scope creep:** None

---

### Critical Risks

1. **Flash of Unstyled Content (FOUC) on load**
   - **Where:** Phase 2 — ThemeContext design
   - **Risk:** `useEffect` in `ThemeContext` fires *after* the first browser paint. A user with `theme: 'neobrutalism'` saved will see the dark Obsidian theme flash for ~50–150ms before the context reads IndexedDB and updates `data-theme`. The spec explicitly requires no flash, and `index.html` currently has no pre-mount mechanism to apply the theme attribute.
   - **Mitigation:** Add two changes: (a) write the resolved theme ID to `localStorage` (key `'theme'`) whenever `saveAppearance` persists to Firebase — this is a single extra line. (b) Add a tiny inline `<script>` in `index.html` *before* the `<script type="module">` tag that synchronously reads `localStorage.getItem('theme')` and sets `document.documentElement.dataset.theme` if the value is non-null. This executes before any CSS or JS, eliminating the flash entirely. `ThemeContext` still drives the reactive state; localStorage is only the fast-path boot mechanism.

2. **Stale closure in the `profile.theme` effect**
   - **Where:** Phase 2 — ThemeContext implementation detail
   - **Risk:** The plan says the `useEffect` watching `profile?.theme` should "only update `previewThemeId` if `previewThemeId === savedThemeId`". But both values are React state — the effect closure captures their values at render time, not at effect-run time. Under React 19 concurrent rendering (and React StrictMode, which this app uses — see `src/main.tsx` line 8), there is a real window where the effect reads a stale `previewThemeId` and incorrectly overwrites an in-progress preview selection.
   - **Mitigation:** Track `savedThemeId` in a `useRef` in addition to state. Read from the ref — not the state variable — inside the profile effect to get the always-current comparison value: `if (previewThemeIdRef.current === savedThemeIdRef.current) { setPreviewThemeId(resolved) }`. Alternatively, use a single `useReducer` that handles both updates atomically. The plan task for `ThemeContext` should explicitly call this out.

---

### Logical Gaps

1. **`localDB.profile.update()` silently no-ops if the profile row doesn't exist**
   - **Where:** Phase 3 — `saveAppearance` handler
   - **Gap:** Dexie's `Table.update(key, changes)` returns `0` (records updated) when the key doesn't exist — it does *not* create the row. For a user who somehow cleared IndexedDB or is in a partial-sync state, `localDB.profile.update(uid, { theme })` would silently succeed with no local persistence. The same risk exists in `saveProfile` but that's pre-existing; introducing the same pattern without noting it would create a confusing maintenance trap.
   - **Fix:** After the `localDB.profile.update()` call, check the return value. If it is `0`, fall back to `localDB.profile.put({ uid, theme: themeToSave })`. Or use a small `upsertTheme` helper that centralizes this pattern. Add this to the Phase 3 task.

2. **`data-theme` attribute left on `<html>` after sign-out**
   - **Where:** Phase 2 — ThemeContext lifecycle
   - **Gap:** `ThemeProvider` is inside `AuthenticatedApp → DataProvider`, so it unmounts when the user signs out. But `document.documentElement.dataset.theme` is a DOM side effect with no cleanup. After sign-out, the login screen and briefly the next user's initial load will inherit the previous user's theme. This is especially visible if user A (Neobrutalism) signs out and user B (Obsidian) signs in on the same device — the login view shows a cream background until user B's profile loads.
   - **Fix:** Add a cleanup to the `useEffect` that drives `document.documentElement.dataset.theme`:
     ```ts
     useEffect(() => {
       document.documentElement.dataset.theme = previewThemeId
       return () => { delete document.documentElement.dataset.theme }
     }, [previewThemeId])
     ```
     The cleanup runs on unmount (sign-out), resetting the DOM to the `:root` defaults. Add this to the Phase 2 ThemeContext task.

3. **`ThemeContext.test.tsx` needs to mock `DataContext` — plan doesn't mention this**
   - **Where:** Phase 4 — ThemeContext test setup
   - **Gap:** `ThemeProvider` calls `useDataContext()` internally. The `ThemeContext.test.tsx` plan says to provide profile data "via a mock `DataContext`" but gives no guidance on how. Looking at `HomeView.test.tsx`, the pattern is `vi.mock('../contexts/DataContext', () => ({ useDataContext: vi.fn() }))`. If this isn't spelled out, the test file will throw "DataContext is null" and the developer will waste time debugging.
   - **Fix:** Add explicit mock setup to the Phase 4 task: the test must call `vi.mock('../contexts/DataContext', ...)` and configure `useDataContext` to return a minimal profile object `{ profile: { theme: '...' } }`. Include this in the task description.

4. **Summary row in Settings shows stale theme name before ThemeContext is available**
   - **Where:** Phase 3 — Appearance nav row in the settings list
   - **Gap:** The plan says the summary shows `THEMES.find(t => t.id === savedThemeId)?.name ?? 'Obsidian'`. But `savedThemeId` comes from `useTheme()`, which requires `ThemeProvider` to be in the tree. If `SettingsView` calls `useTheme()` unconditionally and a future developer wraps Settings outside the provider (e.g., in a test), it will throw. This is a defensive programming gap, not a runtime bug in production.
   - **Fix:** Add a guard to the `useTheme` hook that throws a descriptive error if called outside `ThemeProvider`: `if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')`. One line, saves future debugging. Note this in the Phase 2 task.

---

### Optimization Suggestions

1. **localStorage as the sole fast-path (no need for complex IndexedDB timing)**
   - **Current approach:** ThemeContext reads from `profile` (IndexedDB via DataContext) which is async, requiring careful effect ordering.
   - **Suggestion:** If localStorage is added for FOUC prevention (Critical Risk #1), it can also simplify ThemeContext: on mount, initialize `previewThemeId` from `localStorage.getItem('theme')` as the synchronous default instead of always defaulting to `'obsidian'`. This means the context immediately reflects the correct theme even before the profile effect fires, removing the gap window entirely.

2. **The `previewThemeId === savedThemeId` guard could be replaced by an explicit `isPreviewMode` flag**
   - **Current approach:** Uses state equality as a proxy for "user is mid-selection in Appearance screen".
   - **Suggestion:** Expose a `beginPreview() / cancelPreview()` API from ThemeContext instead of a raw `setPreviewThemeId`. `beginPreview(id)` sets an explicit `isPreviewActive` boolean + updates `previewThemeId`; `cancelPreview()` clears the flag and reverts. This makes the Appearance screen's intent explicit rather than inferred, and removes the stale-closure problem entirely (Critical Risk #2 mitigation becomes unnecessary).

---

### Summary

The plan is architecturally sound and spec-complete. The two issues that must be fixed before coding are: (1) the FOUC risk — the plan claims no-flash behavior but has no mechanism to deliver it; a 5-line localStorage + inline-script fix resolves this cleanly. (2) The stale-closure bug in the profile sync effect — subtle but real in StrictMode, with a straightforward ref-based fix. The IndexedDB `update()` silent no-op and DOM cleanup on sign-out are lower-severity but worth patching to avoid confusing future bugs. Patch these four items and the plan is ready to implement.
