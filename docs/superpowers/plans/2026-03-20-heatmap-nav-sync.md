# Heatmap Navigation Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the CalendarHeatmap's `‹`/`›` buttons with the Month tab nav bar so both control the same shared `offset` state.

**Architecture:** Lift `CalendarHeatmap`'s internal `offset` state up to `ReportsView`. Pass `offset`, `onPrev`, `onNext`, and `isPrevDisabled` as props. The heatmap's existing `monthOffset` helper is called with `-offset` to convert sign conventions. Both the nav bar and heatmap buttons call the same handlers.

**Tech Stack:** React, TypeScript, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/components/dashboard/CalendarHeatmap.tsx` | Remove internal `offset` state; add 4 props; negate offset when calling `monthOffset`; wire buttons to props |
| `src/views/ReportsView.tsx` | Pass `offset`, `onPrev`, `onNext`, `isPrevDisabled` to `<CalendarHeatmap>` |

---

## Task 1: Make CalendarHeatmap controlled and wire ReportsView

**Files:**
- Modify: `src/components/dashboard/CalendarHeatmap.tsx`
- Modify: `src/views/ReportsView.tsx`

### Background

`CalendarHeatmap` currently manages its own `offset` state (0 = current month, negative = past). `ReportsView` manages its own `offset` (0 = current, positive = past). They must share state.

Key sign difference: `monthOffset(today, offset)` adds `offset` to the month number, so it expects negative for past. `ReportsView`'s offset is positive for past. Solution: call `monthOffset(today, -offset)` inside the heatmap.

### Current `CalendarHeatmap` props interface

```tsx
interface Props {
  dateStatsMap: Map<string, DailyStats>
  sessionDates: Set<string>
  goalMinutes: number
  today: string
}
```

### Current internal state (to remove)

```tsx
const [offset, setOffset] = useState(0) // 0 = current month, -1 = prev, etc.
```

### Current button wiring (to replace)

```tsx
// ‹ button:
onClick={() => setOffset(o => o - 1)}

// › button:
onClick={() => setOffset(o => o + 1)}
disabled={isCurrentMonth}
```

---

- [ ] **Step 1.1: Update `CalendarHeatmap` props interface**

In `src/components/dashboard/CalendarHeatmap.tsx`, replace:

```tsx
interface Props {
  dateStatsMap: Map<string, DailyStats>
  sessionDates: Set<string>
  goalMinutes: number
  today: string
}
```

With:

```tsx
interface Props {
  dateStatsMap: Map<string, DailyStats>
  sessionDates: Set<string>
  goalMinutes: number
  today: string
  offset: number
  onPrev: () => void
  onNext: () => void
  isPrevDisabled: boolean
}
```

- [ ] **Step 1.2: Update the function signature and remove internal state**

Replace:

```tsx
export default function CalendarHeatmap({ dateStatsMap, sessionDates, goalMinutes, today }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [offset, setOffset] = useState(0) // 0 = current month, -1 = prev, etc.
```

With:

```tsx
export default function CalendarHeatmap({ dateStatsMap, sessionDates, goalMinutes, today, offset, onPrev, onNext, isPrevDisabled }: Props) {
  const [expanded, setExpanded] = useState(true)
```

- [ ] **Step 1.3: Fix the `monthOffset` call to negate the offset**

Find:

```tsx
const { year, month } = monthOffset(today, offset)
```

Replace with:

```tsx
const { year, month } = monthOffset(today, -offset)
```

- [ ] **Step 1.4: Redefine `isCurrentMonth` from prop and wire buttons**

Find:

```tsx
const isCurrentMonth = offset === 0
```

This line stays the same expression — `offset` is now the prop, and `offset === 0` still means "current month". No change needed to this line.

Find the `‹` button `onClick`:

```tsx
onClick={() => setOffset(o => o - 1)}
```

Replace with:

```tsx
onClick={onPrev}
disabled={isPrevDisabled}
```

Also remove the existing `cursor` style from the `‹` button if it was hardcoded; let the browser default handle it, or mirror the `›` button's pattern.

Find the `›` button `onClick`:

```tsx
onClick={() => setOffset(o => o + 1)}
```

Replace with:

```tsx
onClick={onNext}
```

The `›` button's `disabled={isCurrentMonth}` and styling remain unchanged.

- [ ] **Step 1.5: Pass the new props from `ReportsView`**

In `src/views/ReportsView.tsx`, find the `<CalendarHeatmap>` render (inside the `period === 'month'` block):

```tsx
return (
  <CalendarHeatmap
    dateStatsMap={dateStatsMap}
    sessionDates={sessionDates}
    goalMinutes={goalMinutes}
    today={todayStr}
  />
)
```

Replace with:

```tsx
return (
  <CalendarHeatmap
    dateStatsMap={dateStatsMap}
    sessionDates={sessionDates}
    goalMinutes={goalMinutes}
    today={todayStr}
    offset={offset}
    onPrev={() => setOffset(o => o + 1)}
    onNext={() => setOffset(o => o - 1)}
    isPrevDisabled={isPrevDisabled}
  />
)
```

- [ ] **Step 1.6: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean (no errors).

- [ ] **Step 1.7: Run tests**

```bash
npm test
```

Expected: all 128 tests pass.

- [ ] **Step 1.8: Verify visually**

```bash
npm run dev
```

Open the Reports view, switch to Month tab. Confirm:
- Nav bar Prev/Next and heatmap `‹`/`›` both change the displayed month in sync.
- The date label in the nav bar and the month label inside the heatmap always match.
- `‹` in both places is disabled at the earliest month (first session date).
- `›` in both places is disabled on the current month.
- Switching to another tab and back resets both to the current month.

Note: do NOT commit — user will commit manually.
