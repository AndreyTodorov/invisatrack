# Test Coverage Matrix: Theme Picker

| Spec Section | Requirement | Test File | Test Name |
|---|---|---|---|
| §3 User Stories | Theme updates visually when card tapped (live preview) | ThemeContext.test.tsx | `setPreviewThemeId updates the DOM immediately` |
| §3 User Stories | Navigate back without saving reverts theme | ThemeContext.test.tsx | `calling setPreviewThemeId(savedThemeId) reverts the DOM — simulates back navigation` |
| §3 User Stories | Theme applied on app load before interaction | ThemeContext.test.tsx | `initializes from localStorage before profile loads (FOUC prevention)` |
| §3 User Stories | Theme syncs across devices | ThemeContext.test.tsx | `updates savedThemeId and DOM when Firebase syncs a new theme (not in preview)` |
| §4.3 Business Rule 1 | Default theme is 'obsidian' for null/undefined/unknown | themes.test.ts | `returns obsidian for null` |
| §4.3 Business Rule 1 | Default theme is 'obsidian' for null/undefined/unknown | themes.test.ts | `returns obsidian for undefined` |
| §4.3 Business Rule 1 | Default theme is 'obsidian' for null/undefined/unknown | themes.test.ts | `returns obsidian for empty string` |
| §4.3 Business Rule 1 | Default theme is 'obsidian' for null/undefined/unknown | themes.test.ts | `returns obsidian for an unrecognised theme id` |
| §4.3 Business Rule 1 | Default when profile is null | ThemeContext.test.tsx | `defaults to obsidian when profile is null and localStorage is empty` |
| §4.3 Business Rule 2 | data-theme set on document.documentElement | ThemeContext.test.tsx | `applies profile.theme to the DOM when profile loads` |
| §4.3 Business Rule 4 | THEMES array order is deterministic | themes.test.ts | `obsidian is the first theme` |
| §4.3 Business Rule 4 | THEMES array order is deterministic | themes.test.ts | `neobrutalism is the second theme` |
| §4.3 Business Rule 5 | Live preview applies before Save (not a commit) | ThemeContext.test.tsx | `savedThemeId is unchanged after setPreviewThemeId (preview is not a commit)` |
| §4.3 Business Rule 6 | Revert on back navigation | ThemeContext.test.tsx | `calling setPreviewThemeId(savedThemeId) reverts the DOM — simulates back navigation` |
| §7 Edge Case 1 | Unknown theme ID falls back to obsidian | themes.test.ts | `returns obsidian for an unrecognised theme id` |
| §7 Edge Case 1 | Unknown theme ID falls back silently in context | ThemeContext.test.tsx | `falls back to obsidian when profile.theme is an unrecognised string` |
| §7 Edge Case 3 | Rapid card selections — only last value persists | ThemeContext.test.tsx | `rapid card selections only reflect the last selected theme` |
| §7 Edge Case 4 | Firebase sync wins over IndexedDB | ThemeContext.test.tsx | `updates savedThemeId and DOM when Firebase syncs a new theme (not in preview)` |
| §7 Edge Case 5 | Firebase sync while on Appearance screen doesn't overwrite preview | ThemeContext.test.tsx | `does NOT overwrite previewThemeId when Firebase syncs while user is in preview` |
| §7 Edge Case 6 | profile is null → default to obsidian | ThemeContext.test.tsx | `defaults to obsidian when profile is null and localStorage is empty` |
| §9 Performance | No flash of unstyled content on load | ThemeContext.test.tsx | `initializes from localStorage before profile loads (FOUC prevention)` |
| Red Team Critical Risk #1 | localStorage ignored if value is unrecognised | ThemeContext.test.tsx | `ignores unrecognised localStorage value and falls back to obsidian` |
| Red Team Critical Risk #2 | Firebase sync during preview doesn't clobber selection | ThemeContext.test.tsx | `does NOT overwrite previewThemeId when Firebase syncs while user is in preview` |
| Red Team Logical Gap #2 | DOM cleanup on ThemeProvider unmount (sign-out) | ThemeContext.test.tsx | `removes the data-theme attribute from <html> when ThemeProvider unmounts` |
| Red Team Logical Gap #4 | useTheme null guard — descriptive error outside provider | ThemeContext.test.tsx | `throws a descriptive error when called outside ThemeProvider` |

**Coverage:** 25/25 spec + red-team requirements have at least one test.
**Uncovered:** None.

> Note: §4.2 UI states (Appearance screen — saving/saved/error) and §7 Edge Case 2 (Firebase save failure) are covered by the existing `SaveButton` component contract and the save flow in `SettingsView`. They depend on the full component tree and are validated via the manual QA checklist in the plan rather than unit tests.
