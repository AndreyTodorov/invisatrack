# Heatmap NavRow Buttons — Design Spec

**Date:** 2026-03-20
**Feature:** Replace CalendarHeatmap's simple `‹`/`›` icon buttons with the same styled NavRow buttons used in the Month tab nav bar.

---

## Overview

The Month tab has a `NavRow` (‹ Prev / date label / [Today] Next ›) and a `CalendarHeatmap` with its own simple icon nav. This spec replaces the heatmap's icon nav with the same `NavRow` component, giving both sections a consistent look and feel.

---

## Current state of `CalendarHeatmap` nav row (to be replaced)

The heatmap's month navigation is inside the `{expanded && (...)}` block. After the previous heatmap-nav-sync change, the buttons already call `onPrev`/`onNext` props (not internal state):

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <button onClick={onPrev} disabled={isPrevDisabled} style={{ background: 'none', border: 'none', ... }}>‹</button>
  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
  <button onClick={onNext} disabled={isCurrentMonth} style={{ ... }}>›</button>
</div>
```

This entire div is replaced with `<NavRow>`.

---

## Changes

### 1. Extract `NavRow` to a shared component

Move the `NavRow` function from `src/views/ReportsView.tsx` into a new file `src/components/reports/NavRow.tsx` with a default export. Update `ReportsView.tsx` to import it from there.

### 2. Add `onToday` prop to `CalendarHeatmap`

`CalendarHeatmap` already receives `offset`, `onPrev`, `onNext`, `isPrevDisabled` (from the previous sync change). Add one more prop: `onToday: () => void`. The existing `onPrev` and `onNext` props are forwarded unchanged to `NavRow` — no new computation needed inside the heatmap.

### 3. Replace heatmap icon nav with `<NavRow>`

Inside `CalendarHeatmap`, import `NavRow` from `../../components/reports/NavRow` (cross-directory import from `dashboard` to `reports`). Replace the existing month navigation div with:

```tsx
<NavRow
  label={label}
  isPrevDisabled={isPrevDisabled}
  isNextDisabled={offset === 0}
  showToday={offset > 0}
  onPrev={onPrev}
  onNext={onNext}
  onToday={onToday}
/>
```

`label` is the heatmap's already-computed month string (e.g. "March 2026"). `isPrevDisabled` is the prop passed from `ReportsView` — no re-computation needed inside the heatmap. `isNextDisabled={offset === 0}` uses the prop `offset` directly.

Remove the now-dead `const isCurrentMonth = offset === 0` local variable — it is no longer referenced after the nav row is replaced.

### 4. Pass `onToday` from `ReportsView`

In `ReportsView.tsx`, add `onToday={() => setOffset(0)}` to the `<CalendarHeatmap>` render — the same value already passed to the nav bar's `<NavRow>`.

### 5. Collapse behaviour

The `NavRow` inside the heatmap lives inside the `{expanded && (...)}` block, so it hides when the heatmap is collapsed. This is intentional — the top nav bar (always visible) handles navigation while the heatmap is collapsed.

---

## Files affected

| File | Change |
|---|---|
| `src/components/reports/NavRow.tsx` | New — exported `NavRow` component moved from `ReportsView.tsx` |
| `src/views/ReportsView.tsx` | Import `NavRow` from new path; add `onToday` to `<CalendarHeatmap>` |
| `src/components/dashboard/CalendarHeatmap.tsx` | Add `onToday` prop; import `NavRow`; replace icon nav div; remove `isCurrentMonth` |
