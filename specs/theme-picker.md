# Feature Spec: Theme Picker

**Date:** 2026-03-23
**Stack:** React 19 + TypeScript + Tailwind CSS v4 + Firebase Realtime DB + Dexie (IndexedDB) + Vite PWA

---

## 1. Overview

Users can choose an app-wide visual theme from a curated set of predefined themes. The initial release ships two themes — **Obsidian** (the current dark look) and **Neobrutalism** (light cream background, thick black borders, flat saturated accents). The architecture supports adding more themes by extending a single definitions file and adding a CSS block — no component changes required.

---

## 2. Glossary

**Theme** — A named set of CSS custom property overrides that changes the app's visual appearance globally. Themes are purely cosmetic; they do not affect data, logic, or layout structure.

**Obsidian** — The existing default dark theme (currently hardcoded in `:root`). Its CSS variable values become the default/fallback, with no `data-theme` attribute required.

**Neobrutalism** — A light theme with a cream background, solid black borders, flat color fills, and high-contrast saturated accents (electric blue, yellow, red).

**ThemeContext** — A new React context that reads the saved theme from the user's profile, applies it to the DOM, and exposes the current theme + a setter for the Appearance settings section.

**Theme ID** — A string literal that identifies a theme (e.g. `'obsidian'`, `'neobrutalism'`). Stored in Firebase and IndexedDB as `UserProfile.theme`.

**Live preview** — When the user selects a theme card in the Appearance screen, the `data-theme` attribute updates immediately so they can see the result before committing. If they navigate back without saving, the DOM reverts to the last saved theme.

---

## 3. User Stories

**Primary flow:**
- As a user, I want to open Settings → Appearance and see my available themes displayed as visual cards, so I can pick the one that appeals to me.
- As a user, I want the theme to update visually the moment I tap a card, so I can evaluate it before saving.
- As a user, I want to tap Save to persist my chosen theme, so it is applied the next time I open the app (on any device).

**Alternate flows:**
- As a user, if I select a different theme but then navigate back without saving, I want the app to revert to my previously saved theme, so I'm not stuck with an accidental change.
- As a returning user, I want my chosen theme to be applied immediately on app load (before any interaction), so I never see a flash of the default theme.
- As a user on a second device, I want my theme preference to sync automatically, so I don't have to set it again.

---

## 4. Functional Requirements

### 4.1 User Flows

**Selecting and saving a theme:**
1. User opens Settings (the main list screen).
2. User taps the "Appearance" nav row.
3. The Appearance detail screen slides in (push animation, same as other detail screens).
4. User sees a grid of theme cards; the currently saved theme has a visual "selected" indicator.
5. User taps a different theme card — the entire app updates immediately (live preview via `data-theme`).
6. An "Unsaved changes" label and the Save button become active.
7. User taps "Save Appearance" — the theme is written to Firebase + IndexedDB.
8. The Save button shows "Saved ✓" for 2 seconds, then returns to idle/disabled.

**Discarding a theme change:**
1. User follows steps 1–5 above (selects a theme, sees live preview).
2. User taps the "← Settings" back button or swipes from the left edge without saving.
3. The DOM `data-theme` reverts to the previously saved theme.
4. No change is written to Firebase or IndexedDB.

**App startup:**
1. `ThemeContext` reads `profile.theme` from IndexedDB (fast, synchronous-ish).
2. Sets `document.documentElement.dataset.theme` before first paint.
3. When Firebase profile loads (may differ if changed on another device), updates the attribute and writes to IndexedDB if the value changed.

### 4.2 UI States

**Appearance screen — default (no change):**
- Grid of theme cards. Active theme card has a colored border/checkmark overlay.
- Save button is disabled (grayed out), no "Unsaved changes" label.

**Appearance screen — theme selected (dirty):**
- New card appears selected; previous card loses selection.
- "Unsaved changes" label appears above the Save button (amber, same as other settings screens).
- Save button is active (cyan background).

**Appearance screen — saving:**
- Save button shows "Saving…", disabled.

**Appearance screen — saved:**
- Save button shows "Saved ✓" (green background), disabled. Reverts to idle after 2 seconds.

**Appearance screen — error:**
- Save button shows label in rose color. Reverts to idle after 3 seconds. No change to saved state.

**Theme card:**
- Each card shows: color swatch strip (3 colors sampled from the theme), theme name below.
- Selected state: card gets a 2px cyan border + a small checkmark badge in the top-right corner.
- Cards are arranged in a responsive 2-column grid.

### 4.3 Business Rules

1. The default theme is `'obsidian'`. If `profile.theme` is `null`, `undefined`, or an unrecognised string, fall back to `'obsidian'`.
2. The `data-theme` attribute is set on `document.documentElement` (the `<html>` element).
3. For `theme === 'obsidian'` (the default), the `data-theme` attribute is either omitted or set to `'obsidian'` — both produce identical CSS output since `:root` already defines the default values.
4. Theme cards must display in a deterministic order defined by the `THEMES` array in `src/themes.ts`.
5. The live preview (step 5 of the primary flow) must apply before the Save button is tapped — it is a preview, not a commit.
6. Navigating away from the Appearance section without saving must revert the live preview. This revert happens in a `useEffect` cleanup or in the back-navigation handler.

---

## 5. Technical Architecture

### 5.1 Data Model

**`UserProfile` — add one field** (`src/types/index.ts`):

```ts
export interface UserProfile {
  // ... existing fields ...
  theme: string  // Theme ID; defaults to 'obsidian' if absent
}
```

**Firebase path:** `users/${uid}/profile/theme` (string scalar — partial `update()` call, same as other profile saves).

**IndexedDB:** No schema version bump needed. Dexie stores the full `LocalProfile` object; the new `theme` field is written as part of the existing `profile.update(uid, { theme })` call pattern.

### 5.2 Theme Definitions

**New file: `src/themes.ts`**

```ts
export interface ThemeDefinition {
  id: string
  name: string
  swatchColors: [string, string, string]  // bg, accent, text — for card preview
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    swatchColors: ['#060913', '#22D3EE', '#E8EEFF'],
  },
  {
    id: 'neobrutalism',
    name: 'Neobrutalism',
    swatchColors: ['#FFFBF0', '#0066FF', '#0A0A0A'],
  },
  // Future themes added here — no component changes required
]

export const DEFAULT_THEME_ID = 'obsidian'

export function resolveTheme(id: string | undefined | null): string {
  return THEMES.find(t => t.id === id) ? id! : DEFAULT_THEME_ID
}
```

### 5.3 CSS Theme Variables

**File: `src/index.css`**

The existing `:root` block remains unchanged (it is the Obsidian theme). Add a new attribute selector block immediately after:

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

All future themes follow this same pattern — one CSS block per theme, no component code changes.

### 5.4 ThemeContext

**New file: `src/contexts/ThemeContext.tsx`**

```ts
interface ThemeContextValue {
  themeId: string                    // currently applied (saved) theme
  previewThemeId: string             // live preview (may differ from saved)
  setPreviewThemeId: (id: string) => void
  savedThemeId: string               // last persisted value
}
```

**Responsibilities:**
- On mount, read `profile.theme` (from `DataContext`) and set `document.documentElement.dataset.theme`.
- When `profile.theme` changes (e.g. Firebase sync from another device), update the DOM and the saved theme in context.
- Expose `previewThemeId` + `setPreviewThemeId` for the Appearance settings screen to drive live preview without committing.
- When the Appearance screen exits without saving, calling `setPreviewThemeId(savedThemeId)` reverts the DOM.

**DOM effect:**
```ts
useEffect(() => {
  document.documentElement.dataset.theme = previewThemeId
}, [previewThemeId])
```

### 5.5 API / Route Contracts

No new API routes. The existing Firebase `update()` pattern is reused:

```ts
await update(ref(db, `users/${uid}/profile`), { theme: selectedThemeId })
await localDB.profile.update(uid, { theme: selectedThemeId })
```

### 5.6 Service / Logic Layer

**`ThemeContext`** — applies theme to DOM, bridges saved vs. preview state.

**Appearance section in `SettingsView`** — reads `previewThemeId` / `setPreviewThemeId` from `ThemeContext`, calls Firebase + IndexedDB on save, reverts preview on back navigation.

**`resolveTheme()`** in `src/themes.ts` — pure function, used in `ThemeContext` to guard against unknown theme IDs in stored data.

### 5.7 Integration Points

| File | Change |
|---|---|
| `src/types/index.ts` | Add `theme: string` to `UserProfile` |
| `src/themes.ts` | **New** — theme definitions, `THEMES` array, `resolveTheme()` |
| `src/index.css` | Add `[data-theme="neobrutalism"]` CSS block after `:root` |
| `src/contexts/ThemeContext.tsx` | **New** — `ThemeProvider` + `useTheme` hook |
| `src/App.tsx` | Wrap `DataProvider` children with `ThemeProvider` |
| `src/views/SettingsView.tsx` | Add `'appearance'` to `Section` type, new nav row, new Appearance detail section |

---

## 6. Non-Goals

- No light/dark system preference detection (`prefers-color-scheme`) — theme is always user-chosen.
- No per-component theme customization — themes are global CSS variable overrides only.
- No shadow/box-shadow differences between themes — structural component changes are out of scope.
- No border-radius overrides between themes — all themes use the existing component border-radius values.
- No font changes between themes — Outfit remains the app font for all themes.
- No theme preview on the main Settings list row — the summary text shows the theme name only (e.g. "Neobrutalism").
- No animated transition between themes (e.g. cross-fade) — instant switch on `data-theme` change.
- Themes beyond Obsidian and Neobrutalism are out of scope for this release, though the architecture supports them.

---

## 7. Edge Cases & Error Handling

- **What if:** `profile.theme` contains an unrecognised string (e.g. from a future theme that was later removed).
  **Then:** `resolveTheme()` falls back to `'obsidian'`. The DOM applies the Obsidian theme silently.

- **What if:** The user selects a theme and the Firebase save fails.
  **Then:** The Save button enters the `'error'` state and reverts to idle after 3 seconds. The live preview remains on the selected theme (user is still in the Appearance screen). The IndexedDB is not written. The previously saved theme value is unchanged.

- **What if:** The user switches themes rapidly between cards before saving.
  **Then:** Each tap updates `previewThemeId` immediately; only the state at the time of Save is persisted.

- **What if:** Firebase returns a different theme than IndexedDB (e.g. the user changed theme on another device).
  **Then:** The Firebase value wins. `ThemeContext` updates both the DOM and the IndexedDB local record when the Firebase subscription fires.

- **What if:** The user is on the Appearance screen when a Firebase sync arrives with a different theme.
  **Then:** The `savedThemeId` in `ThemeContext` updates, but `previewThemeId` (which drives the DOM) is not overwritten — the user's in-progress selection is preserved. The revert-on-back will now revert to the newly synced value.

- **What if:** `profile` is null (user not yet loaded).
  **Then:** `ThemeContext` applies `'obsidian'` as default until `profile` loads.

---

## 8. Security Considerations

- The `theme` value written to Firebase is a plain string. Sanitize by validating against the `THEMES` array before writing (use `resolveTheme()` prior to the `update()` call to prevent arbitrary strings from being persisted).
- `data-theme` is set as a dataset attribute on `<html>`, not injected into CSS `style` tags — no XSS vector.
- No new Firebase security rule changes are needed; `theme` is written under `users/${uid}/profile`, which is already user-scoped.

---

## 9. Performance Considerations

- Theme is applied from IndexedDB on app load (before Firebase response), so there is no layout shift or flash of unstyled content in the common case.
- CSS variable overrides are zero-JS-cost at render time — the browser resolves them natively.
- The `data-theme` DOM write triggers a CSS recalculation across all elements. This is a one-time cost on theme change, not on every render. Acceptable for an infrequent user action.
- The `THEMES` array and `resolveTheme` are tiny — no lazy-loading needed.

---

## 10. Success Metrics

**Manual QA checkpoints:**
- [ ] Open the app on a fresh load — correct theme is applied with no flash of the default theme.
- [ ] Navigate to Settings → Appearance — the currently saved theme card has the selected indicator.
- [ ] Tap a different theme card — the entire app (background, cards, buttons, text) updates immediately.
- [ ] Tap Save — Firebase and IndexedDB reflect the new theme; Save button shows "Saved ✓".
- [ ] Hard-refresh the app — the saved theme is applied on load.
- [ ] Navigate back without saving — the app reverts to the previously saved theme.
- [ ] Change theme on Device A — open app on Device B — theme syncs correctly.
- [ ] Corrupt the `theme` value in Firebase to an unknown string — app falls back to Obsidian silently.

**Key automated test scenarios:**
- `resolveTheme()` returns `'obsidian'` for `null`, `undefined`, `''`, and unknown strings.
- `resolveTheme()` returns the input for all valid theme IDs.
- `ThemeContext` sets `document.documentElement.dataset.theme` to the profile's theme on mount.
- `ThemeContext` reverts `previewThemeId` to `savedThemeId` when explicitly called (back navigation).

**Definition of Done:**
- [ ] `UserProfile.theme` field is typed, stored, and synced (Firebase + IndexedDB).
- [ ] `ThemeContext` is in place and wired into `App.tsx`.
- [ ] Obsidian and Neobrutalism CSS blocks are defined and visually correct.
- [ ] Appearance settings section is reachable via Settings and follows the existing push/pop nav pattern.
- [ ] Theme cards render with correct swatches and selection state.
- [ ] Save flow uses the existing `SaveButton` component with the standard saving/saved/error states.
- [ ] Live preview reverts on back navigation without save.
- [ ] No flash of default theme on app load when a non-default theme is saved.
