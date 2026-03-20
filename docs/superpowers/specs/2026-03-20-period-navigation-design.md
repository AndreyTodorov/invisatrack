# Period Navigation — Design Spec

**Date:** 2026-03-20
**Feature:** Prev / Next navigation for Week and Month report tabs

---

## Overview

Allow users to navigate backwards (and forwards) through past weeks and months in the Reports view. The 7 Days and By Set tabs are unaffected.

---

## UI

A navigation row is inserted between the tab switcher and the chart, visible only when the `week` or `month` tab is active.

```
‹ Prev    |    Mar 10–16 / March 2026    |    [Today]  Next ›
```

### Button states

| Condition | Prev | Today | Next |
|---|---|---|---|
| Current period (`offset === 0`) | enabled | hidden | disabled |
| Past period (`offset > 0`) | enabled | visible | enabled |
| Earliest navigable period | disabled | visible | enabled |

### Date label format

- **Week:** `Mar 10–16` (same year as today) or `Mar 10–16, 2025` (different year). Year is determined by the **start date** of the week. For weeks spanning a year boundary (e.g. Dec 28–Jan 3), the start date's year is shown.
- **Month:** `March 2026`

---

## State

Add `offset: number` to `ReportsView` component state. Default: `0`.

- Reset to `0` whenever the active tab changes.
- Increment by 1 on Prev (going back), decrement by 1 on Next (going forward, towards current).

---

## Date range generation

Update `getDateRange` signature to `getDateRange(period: Exclude<Period, 'set'>, offset: number): string[]`.

- **`7d`**: `offset` is ignored — always returns the trailing 7 days from today. Callers pass `0`.
- **`week`**: compute Monday of the current week, then subtract `offset * 7` days to get the target Monday. Return that Monday through Sunday.
- **`month`**: subtract `offset` months from the current year/month. Return all days of the resulting month.

All existing call sites pass `offset` explicitly (or `0` for `7d`).

---

## Stats filter

The stats filter call site becomes:

```tsx
getDailyStatsRange(getDateRange(period, offset)).filter(s => {
  if (s.date > todayStr) return false
  return firstSessionDate !== null && s.date >= firstSessionDate
})
```

The `s.date > todayStr` guard continues to handle the current week/month correctly (suppresses future days). For past periods the entire range is in the past so it is vacuously satisfied.

---

## Disabled logic

### Prev button

Disabled when the current period already contains `firstSessionDate` — i.e., navigating back further would show a period entirely before any data.

Concretely:
- Compute `firstPeriodStart`: the Monday (for week) or the first day of the month (for month) that contains `firstSessionDate`.
- Compute `currentPeriodStart`: the Monday or month-start at the current `offset`.
- Disable Prev when `currentPeriodStart <= firstPeriodStart`.

This means the user can navigate *into* the period containing `firstSessionDate`, but not before it.

### Next button

Disabled when `offset === 0`.

### Today button

Rendered only when `offset > 0`. Clicking it sets `offset` to `0`.

---

## Empty state

When `stats.length === 0` for a navigated period, the message should reflect the specific period rather than "this week" / "this month". Use the computed date label:

- "No sessions recorded for Mar 10–16."
- "No sessions recorded for February 2026."

---

## WearChart label

`WearChart` currently renders a static `"Worn per day — this week"` / `"this month"` subtitle. When navigating, this label must reflect the actual period being shown.

Pass a `periodLabel: string` prop to `WearChart` (replacing the internally derived `periodLabel` constant). The parent computes and passes this label using the same formatted date string shown in the nav row.

---

## CalendarHeatmap

The heatmap shown in the month view displays all-time session history and is not period-specific. It remains unchanged regardless of navigation offset.

---

## Files affected

| File | Change |
|---|---|
| `src/views/ReportsView.tsx` | Add `offset` state; add nav row; update `getDateRange` signature and all call sites; compute and pass `periodLabel` to `WearChart`; update empty-state message |
| `src/components/reports/WearChart.tsx` | Replace internal `periodLabel` constant with a `periodLabel: string` prop |

---

## Out of scope

- Navigation for the `7d` tab — always shows the trailing 7 days from today.
- Navigation for the `By Set` tab — already navigates by aligner set.
