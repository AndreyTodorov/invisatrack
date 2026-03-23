# Test Suite: Theme Picker

## Files

| File | Phase | What it tests |
|---|---|---|
| `src/themes.test.ts` | Phase 1 | `resolveTheme()`, `THEMES` array integrity, `DEFAULT_THEME_ID` |
| `src/contexts/ThemeContext.test.tsx` | Phase 2 | DOM application, localStorage init, live preview, Firebase sync, cleanup, null guard |

## Run Commands

**Full theme-picker suite:**
```bash
npm test -- --reporter=verbose src/themes.test.ts src/contexts/ThemeContext.test.tsx
```

**Phase 1 only (pure logic):**
```bash
npm test -- src/themes.test.ts
```

**Phase 2 only (context behaviour):**
```bash
npm test -- src/contexts/ThemeContext.test.tsx
```

**All project tests (including theme-picker):**
```bash
npm test
```

**With coverage:**
```bash
npm run test:coverage -- src/themes.ts src/contexts/ThemeContext.tsx
```

## Expected Behavior

**Before any implementation (right now):**
- Both files fail with `Cannot find module` — correct, this is TDD.

**After Phase 1 (`src/themes.ts` created):**
- `src/themes.test.ts` — all 14 tests pass.
- `src/contexts/ThemeContext.test.tsx` — still fails (`Cannot find module './ThemeContext'`).

**After Phase 2 (`src/contexts/ThemeContext.tsx` created and wired into `App.tsx`):**
- Both files pass — all 25 tests green.

**A passing run looks like:**
```
✓ src/themes.test.ts (14 tests)
✓ src/contexts/ThemeContext.test.tsx (16 tests)

Test Files  2 passed (2)
Tests       30 passed (30)
```

## Prerequisites

No additional setup needed. The project already has:
- Vitest configured with jsdom (`vitest.config.ts`)
- `@testing-library/react` and `@testing-library/jest-dom` installed
- `localStorage` globally mocked in `src/test-setup.ts`
