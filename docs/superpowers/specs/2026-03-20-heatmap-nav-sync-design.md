# Heatmap Navigation Sync — Design Spec

**Date:** 2026-03-20
**Feature:** Sync CalendarHeatmap navigation with the Month tab nav bar

---

## Overview

The Month report tab has a nav bar (Prev / date label / Next) and a CalendarHeatmap, each with independent navigation. This spec makes them share a single `offset` state so both sets of buttons control the same selected month.

---

## Current State

- `ReportsView` holds `offset: number` (0 = current period, positive = further back), used by the nav bar.
- `CalendarHeatmap` holds its own internal `offset` state with the opposite sign convention (0 = current month, negative = further back). Its `‹` button calls `setOffset(o => o - 1)`, its `›` button calls `setOffset(o => o + 1)`.
- The two are completely independent.

---

## Design

### Single source of truth

Remove the internal `offset` state from `CalendarHeatmap`. `ReportsView`'s `offset` becomes the single source of truth for both the nav bar and the heatmap.

### New props for `CalendarHeatmap`

| Prop | Type | Description |
|---|---|---|
| `offset` | `number` | Shared offset from `ReportsView` (positive = further back) |
| `onPrev` | `() => void` | Called when heatmap's `‹` button is clicked (go to earlier month) |
| `onNext` | `() => void` | Called when heatmap's `›` button is clicked (go to later month) |
| `isPrevDisabled` | `boolean` | Disables heatmap's `‹` button |

`isNextDisabled` is **not** a prop — the component computes it inline as `offset === 0` using the `offset` prop.

`ReportsView` passes these props as follows (same callbacks and flags already used by `NavRow`):

```tsx
<CalendarHeatmap
  ...existing props...
  offset={offset}
  onPrev={() => setOffset(o => o + 1)}
  onNext={() => setOffset(o => o - 1)}
  isPrevDisabled={isPrevDisabled}
/>
```

The existing `isPrevDisabled` calculation in `ReportsView` (based on `firstSessionDate` and `navPeriod`) needs no modification — `navPeriod` is always `'month'` when the heatmap is rendered, so the boundary check is already correct for months.

### Sign convention

The heatmap's existing `monthOffset(today, offset)` helper adds `offset` to the month number (negative = past). Since `ReportsView` uses positive = past, the heatmap calls `monthOffset(today, -offset)` to convert.

### Button wiring

| Button | Handler | Disabled condition |
|---|---|---|
| `‹` (go to earlier month) | `onPrev` prop | `isPrevDisabled` prop |
| `›` (go to later month) | `onNext` prop | `offset === 0` (computed inline from prop) |

The existing `isCurrentMonth` local variable inside `CalendarHeatmap` is redefined as `const isCurrentMonth = offset === 0` using the prop value. It continues to drive the `›` button's `disabled` attribute and styling (cursor/color) unchanged.

### Data

No data changes. The heatmap already receives all-time `dateStatsMap` and renders whichever month it is showing. Past months display correctly with existing data.

The heatmap is only rendered when `stats.length > 0`; the empty-state path is unaffected.

---

## Files affected

| File | Change |
|---|---|
| `src/components/dashboard/CalendarHeatmap.tsx` | Remove internal `offset` state; add `offset`, `onPrev`, `onNext`, `isPrevDisabled` props; call `monthOffset(today, -offset)`; wire buttons to props; redefine `isCurrentMonth` from prop |
| `src/views/ReportsView.tsx` | Pass `offset`, `onPrev`, `onNext`, `isPrevDisabled` to `<CalendarHeatmap>` |
