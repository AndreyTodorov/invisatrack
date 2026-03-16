# Invisalign Tracker — Product Specification

## Overview

A Progressive Web App (PWA) for tracking Invisalign aligner wear time. The user removes their aligners for eating/cleaning and needs to ensure ≥22 hours of daily wear. The app provides a one-tap timer to track removal sessions, daily/weekly/monthly reports, per-aligner-set analytics, and treatment progress tracking.

**Tech stack:** React + TypeScript + Vite + Tailwind CSS, Firebase Realtime Database + Google Auth, hosted on GitHub Pages as a PWA.

---

## 1. User Stories

### 1.1 Timer (Core Flow)

- **US-1.1** As a user, I can tap a single prominent button to start a "not wearing" session so I can track how long my aligners are out.
- **US-1.2** As a user, I can tap the same button to stop the session when I put my aligners back in.
- **US-1.3** As a user, I can see a live running timer (HH:MM:SS) during an active session showing how long my aligners have been out.
- **US-1.4** As a user, I receive an in-app alert (sound + visual flash) after 30 minutes of an active session to remind me to put aligners back in.
- **US-1.5** As a user, my session is automatically capped at 2 hours if I forget to stop it, and the session is flagged as "auto-capped" in my history.
- **US-1.6** As a user on a supported platform (Android PWA), I receive a push notification after 30 minutes via the service worker, even if the app tab isn't focused.

### 1.2 Daily Dashboard (Home Screen)

- **US-2.1** As a user, I see today's summary at a glance: total off-time, number of removals, and remaining daily budget (out of 2 hours).
- **US-2.2** As a user, I see the active session timer prominently if a session is running.
- **US-2.3** As a user, I see a list of today's completed sessions with their start time, end time, and duration.
- **US-2.4** As a user, I see my current compliance streak (consecutive days with ≥22h wear).

### 1.3 Session Management

- **US-3.1** As a user, I can edit the start and end time of any past session to correct mistakes.
- **US-3.2** As a user, I can delete any past session.
- **US-3.3** As a user, I can manually add a session I forgot to track (e.g., "I had lunch from 12:00–12:30 but forgot to start the timer").

### 1.4 Aligner Set Tracking

- **US-4.1** As a user, I can log that I've started a new aligner set (e.g., "Set 14") with today's date.
- **US-4.2** As a user, I can set the total number of sets in my treatment plan in settings, and update it if my plan changes.
- **US-4.3** As a user, I can set the default set duration (default: 7 days) and override it per set if my doctor advises differently.
- **US-4.4** As a user, I see a treatment progress bar showing "Set 14 of 30" and an estimated completion date.
- **US-4.5** As a user, when I start a new set, I see a report card comparing the completed set's stats to the previous set (avg daily wear %, total removals, compliance days, avg removals/day).

### 1.5 Reports & Analytics

- **US-5.1** As a user, I can view a **rolling 7-day** report showing daily wear % as a bar/line chart plus summary stats.
- **US-5.2** As a user, I can view a **calendar week** (Mon–Sun) report with the same metrics.
- **US-5.3** As a user, I can view a **monthly** report with daily breakdown and monthly averages.
- **US-5.4** As a user, I can view **per-aligner-set** reports showing stats for any past set.
- **US-5.5** As a user, reports include: total off-time, avg daily wear %, number of removals/day, longest single removal, compliance streak, and a trend chart.
- **US-5.6** As a user, I can export all my session data as a CSV file.

### 1.6 Settings

- **US-6.1** As a user, I am signed in via Google so my data syncs across devices.
- **US-6.2** As a user, I can configure my daily wear goal (default: 22 hours).
- **US-6.3** As a user, I can configure the reminder threshold (default: 30 minutes) and auto-cap duration (default: 2 hours).
- **US-6.4** As a user, I can set my total number of aligner sets and default set duration.
- **US-6.5** As a user, I can set a fixed "home" timezone or use auto-detect.

### 1.7 Offline & PWA

- **US-7.1** As a user, I can install the app to my home screen via "Add to Home Screen."
- **US-7.2** As a user, I can start/stop sessions while offline and they sync when I'm back online.
- **US-7.3** As a user, I can view today's data and recent history while offline.

---

## 2. Technical Specification

### 2.1 Architecture Overview

```
┌──────────────────────────────────────────────┐
│              GitHub Pages (Static)           │
│  ┌─────────────────────────────────────────┐ │
│  │  React SPA (Vite + TS + Tailwind)       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │ │
│  │  │  Views   │ │ Hooks    │ │ Context │ │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬────┘ │ │
│  │       └─────────────┼────────────┘      │ │
│  │              ┌──────┴──────┐            │ │
│  │              │  Data Layer │            │ │
│  │              │  (sync mgr) │            │ │
│  │              └──┬───────┬──┘            │ │
│  │           ┌─────┘       └─────┐         │ │
│  │     ┌─────┴─────┐    ┌───────┴──────┐  │ │
│  │     │ IndexedDB  │    │  Firebase RT │  │ │
│  │     │ (offline)  │    │  Database    │  │ │
│  │     └────────────┘    └─────────────┘   │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │  Service Worker (PWA + notifications)   │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 2.2 Data Model (Firebase Realtime Database)

All timestamps are stored as **UTC ISO 8601 strings**. The user's timezone offset is stored per session for accurate local display after travel.

```
/users/{uid}/
  profile/
    displayName: string
    email: string
    timezone: string              // IANA timezone (e.g., "Europe/Berlin") or "auto"
    dailyWearGoalMinutes: number  // default: 1320 (22h)
    reminderThresholdMinutes: number  // default: 30
    autoCapMinutes: number        // default: 120
    createdAt: string             // UTC ISO 8601

  treatment/
    totalSets: number | null      // null if unknown
    defaultSetDurationDays: number // default: 7
    currentSetNumber: number
    currentSetStartDate: string   // UTC ISO 8601

  sets/{setId}/                   // setId = auto-generated push ID
    setNumber: number
    startDate: string             // UTC ISO 8601
    endDate: string | null        // null if current set
    durationDaysOverride: number | null  // null = use default
    note: string | null           // optional user note

  sessions/{sessionId}/           // sessionId = auto-generated push ID
    startTime: string             // UTC ISO 8601
    endTime: string | null        // null if active
    startTimezoneOffset: number   // minutes offset from UTC at start
    endTimezoneOffset: number | null
    setNumber: number             // which aligner set was active
    autoCapped: boolean           // true if system auto-ended
    createdOffline: boolean       // true if created while offline
    deviceId: string              // unique device identifier for dedup
    updatedAt: string             // UTC ISO 8601, for conflict resolution
```

**Firebase Security Rules:**

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 2.3 Offline Architecture

**Storage:** IndexedDB (via `idb` library or Dexie.js) mirrors the Firebase data structure locally.

**Write flow:**
1. All writes go to IndexedDB first (always).
2. If online, immediately push to Firebase.
3. If offline, queue the write in an IndexedDB `syncQueue` table.
4. When connectivity returns (via `navigator.onLine` + Firebase `.info/connected`), drain the sync queue.

**Sync queue schema (IndexedDB):**

```typescript
interface SyncQueueItem {
  id: string;                // auto-incremented
  operation: 'set' | 'update' | 'delete';
  path: string;              // Firebase path (e.g., "users/{uid}/sessions/{id}")
  data: any;                 // payload
  timestamp: string;         // UTC ISO 8601, when the operation was created
  deviceId: string;
}
```

**Conflict resolution (merge + dedup):**
- Each session has a `deviceId` and `updatedAt` timestamp.
- On sync, before writing a session to Firebase, check if a session with overlapping `startTime`/`endTime` (within 1-minute tolerance) already exists from a different device.
- If overlap detected: keep the session with the earlier `startTime` and later `endTime` (i.e., the superset). Discard the subset.
- For non-session data (profile, treatment): last-write-wins based on `updatedAt`.

### 2.4 Midnight Splitting Logic

Sessions that span midnight are **split** for daily reporting purposes. The session record itself remains intact in the database — splitting is a **display/calculation concern only**.

```typescript
function splitSessionByDay(session: Session): DaySegment[] {
  const segments: DaySegment[] = [];
  let current = parseToLocalTime(session.startTime, session.startTimezoneOffset);
  const end = parseToLocalTime(
    session.endTime,
    session.endTimezoneOffset ?? session.startTimezoneOffset
  );

  while (current < end) {
    const endOfDay = startOfNextDay(current); // midnight local
    const segmentEnd = end < endOfDay ? end : endOfDay;
    segments.push({
      date: formatDate(current), // "YYYY-MM-DD"
      durationMinutes: diffMinutes(current, segmentEnd),
      sessionId: session.id,
    });
    current = endOfDay;
  }
  return segments;
}
```

### 2.5 Timezone Handling

- All timestamps stored as **UTC ISO 8601** in Firebase.
- Each session stores the **timezone offset at start and end** (to handle mid-session timezone changes during travel).
- User can set a "home" timezone in settings (IANA string like `America/New_York`) or leave it as `"auto"` to use the device timezone.
- If a home timezone is set, **all daily boundaries use that timezone** regardless of current device location.
- If `"auto"`, daily boundaries use the device's current timezone. A warning is shown if the device timezone changes mid-day.

### 2.6 Auto-Cap & Reminder System

**In-app reminder (always works):**
- A `setInterval` in the active timer component checks elapsed time every second.
- At 30 minutes: play an audio alert (short chime), flash the timer red, show a toast notification.
- At 2 hours: auto-stop the session, set `autoCapped: true`, show a persistent banner explaining what happened.

**PWA notification (best effort):**
- On session start, if `Notification.permission === 'granted'`, schedule a notification via the service worker using a `setTimeout` message.
- Service worker listens for the message and fires a notification at the 30-minute mark.
- Limitation: does not survive device restarts or aggressive OS battery optimization. This is a best-effort enhancement.

### 2.7 PWA Configuration

**`manifest.json`:**
```json
{
  "name": "Invisalign Tracker",
  "short_name": "AlignerTrack",
  "start_url": "/invisalign/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service worker responsibilities:**
1. Cache app shell (HTML, CSS, JS) for offline loading.
2. Cache recent Firebase reads in a runtime cache (stale-while-revalidate).
3. Handle scheduled notification timers.

Use **Workbox** (via `vite-plugin-pwa`) for service worker generation.

### 2.8 Component Architecture

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Router + auth provider + sync provider
├── vite-env.d.ts
├── index.css                 # Tailwind imports
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx      # Bottom nav, header, main content area
│   │   └── BottomNav.tsx     # Tab navigation (Home, History, Reports, Settings)
│   │
│   ├── timer/
│   │   ├── TimerButton.tsx   # The big start/stop button
│   │   ├── ActiveTimer.tsx   # Running timer display (HH:MM:SS)
│   │   └── TimerAlert.tsx    # 30-min warning overlay + sound
│   │
│   ├── dashboard/
│   │   ├── DailySummary.tsx  # Today's stats (off-time, removals, budget remaining)
│   │   ├── SessionList.tsx   # Today's sessions list
│   │   ├── StreakBadge.tsx   # Compliance streak display
│   │   └── TreatmentProgress.tsx  # Set X of Y progress bar
│   │
│   ├── sessions/
│   │   ├── SessionCard.tsx   # Individual session display
│   │   ├── SessionEditModal.tsx  # Edit start/end time
│   │   └── AddSessionModal.tsx   # Manually add a missed session
│   │
│   ├── reports/
│   │   ├── ReportView.tsx    # Container with period selector tabs
│   │   ├── WearChart.tsx     # Daily wear % line/bar chart
│   │   ├── StatsGrid.tsx     # Summary stats cards
│   │   └── SetReportCard.tsx # Per-set comparison report
│   │
│   └── settings/
│       ├── SettingsView.tsx  # Settings form
│       ├── SetSwitcher.tsx   # "Start new set" flow + report card
│       ├── TreatmentSetup.tsx # Total sets, default duration
│       └── ExportButton.tsx  # CSV download
│
├── hooks/
│   ├── useAuth.ts            # Google sign-in state
│   ├── useTimer.ts           # Active timer logic, auto-cap, reminders
│   ├── useSessions.ts        # CRUD operations on sessions
│   ├── useSets.ts            # Aligner set management
│   ├── useReports.ts         # Computed report data
│   ├── useOnlineStatus.ts    # Connectivity detection
│   └── useSync.ts            # Offline queue + sync manager
│
├── contexts/
│   ├── AuthContext.tsx        # Firebase auth state
│   ├── DataContext.tsx        # Sessions, sets, profile data
│   └── SyncContext.tsx        # Sync status (online/offline/syncing)
│
├── services/
│   ├── firebase.ts           # Firebase app init, auth, DB ref helpers
│   ├── db.ts                 # IndexedDB setup (Dexie)
│   ├── syncManager.ts        # Offline queue drain, conflict resolution
│   └── notifications.ts      # Notification permission, scheduling
│
├── utils/
│   ├── time.ts               # UTC/local conversion, midnight split, duration formatting
│   ├── stats.ts              # Compute wear %, streaks, averages
│   ├── csv.ts                # Session data → CSV string
│   └── deviceId.ts           # Generate/persist a unique device ID
│
└── types/
    └── index.ts              # TypeScript interfaces (Session, Set, Profile, etc.)
```

### 2.9 Routing

Use **React Router** with hash-based routing (required for GitHub Pages):

| Route | View | Description |
|-------|------|-------------|
| `#/` | Home/Dashboard | Timer + daily summary |
| `#/history` | History | Past sessions, filterable by date/set |
| `#/reports` | Reports | Weekly/monthly/set reports |
| `#/settings` | Settings | Profile, treatment, preferences |
| `#/login` | Login | Google sign-in (shown when unauthenticated) |

### 2.10 Charting Library

Use **Recharts** (React-native charting, lightweight, good mobile support) for:
- Daily wear % bar chart (reports)
- Trend line chart (rolling averages)
- Set comparison charts

### 2.11 Key TypeScript Interfaces

```typescript
interface Session {
  id: string;
  startTime: string;           // UTC ISO 8601
  endTime: string | null;
  startTimezoneOffset: number;
  endTimezoneOffset: number | null;
  setNumber: number;
  autoCapped: boolean;
  createdOffline: boolean;
  deviceId: string;
  updatedAt: string;
}

interface AlignerSet {
  id: string;
  setNumber: number;
  startDate: string;           // UTC ISO 8601
  endDate: string | null;
  durationDaysOverride: number | null;
  note: string | null;
}

interface UserProfile {
  displayName: string;
  email: string;
  timezone: string;            // IANA string or "auto"
  dailyWearGoalMinutes: number;
  reminderThresholdMinutes: number;
  autoCapMinutes: number;
  createdAt: string;
}

interface Treatment {
  totalSets: number | null;
  defaultSetDurationDays: number;
  currentSetNumber: number;
  currentSetStartDate: string;
}

interface DaySegment {
  date: string;                // "YYYY-MM-DD" in local time
  durationMinutes: number;
  sessionId: string;
}

interface DailyStats {
  date: string;
  totalOffMinutes: number;
  wearPercentage: number;
  removals: number;
  longestRemovalMinutes: number;
  compliant: boolean;          // wearPercentage >= goal
}
```

---

## 3. UI / UX Specification

### 3.1 Design Language

- **Primary feel:** Clean health-app aesthetic (Apple Health inspired) with gamified accents.
- **Color palette:** Indigo/violet primary (`#6366f1`), success green, warning amber, danger red. Neutral grays for backgrounds.
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`). Large, bold numbers for timer and stats.
- **Touch targets:** Minimum 48x48px for all interactive elements. The timer button should be at least 120x120px.
- **Animations:** Subtle pulse on active timer. Smooth transitions between views. Confetti or sparkle on streak milestones.

### 3.2 Home Screen Layout

```
┌─────────────────────────────┐
│  AlignerTrack     Set 14/30 │  ← header
├─────────────────────────────┤
│                             │
│     ┌───────────────┐       │
│     │   00:23:45     │       │  ← active timer (large, pulsing)
│     │  Aligners Out  │       │
│     └───────────────┘       │
│                             │
│     ╔═══════════════╗       │
│     ║   PUT BACK    ║       │  ← big button (red when active)
│     ╚═══════════════╝       │
│                             │
├─────────────────────────────┤
│  Today          🔥 12 days  │  ← streak badge
│  Off: 45min    Budget: 1h15 │
│  Removals: 2                │
├─────────────────────────────┤
│  ▸ 08:15 – 08:35  (20min)  │  ← today's sessions
│  ▸ 12:00 – 12:25  (25min)  │
├─────────────────────────────┤
│  ████████████░░░  Set 14    │  ← treatment progress
│  Day 5 of 7 • Est. Aug 2026│
├─────────────────────────────┤
│  🏠  📋  📊  ⚙️             │  ← bottom nav
└─────────────────────────────┘
```

When **no session is active**, the button says "REMOVE ALIGNERS" (green/indigo) and the timer area shows today's summary instead.

### 3.3 Interaction Details

| Action | Behavior |
|--------|----------|
| Tap "REMOVE ALIGNERS" | Creates a new session with `startTime = now()`. Button changes to red "PUT BACK". Timer starts counting up. |
| Tap "PUT BACK" | Sets `endTime = now()` on the active session. Button reverts to green. Session appears in today's list. |
| Tap a session in today's list | Opens the edit modal (change start/end time, or delete). |
| Long-press / swipe session | Quick-delete with confirmation. |
| Pull down on home | Refresh / force sync. |

---

## 4. Edge Cases & Error Handling

### 4.1 Timer Edge Cases

| Scenario | Behavior |
|----------|----------|
| User starts a session and closes the browser | Session remains active in DB. On next open, the running timer resumes from `startTime`. If >2h has elapsed, it's auto-capped. |
| User starts a session, goes offline, stops it | Stop time saved to IndexedDB. Synced to Firebase when back online. |
| Two active sessions (multi-device race) | On sync, if two sessions have `endTime === null`, keep the one with the earlier `startTime` and end the other at its start time (zero-duration, flagged for review). |
| User edits a session to overlap with another | Validation error: "This session overlaps with another (12:00–12:30). Please adjust the times." |
| User manually adds a session during an active timer | Allowed, but validate no overlap with the current active session. |
| Session auto-capped while offline | Auto-cap logic runs client-side on app open. If the session is >2h old and still active, cap it at `startTime + 2h`, set `autoCapped = true`. |

### 4.2 Sync Edge Cases

| Scenario | Behavior |
|----------|----------|
| Firebase write fails (permission denied) | Retry 3 times with exponential backoff (1s, 2s, 4s). If still failing, keep in sync queue and show "Sync error" badge. |
| IndexedDB full | Show warning. Continue writing to Firebase directly if online. Graceful degradation. |
| User signs out | Clear local IndexedDB data. Remove sync queue. Firebase auth state clears automatically. |
| Firebase quota exceeded | Show "Service temporarily unavailable. Your data is saved locally." Continue offline-first. |

### 4.3 Data Integrity

| Scenario | Behavior |
|----------|----------|
| Negative duration (endTime < startTime after edit) | Validation error: "End time must be after start time." |
| Session longer than 24 hours | Validation error: "Session cannot be longer than 24 hours. Did you forget to stop the timer?" |
| Switching aligner sets with an active session | End the active session first, then switch sets. Or: warn "You have an active session. Stop it before switching sets?" |
| Deleting all sessions for a day | Allowed. Day shows 100% compliance (0 off-time). |

### 4.4 Auth Edge Cases

| Scenario | Behavior |
|----------|----------|
| Google sign-in fails | Show error with retry button. Do not allow app usage without auth (data can't be saved securely). |
| Auth token expires mid-session | Firebase SDK auto-refreshes tokens. If refresh fails, queue writes offline and prompt re-sign-in. |
| User signs in on new device | All data loads from Firebase. Local IndexedDB is populated from Firebase on first sync. |

---

## 5. Build & Deployment

### 5.1 Project Setup

```bash
npm create vite@latest invisalign -- --template react-ts
cd invisalign
npm install tailwindcss @tailwindcss/vite
npm install firebase
npm install react-router-dom
npm install recharts
npm install dexie                # IndexedDB wrapper
npm install vite-plugin-pwa      # PWA + service worker
npm install date-fns date-fns-tz # Date utilities with timezone support
```

### 5.2 GitHub Pages Deployment

- **Base path:** Configure `vite.config.ts` with `base: '/invisalign/'` (matching the repo name).
- **Deploy:** Use `gh-pages` npm package or a GitHub Actions workflow that builds and pushes to the `gh-pages` branch.
- **Custom domain:** Optional, not required for v1.

### 5.3 Firebase Setup

1. Create a Firebase project in the Firebase console.
2. Enable **Google sign-in** under Authentication → Sign-in method.
3. Create a **Realtime Database** in the Firebase console.
4. Apply the security rules from section 2.2.
5. Add the Firebase config to the app via environment variables or a config file (no secrets — Firebase client config is public by design).

---

## 6. Success Metrics (Definition of Done)

### 6.1 Functional Acceptance Criteria

- [ ] User can sign in with Google and see their data across devices.
- [ ] Timer starts/stops with a single tap. Running timer is visible and accurate.
- [ ] 30-minute in-app reminder fires (sound + visual).
- [ ] 2-hour auto-cap ends session and flags it.
- [ ] PWA can be installed to home screen and works offline.
- [ ] Sessions created offline sync to Firebase when back online.
- [ ] Multi-device sync works: starting/stopping on one device reflects on the other within seconds.
- [ ] Conflicting sessions (created on different devices offline) are merged/deduped.
- [ ] Session editing (change times, delete, add manually) works with validation.
- [ ] Aligner set switching logs the new set and shows a comparison report card.
- [ ] Treatment progress bar shows correct set number, total, and estimated completion.
- [ ] Rolling 7-day, calendar week, and monthly reports show correct stats.
- [ ] Per-set reports are available for all past sets.
- [ ] Report metrics: total off-time, avg daily wear %, removals/day, longest removal, streak, trend chart.
- [ ] CSV export downloads all session data.
- [ ] Midnight-spanning sessions are correctly split in daily stats.
- [ ] Timezone changes (travel) don't corrupt daily boundaries.
- [ ] App works on mobile Safari, mobile Chrome, and desktop Chrome.

### 6.2 Performance Targets

- [ ] First load (uncached): < 3 seconds on 4G.
- [ ] Subsequent loads (cached PWA): < 1 second.
- [ ] Timer UI updates every second with no visible jank.
- [ ] Sync queue drains within 5 seconds of regaining connectivity.

### 6.3 Non-Functional Requirements

- [ ] All data encrypted in transit (HTTPS via GitHub Pages).
- [ ] Firebase rules prevent any user from accessing another user's data.
- [ ] No hardcoded secrets in the codebase (Firebase client config is not a secret).
- [ ] Lighthouse PWA score ≥ 90.
- [ ] Accessible: proper ARIA labels, keyboard navigation, sufficient color contrast.
