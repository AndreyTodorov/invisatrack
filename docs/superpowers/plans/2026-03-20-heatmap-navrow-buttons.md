# Heatmap NavRow Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CalendarHeatmap's simple `‹`/`›` icon nav with the same styled `NavRow` component used in the Month tab nav bar.

**Architecture:** Extract the `NavRow` function from `ReportsView.tsx` into `src/components/reports/NavRow.tsx`. Add an `onToday` prop to `CalendarHeatmap`. Import `NavRow` inside `CalendarHeatmap` and replace the existing icon-button div. Pass `onToday={() => setOffset(0)}` from `ReportsView`.

**Tech Stack:** React, TypeScript

---

## File Map

| File | Change |
|---|---|
| `src/components/reports/NavRow.tsx` | **Create** — move `NavRow` function here with default export |
| `src/views/ReportsView.tsx` | Import `NavRow` from new path; add `onToday` prop to `<CalendarHeatmap>` |
| `src/components/dashboard/CalendarHeatmap.tsx` | Add `onToday` prop; import `NavRow`; replace icon nav div; remove `isCurrentMonth` |

---

## Task 1: Extract NavRow to shared component

**Files:**
- Create: `src/components/reports/NavRow.tsx`
- Modify: `src/views/ReportsView.tsx`

- [ ] **Step 1.1: Create `src/components/reports/NavRow.tsx`**

Create the file with the `NavRow` component moved verbatim from `ReportsView.tsx` lines 110–179:

```tsx
export default function NavRow({
  label,
  isPrevDisabled,
  isNextDisabled,
  showToday,
  onPrev,
  onNext,
  onToday,
}: {
  label: string
  isPrevDisabled: boolean
  isNextDisabled: boolean
  showToday: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const btnBase: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'opacity 0.15s',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase,
    color: 'var(--cyan)',
    borderColor: 'var(--cyan)',
  }
  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor: 'default',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button
        style={isPrevDisabled ? btnDisabled : btnBase}
        disabled={isPrevDisabled}
        onClick={onPrev}
      >
        ‹ Prev
      </button>

      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {showToday && (
          <button style={btnActive} onClick={onToday}>
            Today
          </button>
        )}
        <button
          style={isNextDisabled ? btnDisabled : btnBase}
          disabled={isNextDisabled}
          onClick={onNext}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 1.2: Update `ReportsView.tsx` — replace inline `NavRow` with import**

In `src/views/ReportsView.tsx`:

Remove the `function NavRow(...)` definition (lines 110–179).

Add this import after the existing imports:

```tsx
import NavRow from '../components/reports/NavRow'
```

- [ ] **Step 1.3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

## Task 2: Add `onToday` to CalendarHeatmap and replace icon nav

**Files:**
- Modify: `src/components/dashboard/CalendarHeatmap.tsx`
- Modify: `src/views/ReportsView.tsx`

- [ ] **Step 2.1: Add `onToday` prop to `CalendarHeatmap` interface**

In `src/components/dashboard/CalendarHeatmap.tsx`, update `interface Props` to add `onToday`:

```tsx
interface Props {
  dateStatsMap: Map<string, DailyStats>
  sessionDates: Set<string>
  goalMinutes: number
  today: string
  offset: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  isPrevDisabled: boolean
}
```

- [ ] **Step 2.2: Update function signature to destructure `onToday`**

Replace:

```tsx
export default function CalendarHeatmap({ dateStatsMap, sessionDates, goalMinutes, today, offset, onPrev, onNext, isPrevDisabled }: Props) {
```

With:

```tsx
export default function CalendarHeatmap({ dateStatsMap, sessionDates, goalMinutes, today, offset, onPrev, onNext, onToday, isPrevDisabled }: Props) {
```

- [ ] **Step 2.3: Import `NavRow` inside `CalendarHeatmap`**

Add this import at the top of `src/components/dashboard/CalendarHeatmap.tsx` (after existing imports):

```tsx
import NavRow from '../../components/reports/NavRow'
```

- [ ] **Step 2.4: Replace the icon nav div with `<NavRow>` and remove `isCurrentMonth`**

Remove the line:

```tsx
const isCurrentMonth = offset === 0
```

Replace the month navigation div (inside `{expanded && (...)}`) — the entire div from `{/* Month navigation */}` through its closing `</div>`:

```tsx
{/* Month navigation */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <button
    onClick={onPrev}
    disabled={isPrevDisabled}
    style={{
      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 18, color: 'var(--text-muted)', lineHeight: 1,
      padding: '10px 16px', margin: '-10px -16px',
    }}
  >
    ‹
  </button>
  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
  <button
    onClick={onNext}
    disabled={isCurrentMonth}
    style={{
      background: 'none', border: 'none', cursor: isCurrentMonth ? 'default' : 'pointer',
      fontFamily: 'inherit', fontSize: 18,
      color: isCurrentMonth ? 'var(--surface-3)' : 'var(--text-muted)',
      lineHeight: 1, padding: '10px 16px', margin: '-10px -16px',
    }}
  >
    ›
  </button>
</div>
```

With:

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

- [ ] **Step 2.5: Pass `onToday` from `ReportsView`**

In `src/views/ReportsView.tsx`, find the `<CalendarHeatmap>` render and add `onToday`:

```tsx
<CalendarHeatmap
  dateStatsMap={dateStatsMap}
  sessionDates={sessionDates}
  goalMinutes={goalMinutes}
  today={todayStr}
  offset={offset}
  onPrev={() => setOffset(o => o + 1)}
  onNext={() => setOffset(o => o - 1)}
  onToday={() => setOffset(0)}
  isPrevDisabled={isPrevDisabled}
/>
```

- [ ] **Step 2.6: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 2.7: Run tests**

```bash
npm test
```

Expected: all tests pass.

Note: do NOT commit — user will commit manually.
