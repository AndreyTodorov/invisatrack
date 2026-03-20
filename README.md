# InvisaTrack

A Progressive Web App for tracking aligner wear time. Logs removal sessions, computes daily compliance, tracks streaks, and visualises per-set analytics — with full offline support.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Project Structure](#project-structure)
5. [Architecture Overview](#architecture-overview)
6. [Data Model](#data-model)
7. [Key Features & How They Work](#key-features--how-they-work)
8. [Hooks Reference](#hooks-reference)
9. [Components Reference](#components-reference)
10. [Views & Routing](#views--routing)
11. [Constants](#constants)
12. [Utilities Reference](#utilities-reference)
13. [Testing](#testing)
14. [CI/CD](#cicd)
15. [Known Bugs & Workarounds](#known-bugs--workarounds)
16. [Design System](#design-system)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router 7 (HashRouter) |
| Styling | CSS variables (dark theme) + Tailwind CSS 4 |
| Database | Firebase Realtime Database |
| Auth | Firebase Auth (Google OAuth) |
| Offline storage | Dexie 4 (IndexedDB wrapper) |
| Charts | Recharts 3 |
| PWA | vite-plugin-pwa |
| Testing | Vitest 4 + @testing-library/react |

---

## Quick Start

```bash
# Install dependencies
npm install

# Create your .env file (see Environment Variables section)
cp .env.example .env

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

### Firebase Emulators + Dev Server (local dev)

The emulators run via Docker Compose (no local Firebase CLI install required).

```bash
# Start emulators + Vite dev server together (emulators run in background)
npm run dev:local

# Or start them separately:
npm run emulators   # emulators in foreground (Auth :9099, RTDB :9000, UI :4000)
npm run dev         # Vite dev server

# Stop emulators
npm run emulators:stop
```

Point the app at the emulators by setting `VITE_USE_EMULATOR=true` in your `.env` file.

### Seeding dev data

`scripts/seed.ts` populates the emulator with realistic sessions and aligner sets so you can start testing immediately without manually entering data.

```bash
npm run seed                      # minimal preset (default)
npm run seed -- --preset history  # 5 sets, ~80 sessions, 5 weeks
npm run seed -- --preset full     # 20 sets, ~400 sessions, 5 months
```

On first run the script creates `seed@test.com` / `password123` in the Auth emulator. Subsequent runs reuse the same user and overwrite all data.

**Signing in:** the login screen shows a **[dev] Sign in as seed user** button (only visible when `VITE_USE_EMULATOR=true`). Clicking it clears local IndexedDB and signs in as the seed user in one step.

**Auto-reload:** if the app is already open when you re-run the seeder, `DevBanner` detects the new `seedVersion` written to RTDB, wipes IndexedDB, and reloads the page automatically — no manual refresh needed.

**Tweakable constants** at the top of `scripts/seed.ts`:

```ts
const MIN_REMOVALS_PER_DAY = 2;
const MAX_REMOVALS_PER_DAY = 4;
const MIN_SESSION_MINUTES  = 15;
const MAX_SESSION_MINUTES  = 45;
```

---

## Environment Variables

Create a `.env` file at the project root (see `.env.example`):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_EMULATOR=false          # Set to "true" to use Firebase emulators
```

All variables are injected by Vite at build time via `import.meta.env`. They are also stored as GitHub Actions secrets for the deploy workflow.

---

## Project Structure

```
scripts/
└── seed.ts                       # Dev data seeder (sessions + sets → emulator)

src/
├── App.tsx                       # Route definitions, auth guard
├── main.tsx                      # Entry point — HashRouter + context providers
├── constants.ts                  # App-wide magic numbers
├── navDirection.ts               # Module-level push/pop nav direction state
├── test-setup.ts                 # Vitest global setup (mocks localStorage)
│
├── types/
│   └── index.ts                  # All shared interfaces (Session, AlignerSet, …)
│
├── contexts/
│   ├── AuthContext.tsx            # Google sign-in, current user state
│   └── DataContext.tsx            # Firebase real-time sync → React state
│
├── hooks/
│   ├── useTimer.ts               # Timer state, reminder, auto-cap logic
│   ├── useSessions.ts            # Session CRUD
│   ├── useSets.ts                # Aligner set management
│   ├── useReports.ts             # Statistics, streak, per-set analytics
│   ├── useAuth.ts                # Thin wrapper around AuthContext
│   ├── useAutoAdvanceSet.ts      # Auto-advance to next set when endDate passes
│   └── useSwipeTab.ts            # Touch swipe gesture → tab navigation
│
├── services/
│   ├── firebase.ts               # Firebase init, all ref helpers, CRUD helpers
│   └── db.ts                     # Dexie schema (sessions, sets, profile, treatment)
│
├── utils/
│   ├── time.ts                   # Date/time helpers (see Utilities Reference)
│   ├── stats.ts                  # computeDailyStats(), computeStreak()
│   ├── sessionValidation.ts      # Overlap detection for manual sessions
│   ├── csv.ts                    # Export sessions to CSV
│   └── deviceId.ts               # Stable device identifier (localStorage)
│
├── components/
│   ├── DevBanner.tsx             # Dev-mode banner; watches seedVersion → auto-reload on reseed
│   ├── layout/
│   │   ├── AppShell.tsx          # Content wrapper + bottom nav
│   │   └── BottomNav.tsx         # Four-tab navigation bar
│   ├── timer/
│   │   ├── TimerButton.tsx       # Start/stop button with SVG budget ring
│   │   ├── ActiveTimer.tsx       # HH:MM:SS display, cyan/rose glow
│   │   └── TimerAlert.tsx        # Reminder modal + snooze (reached threshold)
│   ├── dashboard/
│   │   ├── DailySummary.tsx      # 24h timeline bar + wear ring + stat tiles
│   │   ├── CalendarHeatmap.tsx   # Monthly compliance calendar (green/amber/rose cells)
│   │   ├── SessionList.tsx       # List of completed sessions
│   │   ├── StreakBadge.tsx        # Compliance streak pill
│   │   └── TreatmentProgress.tsx # Current set progress bar + per-day compliance dots
│   ├── sessions/
│   │   ├── AddSessionModal.tsx   # Manual session creation bottom sheet
│   │   └── SessionEditModal.tsx  # Edit/delete session bottom sheet
│   ├── sets/
│   │   ├── StartNewSetModal.tsx  # Start next aligner set bottom sheet
│   │   └── SetEditModal.tsx      # Edit/delete set with stats context
│   ├── reports/
│   │   ├── WearChart.tsx         # Recharts bar chart (wear % by day)
│   │   ├── StatsGrid.tsx         # Summary stats (avg wear, removals, …)
│   │   └── SetReportCard.tsx     # Per-set statistics card
│   └── settings/
│       └── ExportButton.tsx      # CSV export trigger
│
└── views/
    ├── HomeView.tsx              # Dashboard: timer, today's summary, session list
    ├── HistoryView.tsx           # Session + set history with filters and month grouping
    ├── ReportsView.tsx           # Analytics dashboard (tabs: 7d / week / month / by set)
    ├── SettingsView.tsx          # Nav-list settings with push/pop sub-screens
    ├── OnboardingView.tsx        # First-run setup (set number, total sets, goal)
    └── LoginView.tsx             # Google sign-in; dev-only "Sign in as seed user" button
```

---

## Architecture Overview

### Data flow

```
Google Auth
    │
    ▼
AuthContext  ──(uid)──▶  DataContext
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        IndexedDB (Dexie)             Firebase RTDB
        (local cache)                 (real-time)
                     │               │
                     └───────────────┘
                            │
               React state (sessions, sets, profile, treatment)
                            │
         hooks (useSessions, useSets, useTimer, useReports, useAutoAdvanceSet)
                            │
                      Views / Components
```

### Context provider tree (`main.tsx` + `App.tsx`)

```
HashRouter (main.tsx)
  └── AuthProvider (App.tsx)
        └── DataProvider (App.tsx, mounted after sign-in)
              └── Routes / Views
```

---

## Data Model

### Firebase Realtime Database paths

```
users/
  {uid}/
    profile/           ← UserProfile
    treatment/         ← Treatment
    sessions/
      {sessionId}/     ← Session
    sets/
      {setId}/         ← AlignerSet
```

### Key interfaces (`src/types/index.ts`)

```typescript
interface Session {
  id: string
  startTime: string                  // UTC ISO 8601
  endTime: string | null             // null = currently active
  startTimezoneOffset: number        // Device UTC offset in minutes at start time
  endTimezoneOffset: number | null   // Device UTC offset in minutes at end time
  setNumber: number
  autoCapped: boolean                // Was auto-stopped at autoCapMinutes
  createdOffline: boolean
  deviceId: string
  updatedAt: string                  // UTC ISO — used for merge conflict resolution
}

interface AlignerSet {
  id: string
  setNumber: number
  startDate: string                  // Local date "YYYY-MM-DD"
  endDate: string | null             // Always set for new sets; null for legacy open sets
  note: string | null
}

interface UserProfile {
  displayName: string
  email: string
  timezone: string
  dailyWearGoalMinutes: number       // Default 1320 (22 h)
  reminderThresholdMinutes: number   // Default 30
  autoCapMinutes: number             // Default 120
  createdAt: string
}

interface Treatment {
  totalSets: number | null
  defaultSetDurationDays: number     // Default 7
  currentSetNumber: number
  currentSetStartDate: string
}
```

> **Firebase null-omission gotcha**: Firebase Realtime Database silently drops `null` fields on write. A session's `endTime: null` comes back as `endTime: undefined` after a round-trip. All null checks in the codebase use **loose equality** (`== null` / `!= null`) to handle both.

---

## Key Features & How They Work

### Timer

1. User taps **Remove Aligners** → `useSessions.startSession()` creates a `Session` with `endTime: null`.
2. `useTimer` runs a `setInterval` every second, computing `elapsedMinutes = diffMinutes(session.startTime, now)`.
3. At `reminderThresholdMinutes`: plays an 880 Hz beep and sets `reminderFired = true` → `TimerAlert` modal appears.
4. At `autoCapMinutes`: automatically calls `stop()` and sets `autoCapped = true` on the session.
5. User taps **Put Back** → `useSessions.stopSession()` writes `endTime` and clears the active session.

Config values (`reminderThresholdMinutes`, `autoCapMinutes`) are stored in `useRef` inside `useTimer` so the interval callback always reads the current value without stale closures (FIX LG-6).

### Daily summary & wear ring

- **Wear %** = `(MINUTES_PER_DAY − totalOffMinutes − activeMinutes) / goalMinutes × 100`
  - Reaches 100% once you've worn your aligners enough today; ring stays full thereafter.
  - This is independent of "Budget Left" — you can have budget remaining while already at 100% wear.
- **Budget Left** = `maxOffMinutes − totalOffMinutes − activeMinutes` (clamped at 0)
  - `maxOffMinutes = MINUTES_PER_DAY − goalMinutes`
- The live timer's `elapsedMinutes` is passed as `activeMinutes` so both values update in real time without waiting for the session to stop.

### Timezone handling

Every `Session` stores the device's UTC offset (`startTimezoneOffset`, `endTimezoneOffset`) at the moment of recording. This allows correct local-date grouping even when a user changes timezone mid-treatment.

```typescript
// Convert a UTC ISO string to a Date in "local" time
toLocalDate(isoString, offsetMinutes)
// Produce "YYYY-MM-DD" key
formatDateKey(localDate)
```

Sessions that span local midnight are split by `splitSessionByDay()` so stats credit the correct day.

### Auto-advance sets

`useAutoAdvanceSet` runs on mount (once per `currentSetNumber`). If the current set's `endDate` has passed it automatically creates the next set(s) and advances `treatment.currentSetNumber` forward, chaining through any consecutive expired sets in one pass. Pre-existing sets in the chain are recognised and skipped (only `treatment` is updated for those).

### Settings navigation

`SettingsView` renders a nav-list home screen with a `ProfileCard` (avatar, name, email, sign-out) and three `NavRow` entries: **Wear Goal**, **Treatment Plan**, and **Data & Export**. Tapping a row pushes a detail sub-screen using CSS `settings-push` / `settings-pop` animations (controlled by `navDir` state and a `navKey` counter). Swiping right from the left edge pops back to the list, mirroring iOS navigation conventions.

The **Treatment Plan** sub-screen includes a **Duration override** field for the current aligner set, allowing its end date to be adjusted independently of the default cycle length.

App version (`__APP_VERSION__`) and build date (`__BUILD_DATE__`) are injected at build time and displayed at the bottom of the list screen.

### History view tabs

`HistoryView` has two tabs — **Sessions** and **Sets** — switchable by tap or horizontal swipe (`useSwipeTab`).

**Sessions tab** groups completed sessions by month. Each month header is collapsible and shows session count, compliant/total days, and a colour-coded compliance percentage badge. Within each month, date headers are sticky and show the daily wear time. Four filter chips narrow the list: All, This Set, Missed Days, This Month.

**Sets tab** shows all aligner sets in reverse order, each card showing date range, session count, avg removals/day, compliant days, and a colour-coded wear progress bar.

### Reports enhancements

- **Best/Worst callout**: Two cards beneath the stats grid highlight the best and worst completed days in the selected period.
- **Calendar heatmap**: The Month tab shows a `CalendarHeatmap` with month-by-month navigation. Each cell is coloured green (compliant), amber (≥ 85 % of goal), rose (below), or grey (no data).
- **Tab persistence**: The selected Reports tab is saved to `localStorage` and restored on next visit.
- **Swipe navigation**: Tabs in both ReportsView and HistoryView respond to horizontal swipe gestures via `useSwipeTab`.

### Sync and connectivity indicators

`HomeView` shows status pills in the header:
- **Syncing…** (amber, pulsing dot) — IndexedDB data is loaded but Firebase treatment hasn't confirmed yet.
- **Offline** (grey dot) — Firebase `connected` ref is `false`.

---

## Hooks Reference

| Hook | Returns | Notes |
|---|---|---|
| `useTimer(reminderMins, autoCapMins, setNumber)` | `{ elapsedMinutes, isRunning, reminderFired, autoCapped, start, stop }` | Reads active session from DataContext |
| `useSessions()` | `{ sessions, startSession, stopSession, updateSession, deleteSession, addManualSession }` | All session writes go through here |
| `useSets()` | `{ sets, startNewSet, endCurrentSet, updateTreatment, updateSet }` | Manages `sets/` and `treatment/` in Firebase |
| `useReports(goalMinutes)` | `{ getDailyStatsRange, streak, getSetStats, allSegments, sets }` | Computed from sessions in DataContext |
| `useAuth()` | `{ user, loading, signIn, signOut }` | Thin wrapper around AuthContext |
| `useAutoAdvanceSet()` | `{ autoAdvancedSets, dismiss }` | Auto-advances expired sets on mount |
| `useSwipeTab(onSwipe)` | `{ onTouchStart, onTouchEnd }` | Returns touch handlers; calls `onSwipe('left'\|'right')` on horizontal swipe |

---

## Components Reference

### Timer

| Component | Props | Notes |
|---|---|---|
| `TimerButton` | `isRunning, onPress, budgetPercent?, elapsedMinutes?, reminderFired?` | SVG ring turns amber at 60% budget used, rose at 85%; glow pulses when reminder fires |
| `ActiveTimer` | `elapsedMinutes, reminderFired` | Pulses cyan/rose when `reminderFired` |
| `TimerAlert` | `thresholdMinutes, onDismiss, onSnooze` | Shown by HomeView when reminder fires; supports 10-min snooze |

### Dashboard

| Component | Props | Notes |
|---|---|---|
| `DailySummary` | `totalOffMinutes, removals, goalMinutes, streak, sessions?, activeMinutes?` | 24h timeline bar + wear ring + stat tiles; `activeMinutes` updates live |
| `CalendarHeatmap` | `dateStatsMap, sessionDates, goalMinutes, today` | Month grid with prev/next navigation; green = compliant, amber = near goal, rose = missed |
| `SessionList` | `sessions, onEdit, activeSession?, activeElapsedMinutes?` | Filters out active sessions (`endTime == null`) unless passed via `activeSession` |
| `StreakBadge` | `streak` | Amber pill; hidden at 0 |
| `TreatmentProgress` | `treatment, defaultSetDurationDays, currentSetStartDate?, currentSetEndDate?, currentSetDayStatus?, avgWearPct?, goalMinutes?` | Overall progress bar + per-day compliance dots + avg wear status badge |

### Sessions

| Component | Props | Notes |
|---|---|---|
| `AddSessionModal` | `onClose` | `datetime-local` inputs converted from/to UTC with offset |
| `SessionEditModal` | `session, onClose` | Includes delete with in-UI confirmation |

### Sets

| Component | Props | Notes |
|---|---|---|
| `StartNewSetModal` | `currentSetNumber, defaultDurationDays, onClose` | Creates the next set with configurable start date and duration |
| `SetEditModal` | `set, stats, isCurrent, prevSet, nextSet, onClose` | Edit dates/note, delete set; shows stats in context |

### Reports

| Component | Props | Notes |
|---|---|---|
| `WearChart` | `data: DailyStats[], goalMinutes` | DD.MM date labels; cyan = compliant, rose = not |
| `StatsGrid` | `stats: DailyStats[]` | Avg wear time, avg removals (rounded integer), compliance days |
| `SetReportCard` | `setNumber, current, previous?` | Shows delta vs previous set |

---

## Views & Routing

`HashRouter` is used (`/#/path`) so GitHub Pages static hosting works without server rewrites.

| Route | View | Notes |
|---|---|---|
| `/` | HomeView | Dashboard: timer, sync/offline pill, today's summary, session list, treatment progress |
| `/history` | HistoryView | Two tabs (Sessions / Sets); sessions grouped by month with filter chips and collapsible headers |
| `/reports` | ReportsView | Tabs: 7 days / this week / this month / by set; swipe-to-change tabs; tab persisted to localStorage |
| `/settings` | SettingsView | Nav-list home screen → push into Wear Goal / Treatment Plan / Data & Export sub-screens |
| `/onboarding` | OnboardingView | First-run: set number, total sets, daily goal |
| (unauthenticated) | LoginView | Google sign-in |

---

## Constants

`src/constants.ts`:

```typescript
DEFAULT_DAILY_WEAR_GOAL_MINUTES    = 1320   // 22 hours
DEFAULT_REMINDER_THRESHOLD_MINUTES = 30     // Alert after 30 min out
DEFAULT_AUTO_CAP_MINUTES           = 120    // Auto-stop at 2 hours
DEFAULT_SET_DURATION_DAYS          = 7      // One tray per week
MINUTES_PER_DAY                    = 1440  // 24 × 60
MAX_SESSION_DURATION_HOURS         = 24     // Validation ceiling for manual sessions
```

---

## Utilities Reference

### `src/utils/time.ts`

| Function | Signature | Description |
|---|---|---|
| `nowISO()` | `() → string` | Current time as UTC ISO string |
| `toLocalDate` | `(iso, offsetMinutes) → Date` | Shift a UTC ISO string to a local-time Date |
| `formatDateKey` | `(Date) → string` | `"YYYY-MM-DD"` from a local-time Date |
| `formatDuration` | `(minutes) → string` | `"HH:MM:SS"` (used in stat tiles) |
| `formatDurationShort` | `(minutes) → string` | Human-readable: `"45 min"`, `"1h 20m"`, `"2h"` |
| `diffMinutes` | `(startIso, endIso) → number` | Elapsed minutes between two UTC ISO strings |
| `splitSessionByDay` | `(startIso, endIso, offsetMinutes, id) → DaySegment[]` | Splits a session across local-midnight boundaries |
| `addDays` | `(dateStr, days) → string` | Add N days to a `"YYYY-MM-DD"` string |
| `dateDiffDays` | `(startStr, endStr) → number` | Calendar days between two `"YYYY-MM-DD"` strings |
| `todayLocalDate` | `() → string` | Today as `"YYYY-MM-DD"` in the device's local timezone |
| `getTimezoneOffset` | `() → number` | Current device UTC offset in minutes |
| `addMinutes` | `(isoString, minutes) → string` | Add N minutes to a UTC ISO string |

### `src/utils/stats.ts`

| Function | Description |
|---|---|
| `computeDailyStats(dateKey, segments, goalMinutes)` | Returns `DailyStats` for a given local date |
| `computeStreak(dailyStats[])` | Returns current consecutive-compliant-day streak |

---

## Testing

**Stack**: Vitest 4 + @testing-library/react + jsdom

```bash
npm test                # Run all tests once
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Test files

```
src/hooks/useTimer.test.ts
src/hooks/useSessions.test.ts
src/hooks/useSets.test.ts
src/hooks/useReports.test.ts
src/hooks/useAutoAdvanceSet.test.ts
src/utils/stats.test.ts
src/utils/time.test.ts
src/utils/csv.test.ts
src/utils/deviceId.test.ts
src/utils/sessionValidation.test.ts
src/components/dashboard/DailySummary.test.tsx
src/components/dashboard/SessionList.test.tsx
src/contexts/DataContext.test.tsx
src/views/HomeView.test.tsx
```

### Mocking conventions

- `useDataContext` is mocked at module level in hook tests. Always include `setSessions: vi.fn()` in the mock return value alongside `sessions`, `sets`, `profile`, `treatment`, and `loaded`.
- `vi.useFakeTimers()` / `vi.useRealTimers()` are used in `useTimer.test.ts` to control `setInterval` without test timeouts.
- Firebase and Dexie services are fully mocked; no tests hit the network or IndexedDB.

---

## CI/CD

### `tests.yml` — runs on every PR and push to `main`/`dev`

1. Checkout, Node 22, `npm ci`
2. ESLint (`npm run lint`)
3. TypeScript type-check (`npm run type-check`)
4. `npm test` (Vitest)
5. `npm run test:coverage`
6. Build verification (`npm run build`)

### `deploy.yml` — runs on push to `main` (or manual dispatch)

1. Checkout, Node 22, `npm ci`
2. Inject Firebase secrets from GitHub repository secrets
3. `npm run build` → `dist/`
4. Deploy `dist/` to GitHub Pages

**GitHub secrets required**:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

---

## Known Bugs & Workarounds

| Tag | File(s) | Issue | Fix |
|---|---|---|---|
| **LG-1** | HomeView, HistoryView | Sessions grouped by UTC date instead of local date | Each session stores `startTimezoneOffset`; used to compute local date key |
| **LG-4** | SessionList | `toLocaleTimeString` unreliable across environments | Manual UTC field reads after offset shift (`getUTCHours()`) |
| **LG-6** | useTimer | `setInterval` callback read stale config values | Config stored in `useRef`; refs updated in a separate `useEffect` |
| **LG-7** | useSets | Duplicate set numbers allowed | Validate uniqueness before writing |
| **CR-1** | useSessions | Dynamic `require()` of Firebase | All imports at module top |
| **CR-2** | DataContext | `onValue` snapshot overwrote pending offline writes | Merge: retain `createdOffline=true` sessions absent from Firebase |
| **CR-3** | useSessions | Multiple concurrent active sessions possible | Guard: `sessions.find(s => s.endTime == null)` before `startSession` |
| **CR-5** | SessionEditModal | UTC ↔ local conversion for `datetime-local` input | Manual conversion using stored timezone offset |
| **CR-6** | useReports | "Today" computed in UTC not local time | Use `new Date().getTimezoneOffset()` to compute local today key |
| **OS-4** | ReportsView | Date range computed in UTC | Apply device timezone offset when computing range boundaries |
| **SF-2** | SettingsView, SessionEditModal | `window.confirm()` blocked in some browsers/PWAs | In-UI confirmation dialogs instead |
| **SF-3** | useSessions | Double-tap creates two simultaneous sessions | `isSubmittingRef` prevents concurrent writes |

---

## Design System

All colours, spacing, and typography are controlled via CSS custom properties defined in `src/index.css`. The app is dark-only.

**Typography**: `Outfit` (headings, body) + `JetBrains Mono` (timers, numeric stats) — both from Google Fonts.

### Core CSS variables

```css
--bg            /* Page background */
--surface       /* Card background */
--surface-2     /* Inset card / stat tile */
--border        /* Default border */
--border-strong /* Hover / focus border */
--text          /* Primary text */
--text-muted    /* Secondary text */
--text-faint    /* Placeholder / hint text */

--cyan          /* Primary accent (active state, CTA) */
--cyan-bg       /* Cyan tinted background */
--green         /* Success / compliance met */
--amber         /* Warning / approaching limit */
--rose          /* Error / over budget */
--amber-bg      /* Amber tinted background */
--rose-bg       /* Rose tinted background */
```

### Keyframe animations

| Class | Usage |
|---|---|
| `pulse-ring` | Budget indicator ring pulses while timer is running |
| `timer-pulse` | Active timer card pulses when reminder fires |
| `animate-fade-in` | Post-session summary card fade in |
| `animate-slide-up` | Bottom sheet modals slide up |
| `settings-push` | Settings sub-screen slides in from the right (push navigation) |
| `settings-pop` | Settings sub-screen slides in from the left (back navigation) |
| `tab-enter-right` | Tab content slides in from the right (advancing tabs) |
| `tab-enter-left` | Tab content slides in from the left (going back in tabs) |
| `sync-dot-pulse` | Amber dot pulses in the sync status indicator |
