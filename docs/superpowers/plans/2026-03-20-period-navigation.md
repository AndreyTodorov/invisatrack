# Period Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prev / Next navigation to the Week and Month report tabs so users can browse past periods.

**Architecture:** `offset: number` state (0 = current period) is added to `ReportsView`. `getDateRange` gains an `offset` parameter. A nav row renders between the tab switcher and the chart for `week`/`month` tabs only. `WearChart` receives a `periodLabel` prop instead of deriving it internally.

**Tech Stack:** React, TypeScript, Vitest + @testing-library/react

---

## File Map

| File | What changes |
|---|---|
| `src/views/ReportsView.tsx` | Add `offset` state; update `getDateRange(period, offset)`; add `NavRow` component; update stats filter; pass `periodLabel` to `WearChart`; update empty-state message |
| `src/components/reports/WearChart.tsx` | Replace internal `periodLabel` constant with `periodLabel: string` prop |

No new files are created.

---

## Task 1: Update `getDateRange` to accept an offset

**Files:**
- Modify: `src/views/ReportsView.tsx`

The function currently lives at the top of `ReportsView.tsx`. It must accept a second parameter `offset: number`. The `7d` branch ignores it. The `week` branch subtracts `offset * 7` days from Monday. The `month` branch subtracts `offset` months.

- [ ] **Step 1.1: Write the failing test**

Open `src/views/ReportsView.tsx` and note the current signature: `getDateRange(period)`. There are no unit tests for this function because it is module-private. We'll test it indirectly via the rendered output in Task 3. Skip ahead — no test to write here.

- [ ] **Step 1.2: Update the function signature and body**

Replace the entire `getDateRange` function in `src/views/ReportsView.tsx`:

```tsx
function getDateRange(period: Exclude<Period, 'set'>, offset: number): string[] {
  const todayStr = getTodayLocal()
  const today = new Date(todayStr + 'T00:00:00')
  const dates: string[] = []

  if (period === '7d') {
    // offset ignored for 7d — always trailing 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(d.toLocaleDateString('sv'))
    }
  } else if (period === 'week') {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((day + 6) % 7) - offset * 7)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toLocaleDateString('sv'))
    }
  } else {
    // month
    const totalMonths = today.getFullYear() * 12 + today.getMonth() - offset
    const year = Math.floor(totalMonths / 12)
    const month = totalMonths % 12
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      dates.push(d.toLocaleDateString('sv'))
    }
  }
  return dates
}
```

- [ ] **Step 1.3: Update the stats filter call site**

Find the existing stats computation (around line 145):

```tsx
const stats = period !== 'set'
  ? getDailyStatsRange(getDateRange(period)).filter(s => {
      if (s.date > todayStr) return false
      if (period === '7d') return s.removals > 0
      return firstSessionDate !== null && s.date >= firstSessionDate
    })
  : []
```

Replace with:

```tsx
const stats = period !== 'set'
  ? getDailyStatsRange(getDateRange(period, offset)).filter(s => {
      if (s.date > todayStr) return false
      return firstSessionDate !== null && s.date >= firstSessionDate
    })
  : []
```

Note: `offset` doesn't exist yet — that's fine, TypeScript will error and we'll add it in Task 2.

- [ ] **Step 1.4: Run the build to confirm the shape of errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about `offset` not being defined (we add state in Task 2).

---

## Task 2: Add `offset` state and compute nav helpers

**Files:**
- Modify: `src/views/ReportsView.tsx`

- [ ] **Step 2.1: Add `offset` state**

Inside `ReportsView`, find the existing state declarations (around line 109):

```tsx
const [period, setPeriod] = useState<Period>(...)
const [enterClass, setEnterClass] = useState('')
const prevPeriodRef = useRef(period)
```

Add after them:

```tsx
const [offset, setOffset] = useState(0)
```

- [ ] **Step 2.2: Reset offset when changing tabs**

Inside `handleSetPeriod`, add a reset:

```tsx
const handleSetPeriod = (p: Period) => {
  const dir = PERIOD_ORDER.indexOf(p) > PERIOD_ORDER.indexOf(prevPeriodRef.current) ? 'tab-enter-right' : 'tab-enter-left'
  prevPeriodRef.current = p
  setEnterClass(dir)
  localStorage.setItem('reports-period', p)
  setPeriod(p)
  setOffset(0)   // ← add this line
}
```

- [ ] **Step 2.3: Compute `periodStart` and `firstPeriodStart` for Prev disabled logic**

Add these helpers after the `getDateRange` function (still inside the module, before `ReportsView`):

```tsx
function getPeriodStart(period: 'week' | 'month', offset: number): string {
  const todayStr = getTodayLocal()
  const today = new Date(todayStr + 'T00:00:00')
  if (period === 'week') {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((day + 6) % 7) - offset * 7)
    return monday.toLocaleDateString('sv')
  } else {
    const totalMonths = today.getFullYear() * 12 + today.getMonth() - offset
    const year = Math.floor(totalMonths / 12)
    const month = totalMonths % 12
    return new Date(year, month, 1).toLocaleDateString('sv')
  }
}
```

- [ ] **Step 2.4: Compute nav state values inside `ReportsView`**

Add these inside `ReportsView`, after `firstSessionDate` is computed:

```tsx
// Nav helpers (only meaningful for week/month)
const navPeriod = period === 'week' || period === 'month' ? period : null

const isPrevDisabled = (() => {
  if (!navPeriod || !firstSessionDate) return true
  const currentStart = getPeriodStart(navPeriod, offset)
  const firstStart = getPeriodStart(navPeriod,
    // find the offset at which the period contains firstSessionDate
    // by computing: what period does firstSessionDate fall in?
    navPeriod === 'week'
      ? (() => {
          const todayStr = getTodayLocal()
          const today = new Date(todayStr + 'T00:00:00')
          const day = today.getDay()
          const currentMonday = new Date(today)
          currentMonday.setDate(today.getDate() - ((day + 6) % 7))
          const firstDate = new Date(firstSessionDate + 'T00:00:00')
          const diffDays = Math.floor((currentMonday.getTime() - firstDate.getTime()) / 86400000)
          return Math.max(0, Math.floor(diffDays / 7))
        })()
      : (() => {
          const todayStr = getTodayLocal()
          const today = new Date(todayStr + 'T00:00:00')
          const first = new Date(firstSessionDate + 'T00:00:00')
          return (today.getFullYear() - first.getFullYear()) * 12 + (today.getMonth() - first.getMonth())
        })()
  )
  return currentStart <= firstStart
})()

const isNextDisabled = offset === 0
```

- [ ] **Step 2.5: Compute the date label for the nav row and `WearChart`**

```tsx
const periodLabel = (() => {
  if (period === 'week') {
    const dates = getDateRange('week', offset)
    const start = new Date(dates[0] + 'T12:00:00')
    const end = new Date(dates[6] + 'T12:00:00')
    const todayYear = new Date().getFullYear()
    const startYear = start.getFullYear()
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const yearSuffix = startYear !== todayYear ? `, ${startYear}` : ''
    return `${fmt(start)}–${fmt(end).replace(/\w+ /, '')}${yearSuffix}`
    // e.g. "Mar 10–16" or "Mar 10–16, 2025"
  } else if (period === 'month') {
    const dates = getDateRange('month', offset)
    const d = new Date(dates[0] + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    // e.g. "March 2026"
  }
  return period === '7d' ? 'last 7 days' : ''
})()
```

- [ ] **Step 2.6: Run the build to confirm no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean or only pre-existing errors unrelated to this change.

- [ ] **Step 2.7: Commit**

```bash
git add src/views/ReportsView.tsx
git commit -m "feat: add offset state and period navigation helpers to ReportsView"
```

---

## Task 3: Add the nav row UI

**Files:**
- Modify: `src/views/ReportsView.tsx`

- [ ] **Step 3.1: Add the `NavRow` component**

Add this component above `ReportsView` in `src/views/ReportsView.tsx`:

```tsx
function NavRow({
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

- [ ] **Step 3.2: Render the nav row in `ReportsView`**

Inside the JSX of `ReportsView`, find the tab switcher block (ending with `</div>`). Immediately after it, before the animated `<div key={period} ...>`, insert:

```tsx
{(period === 'week' || period === 'month') && (
  <NavRow
    label={periodLabel}
    isPrevDisabled={isPrevDisabled}
    isNextDisabled={isNextDisabled}
    showToday={offset > 0}
    onPrev={() => setOffset(o => o + 1)}
    onNext={() => setOffset(o => o - 1)}
    onToday={() => setOffset(0)}
  />
)}
```

- [ ] **Step 3.3: Verify in the browser**

```bash
npm run dev
```

Open the Reports view, switch to Week or Month. Confirm:
- Nav row appears below the tab switcher.
- Next button is disabled on the current period.
- Pressing Prev goes back one period; date label updates.
- Today button appears when navigating past, resets to current.
- Prev disables when you reach the earliest period with data.
- Switching tabs resets to the current period.

- [ ] **Step 3.4: Commit**

```bash
git add src/views/ReportsView.tsx
git commit -m "feat: render period nav row for week and month tabs"
```

---

## Task 4: Update `WearChart` to accept `periodLabel` as a prop

**Files:**
- Modify: `src/components/reports/WearChart.tsx`

The `periodLabel` constant is currently derived inside `WearChart` from `period`. It must become a prop so navigated periods show the correct label.

- [ ] **Step 4.1: Write the failing test**

There are no existing unit tests for `WearChart`. This change is small enough to verify visually in Task 3 step 3.3. Skip a new test here.

- [ ] **Step 4.2: Update the `Props` interface and implementation**

In `src/components/reports/WearChart.tsx`, find:

```tsx
interface Props {
  data: DailyStats[]
  goalMinutes: number
  period: '7d' | 'week' | 'month'
}
```

Replace with:

```tsx
interface Props {
  data: DailyStats[]
  goalMinutes: number
  period: '7d' | 'week' | 'month'
  periodLabel: string
}
```

Then in the function body, find and remove:

```tsx
const periodLabel = period === '7d' ? 'last 7 days' : period === 'week' ? 'this week' : 'this month'
```

Update the function signature to destructure the new prop:

```tsx
export default function WearChart({ data, goalMinutes, period, periodLabel }: Props) {
```

The `periodLabel` variable is already used in the JSX as `Worn per day — {periodLabel}` — no other changes needed in the template.

- [ ] **Step 4.3: Pass `periodLabel` from `ReportsView`**

In `src/views/ReportsView.tsx`, find the `<WearChart>` usage:

```tsx
<WearChart data={stats} goalMinutes={goalMinutes} period={period as '7d' | 'week' | 'month'} />
```

Update it to:

```tsx
<WearChart data={stats} goalMinutes={goalMinutes} period={period as '7d' | 'week' | 'month'} periodLabel={periodLabel} />
```

- [ ] **Step 4.4: Update the empty-state message**

Find the empty-state block in `ReportsView.tsx`:

```tsx
<p style={{ color: 'var(--text-faint)', fontSize: 14, marginBottom: 6 }}>
  No sessions recorded{period === '7d' ? ' in the last 7 days' : period === 'week' ? ' this week' : ' this month'}.
</p>
```

Replace with:

```tsx
<p style={{ color: 'var(--text-faint)', fontSize: 14, marginBottom: 6 }}>
  {period === '7d'
    ? 'No sessions recorded in the last 7 days.'
    : `No sessions recorded for ${periodLabel}.`}
</p>
```

- [ ] **Step 4.5: Run the build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 4.6: Run the tests**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4.7: Commit**

```bash
git add src/components/reports/WearChart.tsx src/views/ReportsView.tsx
git commit -m "feat: pass periodLabel as prop to WearChart, update empty-state message"
```

---

## Task 5: Final verification

- [ ] **Step 5.1: Full manual smoke test**

```bash
npm run dev
```

Walk through each scenario:

| Scenario | Expected |
|---|---|
| Open Week tab | Nav row shows current week (e.g. "Mar 17–23"), Next disabled |
| Press Prev | Goes to previous week, date updates, Next enabled, Today appears |
| Press Today | Snaps back to current week, Today hides, Next disables |
| Press Prev to earliest week | Prev disables |
| Open Month tab | Nav row shows "March 2026", Next disabled |
| Press Prev | Goes to "February 2026", chart shows Feb data |
| Open 7 Days tab | No nav row |
| Open By Set tab | No nav row |
| Switch Week → Month → Week | Offset resets to 0 on each switch |
| WearChart subtitle | Shows navigated period (e.g. "Worn per day — Feb 17–23") |
| Empty navigated period | Shows "No sessions recorded for Feb 17–23." |

- [ ] **Step 5.2: Run full test suite**

```bash
npm test
```

Expected: all tests pass.
