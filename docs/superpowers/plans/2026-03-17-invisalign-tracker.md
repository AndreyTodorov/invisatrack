# Invisalign Tracker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA for tracking Invisalign aligner wear time with offline support, Firebase sync, and analytics.

**Architecture:** React SPA with an offline-first data layer (IndexedDB via Dexie, synced to Firebase Realtime Database). All writes go to IndexedDB first; a sync manager drains a queue to Firebase when online. The UI is assembled from focused single-responsibility components wired through React Context.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS v4, Firebase v10 (Auth + Realtime DB), Dexie (IndexedDB), vite-plugin-pwa (Workbox), Recharts, React Router v6 (hash routing), date-fns + date-fns-tz, Vitest (unit tests).

---

## File Map

**New files to create:**

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── vite-env.d.ts
├── types/index.ts
├── utils/
│   ├── time.ts
│   ├── stats.ts
│   ├── csv.ts
│   └── deviceId.ts
├── services/
│   ├── firebase.ts
│   ├── db.ts
│   ├── syncManager.ts
│   └── notifications.ts
├── contexts/
│   ├── AuthContext.tsx
│   ├── DataContext.tsx
│   └── SyncContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useTimer.ts
│   ├── useSessions.ts
│   ├── useSets.ts
│   ├── useReports.ts
│   ├── useOnlineStatus.ts
│   └── useSync.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   └── BottomNav.tsx
│   ├── timer/
│   │   ├── TimerButton.tsx
│   │   ├── ActiveTimer.tsx
│   │   └── TimerAlert.tsx
│   ├── dashboard/
│   │   ├── DailySummary.tsx
│   │   ├── SessionList.tsx
│   │   ├── StreakBadge.tsx
│   │   └── TreatmentProgress.tsx
│   ├── sessions/
│   │   ├── SessionCard.tsx
│   │   ├── SessionEditModal.tsx
│   │   └── AddSessionModal.tsx
│   ├── reports/
│   │   ├── ReportView.tsx
│   │   ├── WearChart.tsx
│   │   ├── StatsGrid.tsx
│   │   └── SetReportCard.tsx
│   └── settings/
│       ├── SettingsView.tsx
│       ├── SetSwitcher.tsx
│       ├── TreatmentSetup.tsx
│       └── ExportButton.tsx
├── views/
│   ├── HomeView.tsx
│   ├── HistoryView.tsx
│   ├── ReportsView.tsx
│   ├── SettingsView.tsx
│   └── LoginView.tsx
public/
├── manifest.json
├── icon-192.png
├── icon-512.png
vite.config.ts
tailwind.config.ts        (if needed by v4)
.env.example
.github/workflows/deploy.yml
```

---

## Phase 1 — Project Scaffolding

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `vite.config.ts`
- Create: `.env.example`
- Create: `src/index.css`

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install firebase react-router-dom recharts dexie date-fns date-fns-tz
npm install vite-plugin-pwa
npm install tailwindcss @tailwindcss/vite
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/invisalign/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Invisalign Tracker',
        short_name: 'AlignerTrack',
        start_url: '/invisalign/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6366f1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'firebase-cache' },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create `src/index.css`**

```css
@import "tailwindcss";

:root {
  --color-primary: #6366f1;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 5: Create `.env.example`**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 6: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with all deps"
```

---

### Task 2: TypeScript interfaces

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write `src/types/index.ts`**

```typescript
export interface Session {
  id: string
  startTime: string           // UTC ISO 8601
  endTime: string | null
  startTimezoneOffset: number // minutes offset from UTC
  endTimezoneOffset: number | null
  setNumber: number
  autoCapped: boolean
  createdOffline: boolean
  deviceId: string
  updatedAt: string
}

export interface AlignerSet {
  id: string
  setNumber: number
  startDate: string           // UTC ISO 8601
  endDate: string | null
  durationDaysOverride: number | null
  note: string | null
}

export interface UserProfile {
  displayName: string
  email: string
  timezone: string            // IANA string or "auto"
  dailyWearGoalMinutes: number
  reminderThresholdMinutes: number
  autoCapMinutes: number
  createdAt: string
}

export interface Treatment {
  totalSets: number | null
  defaultSetDurationDays: number
  currentSetNumber: number
  currentSetStartDate: string
}

export interface DaySegment {
  date: string                // "YYYY-MM-DD" local
  durationMinutes: number
  sessionId: string
}

export interface DailyStats {
  date: string
  totalOffMinutes: number
  wearPercentage: number
  removals: number
  longestRemovalMinutes: number
  compliant: boolean
}

export interface SyncQueueItem {
  id?: number                 // auto-incremented by Dexie
  operation: 'set' | 'update' | 'delete'
  path: string
  data: unknown
  timestamp: string
  deviceId: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript domain interfaces"
```

---

## Phase 2 — Utility Functions (Pure Logic, Fully Tested)

### Task 3: Time utilities

**Files:**
- Create: `src/utils/time.ts`
- Create: `src/utils/time.test.ts`

- [ ] **Step 1: Write failing tests for `formatDuration`**

```typescript
// src/utils/time.test.ts
import { describe, it, expect } from 'vitest'
import { formatDuration, splitSessionByDay, getTimezoneOffset } from './time'

describe('formatDuration', () => {
  it('formats zero as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })
  it('formats 90 minutes correctly', () => {
    expect(formatDuration(90)).toBe('01:30:00')
  })
  it('formats 125 minutes and 30 seconds', () => {
    expect(formatDuration(125.5)).toBe('02:05:30')
  })
})

describe('splitSessionByDay', () => {
  it('returns single segment for same-day session', () => {
    const segments = splitSessionByDay(
      '2026-03-17T10:00:00Z', '2026-03-17T10:30:00Z', 0
    )
    expect(segments).toHaveLength(1)
    expect(segments[0].durationMinutes).toBe(30)
    expect(segments[0].date).toBe('2026-03-17')
  })

  it('splits midnight-spanning session into two segments', () => {
    // UTC+0: session from 23:00 to 01:00 next day
    const segments = splitSessionByDay(
      '2026-03-17T23:00:00Z', '2026-03-18T01:00:00Z', 0
    )
    expect(segments).toHaveLength(2)
    expect(segments[0].date).toBe('2026-03-17')
    expect(segments[0].durationMinutes).toBe(60)
    expect(segments[1].date).toBe('2026-03-18')
    expect(segments[1].durationMinutes).toBe(60)
  })

  it('respects timezone offset for midnight boundary', () => {
    // UTC-5 (offset=-300): 2026-03-18T02:00Z is 2026-03-17T21:00 local
    const segments = splitSessionByDay(
      '2026-03-18T02:00:00Z', '2026-03-18T04:00:00Z', -300
    )
    expect(segments).toHaveLength(1)
    expect(segments[0].date).toBe('2026-03-17')
    expect(segments[0].durationMinutes).toBe(120)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/time.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/time.ts`**

```typescript
import { DaySegment } from '../types'

/** Format total minutes (with fractional seconds) as HH:MM:SS */
export function formatDuration(totalMinutes: number): string {
  const totalSeconds = Math.floor(totalMinutes * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

/** Returns current timezone offset in minutes (e.g. -300 for UTC-5) */
export function getTimezoneOffset(): number {
  return -new Date().getTimezoneOffset()
}

/** Parse a UTC ISO string and apply a minutes offset to get local Date */
export function toLocalDate(utcIso: string, offsetMinutes: number): Date {
  const utc = new Date(utcIso).getTime()
  return new Date(utc + offsetMinutes * 60_000)
}

/** Format a local Date as YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Split a session by local-time day boundaries.
 * offsetMinutes: the session's start timezone offset (minutes from UTC).
 * Returns one DaySegment per local day the session spans.
 */
export function splitSessionByDay(
  startTime: string,
  endTime: string,
  offsetMinutes: number,
  sessionId = ''
): DaySegment[] {
  const segments: DaySegment[] = []

  // Work in shifted UTC (i.e., local time expressed as UTC)
  let current = toLocalDate(startTime, offsetMinutes)
  const end = toLocalDate(endTime, offsetMinutes)

  while (current < end) {
    // Next midnight in shifted-UTC space
    const nextMidnight = new Date(current)
    nextMidnight.setUTCHours(24, 0, 0, 0)

    const segmentEnd = end < nextMidnight ? end : nextMidnight
    const durationMinutes = (segmentEnd.getTime() - current.getTime()) / 60_000

    segments.push({
      date: formatDateKey(current),
      durationMinutes,
      sessionId,
    })

    current = nextMidnight
  }

  return segments
}

/** Difference in minutes between two UTC ISO strings */
export function diffMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000
}

/** Returns current UTC ISO 8601 string */
export function nowISO(): string {
  return new Date().toISOString()
}

/** Adds minutes to a UTC ISO string, returns new ISO string */
export function addMinutes(isoString: string, minutes: number): string {
  return new Date(new Date(isoString).getTime() + minutes * 60_000).toISOString()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/time.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/time.ts src/utils/time.test.ts
git commit -m "feat: add time utilities with midnight-split logic"
```

---

### Task 4: Stats utilities

**Files:**
- Create: `src/utils/stats.ts`
- Create: `src/utils/stats.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/utils/stats.test.ts
import { describe, it, expect } from 'vitest'
import { computeDailyStats, computeStreak } from './stats'
import { DaySegment } from '../types'

const GOAL_MINUTES = 1320 // 22h

describe('computeDailyStats', () => {
  it('returns 0% off-time with no sessions', () => {
    const stats = computeDailyStats('2026-03-17', [], GOAL_MINUTES)
    expect(stats.totalOffMinutes).toBe(0)
    expect(stats.wearPercentage).toBeCloseTo(100)
    expect(stats.compliant).toBe(true)
  })

  it('correctly computes stats for two sessions', () => {
    const segments: DaySegment[] = [
      { date: '2026-03-17', durationMinutes: 30, sessionId: 'a' },
      { date: '2026-03-17', durationMinutes: 25, sessionId: 'b' },
    ]
    const stats = computeDailyStats('2026-03-17', segments, GOAL_MINUTES)
    expect(stats.totalOffMinutes).toBe(55)
    expect(stats.removals).toBe(2)
    expect(stats.longestRemovalMinutes).toBe(30)
    // wear% = (1440 - 55) / 1440 * 100
    expect(stats.wearPercentage).toBeCloseTo((1440 - 55) / 1440 * 100)
    expect(stats.compliant).toBe(true) // 55min off < 120min threshold
  })

  it('marks non-compliant when off-time exceeds goal threshold', () => {
    const segments: DaySegment[] = [
      { date: '2026-03-17', durationMinutes: 130, sessionId: 'a' },
    ]
    const stats = computeDailyStats('2026-03-17', segments, GOAL_MINUTES)
    expect(stats.compliant).toBe(false)
  })
})

describe('computeStreak', () => {
  it('returns 0 for no stats', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns correct streak for consecutive compliant days', () => {
    const stats = [
      { date: '2026-03-15', compliant: true },
      { date: '2026-03-16', compliant: true },
      { date: '2026-03-17', compliant: true },
    ]
    expect(computeStreak(stats)).toBe(3)
  })

  it('resets streak on non-compliant day', () => {
    const stats = [
      { date: '2026-03-14', compliant: true },
      { date: '2026-03-15', compliant: false },
      { date: '2026-03-16', compliant: true },
      { date: '2026-03-17', compliant: true },
    ]
    expect(computeStreak(stats)).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/stats.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/utils/stats.ts`**

```typescript
import { DailyStats, DaySegment } from '../types'

const MINUTES_PER_DAY = 1440

export function computeDailyStats(
  date: string,
  segments: DaySegment[],
  goalMinutes: number
): DailyStats {
  const daySegments = segments.filter(s => s.date === date)
  const totalOffMinutes = daySegments.reduce((sum, s) => sum + s.durationMinutes, 0)
  const wearMinutes = MINUTES_PER_DAY - totalOffMinutes
  const wearPercentage = (wearMinutes / MINUTES_PER_DAY) * 100
  const longestRemovalMinutes = daySegments.reduce(
    (max, s) => Math.max(max, s.durationMinutes), 0
  )
  const maxOffMinutes = MINUTES_PER_DAY - goalMinutes

  return {
    date,
    totalOffMinutes,
    wearPercentage,
    removals: daySegments.length,
    longestRemovalMinutes,
    compliant: totalOffMinutes <= maxOffMinutes,
  }
}

export function computeStreak(
  stats: Pick<DailyStats, 'date' | 'compliant'>[]
): number {
  const sorted = [...stats].sort((a, b) => a.date.localeCompare(b.date))
  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].compliant) streak++
    else break
  }
  return streak
}

export function computeAverageWear(stats: DailyStats[]): number {
  if (stats.length === 0) return 100
  return stats.reduce((sum, s) => sum + s.wearPercentage, 0) / stats.length
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/utils/stats.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: add stats utilities (daily stats, streak computation)"
```

---

### Task 5: Device ID and CSV utilities

**Files:**
- Create: `src/utils/deviceId.ts`
- Create: `src/utils/csv.ts`

- [ ] **Step 1: Implement `src/utils/deviceId.ts`**

```typescript
const KEY = 'alignertrack_device_id'

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
```

- [ ] **Step 2: Implement `src/utils/csv.ts`**

```typescript
import { Session } from '../types'

export function sessionsToCSV(sessions: Session[]): string {
  const header = [
    'id', 'startTime', 'endTime', 'durationMinutes',
    'setNumber', 'autoCapped', 'createdOffline',
  ].join(',')

  const rows = sessions
    .filter(s => s.endTime !== null)
    .map(s => {
      const duration = s.endTime
        ? ((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000).toFixed(1)
        : ''
      return [
        s.id, s.startTime, s.endTime, duration,
        s.setNumber, s.autoCapped, s.createdOffline,
      ].join(',')
    })

  return [header, ...rows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/deviceId.ts src/utils/csv.ts
git commit -m "feat: add device ID persistence and CSV export utilities"
```

---

## Phase 3 — Data Services

### Task 6: Firebase service

**Files:**
- Create: `src/services/firebase.ts`

- [ ] **Step 1: Implement `src/services/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
} from 'firebase/auth'
import {
  getDatabase, ref, set, update, remove, get, onValue, push,
} from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app)
export const googleProvider = new GoogleAuthProvider()

// Auth helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signOutUser = () => signOut(auth)

// DB path helpers
export const userRef = (uid: string) => ref(db, `users/${uid}`)
export const profileRef = (uid: string) => ref(db, `users/${uid}/profile`)
export const treatmentRef = (uid: string) => ref(db, `users/${uid}/treatment`)
export const sessionsRef = (uid: string) => ref(db, `users/${uid}/sessions`)
export const sessionRef = (uid: string, id: string) => ref(db, `users/${uid}/sessions/${id}`)
export const setsRef = (uid: string) => ref(db, `users/${uid}/sets`)
export const setRef = (uid: string, id: string) => ref(db, `users/${uid}/sets/${id}`)

export { set, update, remove, get, onValue, push, ref }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase.ts
git commit -m "feat: add Firebase service with auth and DB helpers"
```

---

### Task 7: IndexedDB (Dexie) setup

**Files:**
- Create: `src/services/db.ts`

- [ ] **Step 1: Implement `src/services/db.ts`**

```typescript
import Dexie, { Table } from 'dexie'
import { Session, AlignerSet, UserProfile, Treatment, SyncQueueItem } from '../types'

interface LocalProfile extends UserProfile { uid: string }
interface LocalTreatment extends Treatment { uid: string }

export class AppDB extends Dexie {
  sessions!: Table<Session & { uid: string }>
  sets!: Table<AlignerSet & { uid: string }>
  profile!: Table<LocalProfile>
  treatment!: Table<LocalTreatment>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('AlignerTrackDB')
    this.version(1).stores({
      sessions: 'id, uid, startTime, endTime, setNumber, updatedAt',
      sets: 'id, uid, setNumber, startDate',
      profile: 'uid',
      treatment: 'uid',
      syncQueue: '++id, timestamp, deviceId',
    })
  }
}

export const localDB = new AppDB()
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db.ts
git commit -m "feat: add Dexie IndexedDB schema"
```

---

### Task 8: Sync manager

**Files:**
- Create: `src/services/syncManager.ts`

- [ ] **Step 1: Implement `src/services/syncManager.ts`**

```typescript
import { ref, set, update, remove, db } from './firebase'
import { localDB } from './db'
import { SyncQueueItem } from '../types'

const MAX_RETRIES = 3

async function executeOperation(item: SyncQueueItem): Promise<void> {
  const fbRef = ref(db, item.path)
  switch (item.operation) {
    case 'set':
      await set(fbRef, item.data)
      break
    case 'update':
      await update(fbRef, item.data as object)
      break
    case 'delete':
      await remove(fbRef)
      break
  }
}

export async function drainSyncQueue(): Promise<void> {
  const items = await localDB.syncQueue.orderBy('timestamp').toArray()
  for (const item of items) {
    let attempts = 0
    while (attempts < MAX_RETRIES) {
      try {
        await executeOperation(item)
        await localDB.syncQueue.delete(item.id!)
        break
      } catch (err) {
        attempts++
        if (attempts < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000))
        }
      }
    }
  }
}

export async function queueWrite(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  await localDB.syncQueue.add(item)
}

export function getSyncQueueCount(): Promise<number> {
  return localDB.syncQueue.count()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/syncManager.ts
git commit -m "feat: add offline sync queue manager with retry logic"
```

---

### Task 9: Notifications service

**Files:**
- Create: `src/services/notifications.ts`

- [ ] **Step 1: Implement `src/services/notifications.ts`**

```typescript
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

let scheduledTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleReminderNotification(thresholdMinutes: number): void {
  cancelScheduledNotification()
  if (Notification.permission !== 'granted') return

  scheduledTimer = setTimeout(() => {
    new Notification('AlignerTrack Reminder', {
      body: `Your aligners have been out for ${thresholdMinutes} minutes!`,
      icon: '/invisalign/icon-192.png',
    })
  }, thresholdMinutes * 60 * 1000)
}

export function cancelScheduledNotification(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer)
    scheduledTimer = null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/notifications.ts
git commit -m "feat: add notification scheduling service"
```

---

## Phase 4 — Auth & Sync Contexts

### Task 10: AuthContext

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Implement `src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth, signInWithGoogle, signOutUser } from '../services/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn: async () => { await signInWithGoogle() },
      signOut: async () => {
        await signOutUser()
        // Clear local data on sign-out
        const { localDB } = await import('../services/db')
        await localDB.sessions.clear()
        await localDB.sets.clear()
        await localDB.profile.clear()
        await localDB.treatment.clear()
        await localDB.syncQueue.clear()
      },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Implement `src/hooks/useAuth.ts`**

```typescript
export { useAuthContext as useAuth } from '../contexts/AuthContext'
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAuth.ts
git commit -m "feat: add AuthContext with Google sign-in and sign-out"
```

---

### Task 11: SyncContext and useOnlineStatus

**Files:**
- Create: `src/hooks/useOnlineStatus.ts`
- Create: `src/contexts/SyncContext.tsx`
- Create: `src/hooks/useSync.ts`

- [ ] **Step 1: Implement `src/hooks/useOnlineStatus.ts`**

```typescript
import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}
```

- [ ] **Step 2: Implement `src/contexts/SyncContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ref, onValue, db } from '../services/firebase'
import { drainSyncQueue, getSyncQueueCount } from '../services/syncManager'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncContextValue {
  status: SyncStatus
  queueCount: number
  triggerSync: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const online = useOnlineStatus()
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [queueCount, setQueueCount] = useState(0)

  const triggerSync = async () => {
    if (!online) return
    setStatus('syncing')
    try {
      await drainSyncQueue()
      setQueueCount(await getSyncQueueCount())
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  // Auto-sync when coming back online
  useEffect(() => {
    if (online) triggerSync()
    else setStatus('offline')
  }, [online])

  // Also sync when Firebase reports connected
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected')
    return onValue(connectedRef, snap => {
      if (snap.val() === true) triggerSync()
    })
  }, [])

  return (
    <SyncContext.Provider value={{ status, queueCount, triggerSync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSyncContext must be inside SyncProvider')
  return ctx
}
```

- [ ] **Step 3: Implement `src/hooks/useSync.ts`**

```typescript
export { useSyncContext as useSync } from '../contexts/SyncContext'
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useOnlineStatus.ts src/contexts/SyncContext.tsx src/hooks/useSync.ts
git commit -m "feat: add SyncContext with online detection and auto-drain"
```

---

### Task 12: DataContext

**Files:**
- Create: `src/contexts/DataContext.tsx`

- [ ] **Step 1: Implement `src/contexts/DataContext.tsx`**

```typescript
import {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from 'react'
import { onValue, sessionsRef, setsRef, profileRef, treatmentRef } from '../services/firebase'
import { localDB } from '../services/db'
import { Session, AlignerSet, UserProfile, Treatment } from '../types'

interface DataContextValue {
  sessions: Session[]
  sets: AlignerSet[]
  profile: UserProfile | null
  treatment: Treatment | null
  loaded: boolean
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sets, setSets] = useState<AlignerSet[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [treatment, setTreatment] = useState<Treatment | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load from local IndexedDB first (instant)
  useEffect(() => {
    Promise.all([
      localDB.sessions.where('uid').equals(uid).toArray(),
      localDB.sets.where('uid').equals(uid).toArray(),
      localDB.profile.get(uid),
      localDB.treatment.get(uid),
    ]).then(([s, sets, p, t]) => {
      setSessions(s)
      setSets(sets)
      setProfile(p ?? null)
      setTreatment(t ?? null)
      setLoaded(true)
    })
  }, [uid])

  // Subscribe to Firebase (real-time updates)
  useEffect(() => {
    const unsubSessions = onValue(sessionsRef(uid), snap => {
      const data = snap.val() ?? {}
      const arr: Session[] = Object.entries(data).map(([id, v]) => ({ id, ...(v as object) } as Session))
      setSessions(arr)
      arr.forEach(s => localDB.sessions.put({ ...s, uid }))
    })

    const unsubSets = onValue(setsRef(uid), snap => {
      const data = snap.val() ?? {}
      const arr: AlignerSet[] = Object.entries(data).map(([id, v]) => ({ id, ...(v as object) } as AlignerSet))
      setSets(arr)
      arr.forEach(s => localDB.sets.put({ ...s, uid }))
    })

    const unsubProfile = onValue(profileRef(uid), snap => {
      const p = snap.val() as UserProfile | null
      if (p) {
        setProfile(p)
        localDB.profile.put({ ...p, uid })
      }
    })

    const unsubTreatment = onValue(treatmentRef(uid), snap => {
      const t = snap.val() as Treatment | null
      if (t) {
        setTreatment(t)
        localDB.treatment.put({ ...t, uid })
      }
    })

    return () => { unsubSessions(); unsubSets(); unsubProfile(); unsubTreatment() }
  }, [uid])

  return (
    <DataContext.Provider value={{ sessions, sets, profile, treatment, loaded }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useDataContext must be inside DataProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/DataContext.tsx
git commit -m "feat: add DataContext with IndexedDB-first + Firebase real-time sync"
```

---

## Phase 5 — Core Hooks

### Task 13: useSessions hook

**Files:**
- Create: `src/hooks/useSessions.ts`

- [ ] **Step 1: Implement `src/hooks/useSessions.ts`**

```typescript
import { useCallback } from 'react'
import { push, set, update, remove, sessionsRef, sessionRef } from '../services/firebase'
import { localDB } from '../services/db'
import { queueWrite } from '../services/syncManager'
import { useDataContext } from '../contexts/DataContext'
import { useAuthContext } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'
import { getDeviceId } from '../utils/deviceId'
import { nowISO, getTimezoneOffset } from '../utils/time'
import { Session } from '../types'

export function useSessions() {
  const { user } = useAuthContext()
  const { sessions } = useDataContext()
  const online = useOnlineStatus()
  const uid = user!.uid
  const deviceId = getDeviceId()

  const writeSession = useCallback(async (path: string, data: unknown, isNew = false) => {
    const operation = isNew ? 'set' : 'update'
    // Always write locally
    if (isNew) {
      const [, , , id] = path.split('/')
      await localDB.sessions.put({ ...(data as Session), uid, id })
    } else {
      const [, , , id] = path.split('/')
      await localDB.sessions.update(id, data as Partial<Session>)
    }

    if (online) {
      const fbRef = require('../services/firebase').ref(require('../services/firebase').db, path)
      if (operation === 'set') await set(fbRef, data)
      else await update(fbRef, data as object)
    } else {
      await queueWrite({ operation, path, data, timestamp: nowISO(), deviceId })
    }
  }, [uid, online, deviceId])

  const startSession = useCallback(async (setNumber: number): Promise<string> => {
    const newRef = push(sessionsRef(uid))
    const id = newRef.key!
    const session: Session = {
      id,
      startTime: nowISO(),
      endTime: null,
      startTimezoneOffset: getTimezoneOffset(),
      endTimezoneOffset: null,
      setNumber,
      autoCapped: false,
      createdOffline: !online,
      deviceId,
      updatedAt: nowISO(),
    }
    await writeSession(`users/${uid}/sessions/${id}`, session, true)
    return id
  }, [uid, online, deviceId, writeSession])

  const stopSession = useCallback(async (sessionId: string) => {
    const endTime = nowISO()
    const updates = {
      endTime,
      endTimezoneOffset: getTimezoneOffset(),
      updatedAt: endTime,
    }
    await writeSession(`users/${uid}/sessions/${sessionId}`, updates)
  }, [uid, writeSession])

  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<Pick<Session, 'startTime' | 'endTime'>>
  ) => {
    // Validate
    if (updates.startTime && updates.endTime) {
      if (new Date(updates.endTime) <= new Date(updates.startTime)) {
        throw new Error('End time must be after start time.')
      }
      const durationMs = new Date(updates.endTime).getTime() - new Date(updates.startTime).getTime()
      if (durationMs > 24 * 60 * 60 * 1000) {
        throw new Error('Session cannot be longer than 24 hours.')
      }
      // Check for overlaps with other sessions
      const others = sessions.filter(s => s.id !== sessionId && s.endTime !== null)
      const overlap = others.find(s => {
        const sStart = new Date(s.startTime).getTime()
        const sEnd = new Date(s.endTime!).getTime()
        const newStart = new Date(updates.startTime!).getTime()
        const newEnd = new Date(updates.endTime!).getTime()
        return newStart < sEnd && newEnd > sStart
      })
      if (overlap) {
        throw new Error(`This session overlaps with another session. Please adjust the times.`)
      }
    }
    await writeSession(`users/${uid}/sessions/${sessionId}`, { ...updates, updatedAt: nowISO() })
  }, [uid, sessions, writeSession])

  const deleteSession = useCallback(async (sessionId: string) => {
    await localDB.sessions.delete(sessionId)
    if (online) {
      const { ref: fbRef, db: fbDb, remove: fbRemove } = await import('../services/firebase')
      await fbRemove(fbRef(fbDb, `users/${uid}/sessions/${sessionId}`))
    } else {
      await queueWrite({
        operation: 'delete',
        path: `users/${uid}/sessions/${sessionId}`,
        data: null,
        timestamp: nowISO(),
        deviceId,
      })
    }
  }, [uid, online, deviceId])

  const addManualSession = useCallback(async (
    startTime: string,
    endTime: string,
    setNumber: number
  ) => {
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime()
    if (durationMs <= 0) throw new Error('End time must be after start time.')
    if (durationMs > 24 * 60 * 60 * 1000) throw new Error('Session cannot be longer than 24 hours.')

    const others = sessions.filter(s => s.endTime !== null)
    const overlap = others.find(s => {
      const sStart = new Date(s.startTime).getTime()
      const sEnd = new Date(s.endTime!).getTime()
      const newStart = new Date(startTime).getTime()
      const newEnd = new Date(endTime).getTime()
      return newStart < sEnd && newEnd > sStart
    })
    if (overlap) throw new Error('This session overlaps with an existing session.')

    const newRef = push(sessionsRef(uid))
    const id = newRef.key!
    const session: Session = {
      id,
      startTime,
      endTime,
      startTimezoneOffset: getTimezoneOffset(),
      endTimezoneOffset: getTimezoneOffset(),
      setNumber,
      autoCapped: false,
      createdOffline: !online,
      deviceId,
      updatedAt: nowISO(),
    }
    await writeSession(`users/${uid}/sessions/${id}`, session, true)
  }, [uid, online, sessions, deviceId, writeSession])

  return { sessions, startSession, stopSession, updateSession, deleteSession, addManualSession }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSessions.ts
git commit -m "feat: add useSessions hook with CRUD + validation + offline support"
```

---

### Task 14: useTimer hook

**Files:**
- Create: `src/hooks/useTimer.ts`

- [ ] **Step 1: Implement `src/hooks/useTimer.ts`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSessions } from './useSessions'
import { useDataContext } from '../contexts/DataContext'
import { scheduleReminderNotification, cancelScheduledNotification } from '../services/notifications'
import { diffMinutes, addMinutes, nowISO } from '../utils/time'

interface TimerState {
  activeSessionId: string | null
  elapsedMinutes: number
  isRunning: boolean
  reminderFired: boolean
  autoCapped: boolean
}

export function useTimer(
  reminderThresholdMinutes: number,
  autoCapMinutes: number,
  currentSetNumber: number
) {
  const { sessions, startSession, stopSession } = useSessions()
  const [timerState, setTimerState] = useState<TimerState>({
    activeSessionId: null,
    elapsedMinutes: 0,
    isRunning: false,
    reminderFired: false,
    autoCapped: false,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Find the active session on mount / data change
  const activeSession = sessions.find(s => s.endTime === null) ?? null

  // Auto-cap check on mount
  useEffect(() => {
    if (!activeSession) return
    const elapsed = diffMinutes(activeSession.startTime, nowISO())
    if (elapsed >= autoCapMinutes) {
      // Auto-cap it
      const cappedEndTime = addMinutes(activeSession.startTime, autoCapMinutes)
      stopSession(activeSession.id)
      setTimerState(s => ({ ...s, autoCapped: true, isRunning: false }))
    }
  }, [activeSession?.id])

  // Tick every second
  useEffect(() => {
    if (!activeSession) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setTimerState(s => ({ ...s, isRunning: false, elapsedMinutes: 0, activeSessionId: null }))
      return
    }

    setTimerState(s => ({ ...s, isRunning: true, activeSessionId: activeSession.id }))

    const tick = () => {
      const elapsed = diffMinutes(activeSession.startTime, nowISO())
      setTimerState(s => {
        const newState = { ...s, elapsedMinutes: elapsed }

        // Reminder at threshold
        if (!s.reminderFired && elapsed >= reminderThresholdMinutes) {
          newState.reminderFired = true
          // Play sound (best effort)
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            osc.connect(ctx.destination)
            osc.frequency.value = 880
            osc.start()
            osc.stop(ctx.currentTime + 0.3)
          } catch {}
        }

        // Auto-cap
        if (elapsed >= autoCapMinutes) {
          stopSession(activeSession.id)
          newState.isRunning = false
          newState.autoCapped = true
        }

        return newState
      })
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeSession?.id])

  const start = useCallback(async () => {
    const id = await startSession(currentSetNumber)
    scheduleReminderNotification(reminderThresholdMinutes)
    setTimerState({
      activeSessionId: id,
      elapsedMinutes: 0,
      isRunning: true,
      reminderFired: false,
      autoCapped: false,
    })
  }, [startSession, currentSetNumber, reminderThresholdMinutes])

  const stop = useCallback(async () => {
    if (!activeSession) return
    cancelScheduledNotification()
    await stopSession(activeSession.id)
    setTimerState(s => ({ ...s, isRunning: false, reminderFired: false }))
  }, [activeSession, stopSession])

  return { ...timerState, start, stop }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTimer.ts
git commit -m "feat: add useTimer hook with auto-cap, reminder, and ticking logic"
```

---

### Task 15: useSets and useReports hooks

**Files:**
- Create: `src/hooks/useSets.ts`
- Create: `src/hooks/useReports.ts`

- [ ] **Step 1: Implement `src/hooks/useSets.ts`**

```typescript
import { useCallback } from 'react'
import { push, set, update, setsRef, treatmentRef } from '../services/firebase'
import { localDB } from '../services/db'
import { queueWrite } from '../services/syncManager'
import { useDataContext } from '../contexts/DataContext'
import { useAuthContext } from '../contexts/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'
import { getDeviceId } from '../utils/deviceId'
import { nowISO } from '../utils/time'
import { AlignerSet, Treatment } from '../types'

export function useSets() {
  const { user } = useAuthContext()
  const { sets, treatment } = useDataContext()
  const online = useOnlineStatus()
  const uid = user!.uid
  const deviceId = getDeviceId()

  const startNewSet = useCallback(async (setNumber: number) => {
    const now = nowISO()
    // Close current set if exists
    if (treatment?.currentSetNumber) {
      const currentSet = sets.find(s => s.setNumber === treatment.currentSetNumber)
      if (currentSet) {
        const { ref, db } = await import('../services/firebase')
        const path = `users/${uid}/sets/${currentSet.id}`
        const updates = { endDate: now }
        await localDB.sets.update(currentSet.id, updates)
        if (online) await update(ref(db, path), updates)
        else await queueWrite({ operation: 'update', path, data: updates, timestamp: now, deviceId })
      }
    }

    // Create new set
    const { ref, db } = await import('../services/firebase')
    const newRef = push(setsRef(uid))
    const id = newRef.key!
    const newSet: AlignerSet = {
      id,
      setNumber,
      startDate: now,
      endDate: null,
      durationDaysOverride: null,
      note: null,
    }
    await localDB.sets.put({ ...newSet, uid })
    const path = `users/${uid}/sets/${id}`
    if (online) await set(ref(db, path), newSet)
    else await queueWrite({ operation: 'set', path, data: newSet, timestamp: now, deviceId })

    // Update treatment
    const treatmentUpdates: Partial<Treatment> = { currentSetNumber: setNumber, currentSetStartDate: now }
    await localDB.treatment.update(uid, treatmentUpdates)
    const treatPath = `users/${uid}/treatment`
    if (online) await update(ref(db, treatPath), treatmentUpdates)
    else await queueWrite({ operation: 'update', path: treatPath, data: treatmentUpdates, timestamp: now, deviceId })
  }, [uid, online, deviceId, sets, treatment])

  const updateTreatment = useCallback(async (updates: Partial<Treatment>) => {
    const { ref, db, update: fbUpdate } = await import('../services/firebase')
    const path = `users/${uid}/treatment`
    await localDB.treatment.update(uid, updates)
    if (online) await fbUpdate(ref(db, path), updates)
    else await queueWrite({ operation: 'update', path, data: updates, timestamp: nowISO(), deviceId })
  }, [uid, online, deviceId])

  return { sets, treatment, startNewSet, updateTreatment }
}
```

- [ ] **Step 2: Implement `src/hooks/useReports.ts`**

```typescript
import { useMemo } from 'react'
import { useDataContext } from '../contexts/DataContext'
import { splitSessionByDay } from '../utils/time'
import { computeDailyStats, computeStreak, computeAverageWear } from '../utils/stats'
import { DailyStats, Session } from '../types'

function getSegmentsForSessions(sessions: Session[]) {
  return sessions
    .filter(s => s.endTime !== null)
    .flatMap(s => splitSessionByDay(s.startTime, s.endTime!, s.startTimezoneOffset, s.id))
}

export function useReports(goalMinutes: number) {
  const { sessions, sets } = useDataContext()

  const allSegments = useMemo(() => getSegmentsForSessions(sessions), [sessions])

  const getDailyStatsRange = (dates: string[]): DailyStats[] =>
    dates.map(date => computeDailyStats(date, allSegments, goalMinutes))

  const streak = useMemo(() => {
    const uniqueDates = [...new Set(allSegments.map(s => s.date))].sort()
    const statsArr = uniqueDates.map(d => computeDailyStats(d, allSegments, goalMinutes))
    return computeStreak(statsArr)
  }, [allSegments, goalMinutes])

  const getSetStats = (setNumber: number) => {
    const setSessions = sessions.filter(s => s.setNumber === setNumber && s.endTime !== null)
    const setSegments = getSegmentsForSessions(setSessions)
    const uniqueDates = [...new Set(setSegments.map(s => s.date))]
    const statsArr = uniqueDates.map(d => computeDailyStats(d, setSegments, goalMinutes))
    return {
      avgWearPct: computeAverageWear(statsArr),
      totalRemovals: setSessions.length,
      complianceDays: statsArr.filter(s => s.compliant).length,
      avgRemovalsPerDay: statsArr.length > 0 ? setSessions.length / statsArr.length : 0,
    }
  }

  return { getDailyStatsRange, streak, getSetStats, allSegments }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSets.ts src/hooks/useReports.ts
git commit -m "feat: add useSets and useReports hooks"
```

---

## Phase 6 — App Shell & Routing

### Task 16: App entry point, routing, and layout

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/views/LoginView.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Implement `src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Implement `src/App.tsx`**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SyncProvider } from './contexts/SyncContext'
import AppShell from './components/layout/AppShell'
import LoginView from './views/LoginView'
import HomeView from './views/HomeView'
import HistoryView from './views/HistoryView'
import ReportsView from './views/ReportsView'
import SettingsPageView from './views/SettingsView'

function AuthenticatedApp() {
  const { user, loading } = useAuthContext()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  if (!user) return <LoginView />

  return (
    <DataProvider uid={user.uid}>
      <SyncProvider uid={user.uid}>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/settings" element={<SettingsPageView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </SyncProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Implement `src/views/LoginView.tsx`**

```typescript
import { useAuthContext } from '../contexts/AuthContext'

export default function LoginView() {
  const { signIn } = useAuthContext()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-600">AlignerTrack</h1>
        <p className="text-gray-500 mt-2">Track your Invisalign wear time</p>
      </div>
      <button
        onClick={signIn}
        className="flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3 shadow-sm hover:shadow-md transition-shadow text-sm font-medium"
      >
        Sign in with Google
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/layout/BottomNav.tsx`**

```typescript
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/history', icon: '📋', label: 'History' },
  { to: '/reports', icon: '📊', label: 'Reports' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs gap-1 min-h-[48px] justify-center ` +
            (isActive ? 'text-indigo-600' : 'text-gray-400')
          }
        >
          <span className="text-xl">{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Implement `src/components/layout/AppShell.tsx`**

```typescript
import { ReactNode } from 'react'
import BottomNav from './BottomNav'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-16 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 6: Create stub views for history, reports, settings**

```typescript
// src/views/HistoryView.tsx
export default function HistoryView() {
  return <div className="p-4"><h2 className="text-xl font-bold">History</h2></div>
}

// src/views/ReportsView.tsx
export default function ReportsView() {
  return <div className="p-4"><h2 className="text-xl font-bold">Reports</h2></div>
}

// src/views/SettingsView.tsx
export default function SettingsPageView() {
  return <div className="p-4"><h2 className="text-xl font-bold">Settings</h2></div>
}
```

- [ ] **Step 7: Run dev server — verify login page renders**

```bash
npm run dev
```
Open `http://localhost:5173/invisalign/` — you should see the Google sign-in screen.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add app shell, routing, and login view"
```

---

## Phase 7 — Timer & Home Screen Components

### Task 17: Timer components

**Files:**
- Create: `src/components/timer/ActiveTimer.tsx`
- Create: `src/components/timer/TimerButton.tsx`
- Create: `src/components/timer/TimerAlert.tsx`

- [ ] **Step 1: Implement `src/components/timer/ActiveTimer.tsx`**

```typescript
import { formatDuration } from '../../utils/time'

interface Props {
  elapsedMinutes: number
  reminderFired: boolean
}

export default function ActiveTimer({ elapsedMinutes, reminderFired }: Props) {
  return (
    <div className={`text-center py-6 rounded-2xl transition-colors ${reminderFired ? 'bg-red-50' : 'bg-indigo-50'}`}>
      <div className={`text-5xl font-mono font-bold tabular-nums animate-pulse ${reminderFired ? 'text-red-600' : 'text-indigo-600'}`}>
        {formatDuration(elapsedMinutes)}
      </div>
      <div className={`text-sm mt-2 ${reminderFired ? 'text-red-400' : 'text-indigo-400'}`}>
        Aligners Out
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/components/timer/TimerButton.tsx`**

```typescript
interface Props {
  isRunning: boolean
  onPress: () => void
  disabled?: boolean
}

export default function TimerButton({ isRunning, onPress, disabled }: Props) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`
        w-40 h-40 rounded-full text-white text-lg font-bold shadow-lg
        active:scale-95 transition-transform
        disabled:opacity-50
        ${isRunning
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-indigo-500 hover:bg-indigo-600'
        }
      `}
    >
      {isRunning ? 'PUT BACK' : 'REMOVE\nALIGNERS'}
    </button>
  )
}
```

- [ ] **Step 3: Implement `src/components/timer/TimerAlert.tsx`**

```typescript
interface Props {
  thresholdMinutes: number
  onDismiss: () => void
}

export default function TimerAlert({ thresholdMinutes, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
        <div className="text-4xl mb-3">⏰</div>
        <h2 className="text-xl font-bold text-red-600 mb-2">Put Your Aligners Back!</h2>
        <p className="text-gray-600 mb-4">
          Your aligners have been out for {thresholdMinutes} minutes.
        </p>
        <button
          onClick={onDismiss}
          className="bg-indigo-500 text-white rounded-xl px-6 py-3 font-semibold w-full"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/timer/
git commit -m "feat: add ActiveTimer, TimerButton, and TimerAlert components"
```

---

### Task 18: Dashboard components

**Files:**
- Create: `src/components/dashboard/DailySummary.tsx`
- Create: `src/components/dashboard/SessionList.tsx`
- Create: `src/components/dashboard/SessionCard.tsx` (moved here initially)
- Create: `src/components/dashboard/StreakBadge.tsx`
- Create: `src/components/dashboard/TreatmentProgress.tsx`

- [ ] **Step 1: Implement `src/components/dashboard/StreakBadge.tsx`**

```typescript
interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  if (streak === 0) return null
  return (
    <div className="flex items-center gap-1 text-amber-600 font-semibold">
      <span>🔥</span>
      <span>{streak} day{streak !== 1 ? 's' : ''}</span>
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/components/dashboard/DailySummary.tsx`**

```typescript
import { formatDuration } from '../../utils/time'
import StreakBadge from './StreakBadge'

interface Props {
  totalOffMinutes: number
  removals: number
  goalMinutes: number
  streak: number
}

export default function DailySummary({ totalOffMinutes, removals, goalMinutes, streak }: Props) {
  const maxOffMinutes = 1440 - goalMinutes
  const budgetRemainingMinutes = Math.max(0, maxOffMinutes - totalOffMinutes)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-700">Today</h3>
        <StreakBadge streak={streak} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-800">{formatDuration(totalOffMinutes)}</div>
          <div className="text-xs text-gray-400 mt-1">Off Time</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800">{removals}</div>
          <div className="text-xs text-gray-400 mt-1">Removals</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${budgetRemainingMinutes === 0 ? 'text-red-500' : 'text-green-600'}`}>
            {formatDuration(budgetRemainingMinutes)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Budget Left</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/components/dashboard/SessionList.tsx`**

```typescript
import { Session } from '../../types'
import { formatDuration, diffMinutes } from '../../utils/time'

interface Props {
  sessions: Session[]
  onEdit: (session: Session) => void
}

function formatLocalTime(isoString: string, offsetMinutes: number): string {
  const local = new Date(new Date(isoString).getTime() + offsetMinutes * 60_000)
  return local.toUTCString().slice(17, 22) // HH:MM
}

export default function SessionList({ sessions, onEdit }: Props) {
  const completed = sessions.filter(s => s.endTime !== null)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))

  if (completed.length === 0) return (
    <p className="text-gray-400 text-center py-4 text-sm">No sessions yet today</p>
  )

  return (
    <div className="space-y-2">
      {completed.map(s => {
        const duration = diffMinutes(s.startTime, s.endTime!)
        return (
          <button
            key={s.id}
            onClick={() => onEdit(s)}
            className="w-full flex items-center justify-between bg-white rounded-xl p-3 shadow-sm text-left hover:bg-gray-50 active:bg-gray-100"
          >
            <span className="text-sm text-gray-600">
              {formatLocalTime(s.startTime, s.startTimezoneOffset)} –{' '}
              {formatLocalTime(s.endTime!, s.endTimezoneOffset ?? s.startTimezoneOffset)}
            </span>
            <div className="flex items-center gap-2">
              {s.autoCapped && <span className="text-xs text-amber-500">auto</span>}
              <span className="text-sm font-semibold text-gray-700">{formatDuration(duration)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/dashboard/TreatmentProgress.tsx`**

```typescript
import { Treatment } from '../../types'

interface Props {
  treatment: Treatment | null
  defaultSetDurationDays: number
}

function estimatedCompletion(treatment: Treatment, defaultDuration: number): string {
  if (!treatment.totalSets) return 'Unknown'
  const setsRemaining = treatment.totalSets - treatment.currentSetNumber
  const daysRemaining = setsRemaining * defaultDuration
  const completion = new Date()
  completion.setDate(completion.getDate() + daysRemaining)
  return completion.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function TreatmentProgress({ treatment, defaultSetDurationDays }: Props) {
  if (!treatment) return null

  const { currentSetNumber, totalSets, currentSetStartDate, defaultSetDurationDays: dur } = treatment
  const effectiveDuration = defaultSetDurationDays
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(currentSetStartDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const setProgress = Math.min(1, daysSinceStart / effectiveDuration)
  const overallProgress = totalSets ? (currentSetNumber - 1 + setProgress) / totalSets : null

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-600">
          Set {currentSetNumber}{totalSets ? ` of ${totalSets}` : ''}
        </span>
        {totalSets && (
          <span className="text-xs text-gray-400">
            Est. {estimatedCompletion(treatment, effectiveDuration)}
          </span>
        )}
      </div>
      {overallProgress !== null && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>
      )}
      <div className="text-xs text-gray-400 mt-1">Day {daysSinceStart + 1} of {effectiveDuration}</div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: add dashboard components (summary, sessions, streak, progress)"
```

---

### Task 19: HomeView assembly

**Files:**
- Modify: `src/views/HomeView.tsx`
- Create: `src/components/sessions/SessionEditModal.tsx`
- Create: `src/components/sessions/AddSessionModal.tsx`

- [ ] **Step 1: Implement `src/views/HomeView.tsx`**

```typescript
import { useState } from 'react'
import { useTimer } from '../hooks/useTimer'
import { useSessions } from '../hooks/useSessions'
import { useReports } from '../hooks/useReports'
import { useDataContext } from '../contexts/DataContext'
import { useAuthContext } from '../contexts/AuthContext'
import ActiveTimer from '../components/timer/ActiveTimer'
import TimerButton from '../components/timer/TimerButton'
import TimerAlert from '../components/timer/TimerAlert'
import DailySummary from '../components/dashboard/DailySummary'
import SessionList from '../components/dashboard/SessionList'
import TreatmentProgress from '../components/dashboard/TreatmentProgress'
import SessionEditModal from '../components/sessions/SessionEditModal'
import { computeDailyStats } from '../utils/stats'
import { Session } from '../types'

const DEFAULT_GOAL = 1320
const DEFAULT_REMINDER = 30
const DEFAULT_CAP = 120

export default function HomeView() {
  const { profile, treatment, loaded } = useDataContext()
  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_GOAL
  const reminderMins = profile?.reminderThresholdMinutes ?? DEFAULT_REMINDER
  const autoCapMins = profile?.autoCapMinutes ?? DEFAULT_CAP
  const currentSet = treatment?.currentSetNumber ?? 1

  const { elapsedMinutes, isRunning, reminderFired, autoCapped, start, stop } =
    useTimer(reminderMins, autoCapMins, currentSet)

  const { sessions } = useSessions()
  const { getDailyStatsRange, streak, allSegments } = useReports(goalMinutes)

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayStats = computeDailyStats(todayKey, allSegments, goalMinutes)
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.startTime)
    return d.toISOString().slice(0, 10) === todayKey
  })

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [showAlert, setShowAlert] = useState(false)

  // Show alert when reminder fires (edge: we track via reminderFired flag)
  // We use a ref to only show once per session
  const [alertShownForSession, setAlertShownForSession] = useState<string | null>(null)

  if (!loaded) return <div className="p-8 text-center text-gray-400">Loading…</div>

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex justify-between items-center pt-2">
        <h1 className="text-xl font-bold text-gray-800">AlignerTrack</h1>
        {treatment && (
          <span className="text-sm text-gray-500">
            Set {treatment.currentSetNumber}{treatment.totalSets ? `/${treatment.totalSets}` : ''}
          </span>
        )}
      </div>

      {isRunning && (
        <ActiveTimer elapsedMinutes={elapsedMinutes} reminderFired={reminderFired} />
      )}

      {autoCapped && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          Session was automatically ended after {autoCapMins} minutes.
        </div>
      )}

      <div className="flex justify-center py-2">
        <TimerButton isRunning={isRunning} onPress={isRunning ? stop : start} />
      </div>

      <DailySummary
        totalOffMinutes={todayStats.totalOffMinutes}
        removals={todayStats.removals}
        goalMinutes={goalMinutes}
        streak={streak}
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-700 text-sm">Today's Sessions</h3>
        </div>
        <SessionList sessions={todaySessions} onEdit={setEditingSession} />
      </div>

      <TreatmentProgress
        treatment={treatment}
        defaultSetDurationDays={treatment?.defaultSetDurationDays ?? 7}
      />

      {reminderFired && (
        <TimerAlert
          thresholdMinutes={reminderMins}
          onDismiss={() => {/* alert handled inline */}}
        />
      )}

      {editingSession && (
        <SessionEditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create stub `src/components/sessions/SessionEditModal.tsx`**

```typescript
import { useState } from 'react'
import { useSessions } from '../../hooks/useSessions'
import { Session } from '../../types'

interface Props {
  session: Session
  onClose: () => void
}

export default function SessionEditModal({ session, onClose }: Props) {
  const { updateSession, deleteSession } = useSessions()
  const [startTime, setStartTime] = useState(session.startTime.slice(0, 16))
  const [endTime, setEndTime] = useState(session.endTime?.slice(0, 16) ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      await updateSession(session.id, {
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
      })
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this session?')) return
    await deleteSession(session.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Edit Session</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Start Time</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full border rounded-xl p-2" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">End Time</label>
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full border rounded-xl p-2" />
        </div>
        <div className="flex gap-3">
          <button onClick={handleDelete}
            className="flex-1 bg-red-100 text-red-600 rounded-xl py-3 font-semibold">
            Delete
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-semibold">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 bg-indigo-500 text-white rounded-xl py-3 font-semibold">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create stub `src/components/sessions/AddSessionModal.tsx`**

```typescript
import { useState } from 'react'
import { useSessions } from '../../hooks/useSessions'
import { useDataContext } from '../../contexts/DataContext'

interface Props { onClose: () => void }

export default function AddSessionModal({ onClose }: Props) {
  const { addManualSession } = useSessions()
  const { treatment } = useDataContext()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    try {
      await addManualSession(
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString(),
        treatment?.currentSetNumber ?? 1
      )
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Add Missed Session</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Start Time</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full border rounded-xl p-2" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">End Time</label>
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full border rounded-xl p-2" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-semibold">Cancel</button>
          <button onClick={handleAdd} className="flex-1 bg-indigo-500 text-white rounded-xl py-3 font-semibold">Add</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run dev server and manually verify home screen**

```bash
npm run dev
```
Sign in → verify timer button, daily summary, treatment progress render.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: assemble HomeView with timer, daily summary, and session list"
```

---

## Phase 8 — History, Reports, and Settings Views

### Task 20: History view

**Files:**
- Modify: `src/views/HistoryView.tsx`

- [ ] **Step 1: Implement full `src/views/HistoryView.tsx`**

```typescript
import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import SessionList from '../components/dashboard/SessionList'
import SessionEditModal from '../components/sessions/SessionEditModal'
import AddSessionModal from '../components/sessions/AddSessionModal'
import { Session } from '../types'

export default function HistoryView() {
  const { sessions } = useSessions()
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Group sessions by date
  const byDate = sessions
    .filter(s => s.endTime !== null)
    .reduce<Record<string, Session[]>>((acc, s) => {
      const date = s.startTime.slice(0, 10)
      acc[date] = [...(acc[date] ?? []), s]
      return acc
    }, {})

  const sortedDates = Object.keys(byDate).sort().reverse()

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex justify-between items-center pt-2">
        <h1 className="text-xl font-bold text-gray-800">History</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm text-indigo-500 font-semibold"
        >
          + Add
        </button>
      </div>

      {sortedDates.map(date => (
        <div key={date}>
          <div className="text-sm font-semibold text-gray-500 mb-2">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <SessionList sessions={byDate[date]} onEdit={setEditingSession} />
        </div>
      ))}

      {editingSession && <SessionEditModal session={editingSession} onClose={() => setEditingSession(null)} />}
      {showAdd && <AddSessionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/HistoryView.tsx
git commit -m "feat: implement History view with grouped sessions and add/edit modals"
```

---

### Task 21: Reports view and chart

**Files:**
- Modify: `src/views/ReportsView.tsx`
- Create: `src/components/reports/WearChart.tsx`
- Create: `src/components/reports/StatsGrid.tsx`
- Create: `src/components/reports/SetReportCard.tsx`

- [ ] **Step 1: Implement `src/components/reports/WearChart.tsx`**

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { DailyStats } from '../../types'

interface Props { data: DailyStats[] }

export default function WearChart({ data }: Props) {
  const chartData = data.map(d => ({
    date: d.date.slice(5), // MM-DD
    wear: Math.round(d.wearPercentage),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v: number) => [`${v}%`, 'Wear']} />
        <ReferenceLine y={91.7} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Goal', fill: '#ef4444', fontSize: 11 }} />
        <Bar dataKey="wear" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Implement `src/components/reports/StatsGrid.tsx`**

```typescript
import { DailyStats } from '../../types'
import { computeAverageWear } from '../../utils/stats'
import { formatDuration } from '../../utils/time'

interface Props { stats: DailyStats[] }

export default function StatsGrid({ stats }: Props) {
  const avgWear = computeAverageWear(stats)
  const totalRemovals = stats.reduce((s, d) => s + d.removals, 0)
  const avgRemovals = stats.length > 0 ? totalRemovals / stats.length : 0
  const longestRemoval = Math.max(...stats.map(d => d.longestRemovalMinutes), 0)
  const complianceDays = stats.filter(d => d.compliant).length

  const items = [
    { label: 'Avg Wear', value: `${avgWear.toFixed(1)}%` },
    { label: 'Total Removals', value: String(totalRemovals) },
    { label: 'Avg/Day', value: avgRemovals.toFixed(1) },
    { label: 'Longest Off', value: formatDuration(longestRemoval) },
    { label: 'Compliant Days', value: `${complianceDays}/${stats.length}` },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl p-3 shadow-sm text-center">
          <div className="text-lg font-bold text-gray-800">{item.value}</div>
          <div className="text-xs text-gray-400 mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/components/reports/SetReportCard.tsx`**

```typescript
interface SetStats {
  avgWearPct: number
  totalRemovals: number
  complianceDays: number
  avgRemovalsPerDay: number
}

interface Props {
  setNumber: number
  current: SetStats
  previous: SetStats | null
}

function Delta({ current, previous, suffix = '' }: { current: number; previous: number | null; suffix?: string }) {
  if (previous === null) return null
  const diff = current - previous
  const color = diff >= 0 ? 'text-green-500' : 'text-red-500'
  return <span className={`text-xs ${color} ml-1`}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}{suffix}</span>
}

export default function SetReportCard({ setNumber, current, previous }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-gray-700 mb-3">Set {setNumber} Report</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Avg Wear</span>
          <span className="font-semibold">
            {current.avgWearPct.toFixed(1)}%
            <Delta current={current.avgWearPct} previous={previous?.avgWearPct ?? null} suffix="%" />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Removals</span>
          <span className="font-semibold">
            {current.totalRemovals}
            <Delta current={current.totalRemovals} previous={previous?.totalRemovals ?? null} />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Compliance Days</span>
          <span className="font-semibold">
            {current.complianceDays}
            <Delta current={current.complianceDays} previous={previous?.complianceDays ?? null} />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Avg Removals/Day</span>
          <span className="font-semibold">
            {current.avgRemovalsPerDay.toFixed(1)}
            <Delta current={current.avgRemovalsPerDay} previous={previous?.avgRemovalsPerDay ?? null} />
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement full `src/views/ReportsView.tsx`**

```typescript
import { useState } from 'react'
import { useReports } from '../hooks/useReports'
import { useDataContext } from '../contexts/DataContext'
import WearChart from '../components/reports/WearChart'
import StatsGrid from '../components/reports/StatsGrid'
import SetReportCard from '../components/reports/SetReportCard'

type Period = '7d' | 'week' | 'month' | 'set'

function getDateRange(period: Exclude<Period, 'set'>): string[] {
  const today = new Date()
  const dates: string[] = []
  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
  } else if (period === 'week') {
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((day + 6) % 7))
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
  } else {
    const year = today.getFullYear()
    const month = today.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      dates.push(d.toISOString().slice(0, 10))
    }
  }
  return dates
}

const DEFAULT_GOAL = 1320

export default function ReportsView() {
  const [period, setPeriod] = useState<Period>('7d')
  const { profile, sets, treatment } = useDataContext()
  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_GOAL
  const { getDailyStatsRange, getSetStats } = useReports(goalMinutes)

  const tabs: { key: Period; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'set', label: 'By Set' },
  ]

  const stats = period !== 'set' ? getDailyStatsRange(getDateRange(period)) : []

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 pt-2">Reports</h1>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ` +
              (period === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {period !== 'set' && (
        <>
          <WearChart data={stats} />
          <StatsGrid stats={stats} />
        </>
      )}

      {period === 'set' && (
        <div className="space-y-3">
          {[...sets]
            .sort((a, b) => b.setNumber - a.setNumber)
            .map(s => {
              const current = getSetStats(s.setNumber)
              const prevSet = sets.find(x => x.setNumber === s.setNumber - 1)
              const previous = prevSet ? getSetStats(prevSet.setNumber) : null
              return (
                <SetReportCard
                  key={s.id}
                  setNumber={s.setNumber}
                  current={current}
                  previous={previous}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: implement Reports view with bar chart, stats grid, and set reports"
```

---

### Task 22: Settings view

**Files:**
- Modify: `src/views/SettingsView.tsx`
- Create: `src/components/settings/ExportButton.tsx`

- [ ] **Step 1: Implement `src/components/settings/ExportButton.tsx`**

```typescript
import { useSessions } from '../../hooks/useSessions'
import { sessionsToCSV, downloadCSV } from '../../utils/csv'

export default function ExportButton() {
  const { sessions } = useSessions()

  const handleExport = () => {
    const csv = sessionsToCSV(sessions)
    downloadCSV(csv, `aligner-sessions-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <button
      onClick={handleExport}
      className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold text-sm"
    >
      Export Sessions as CSV
    </button>
  )
}
```

- [ ] **Step 2: Implement full `src/views/SettingsView.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useDataContext } from '../contexts/DataContext'
import { useSets } from '../hooks/useSets'
import { useSync } from '../hooks/useSync'
import ExportButton from '../components/settings/ExportButton'
import { requestNotificationPermission } from '../services/notifications'
import { update, profileRef, ref, db } from '../services/firebase'
import { localDB } from '../services/db'
import { nowISO } from '../utils/time'

export default function SettingsPageView() {
  const { user, signOut } = useAuthContext()
  const { profile, treatment } = useDataContext()
  const { updateTreatment, startNewSet } = useSets()
  const { status, queueCount } = useSync()

  const [goalHours, setGoalHours] = useState(22)
  const [reminderMins, setReminderMins] = useState(30)
  const [autoCapMins, setAutoCapMins] = useState(120)
  const [totalSets, setTotalSets] = useState<string>('')
  const [defaultDuration, setDefaultDuration] = useState(7)
  const [newSetNumber, setNewSetNumber] = useState<string>('')
  const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted')

  useEffect(() => {
    if (profile) {
      setGoalHours(profile.dailyWearGoalMinutes / 60)
      setReminderMins(profile.reminderThresholdMinutes)
      setAutoCapMins(profile.autoCapMinutes)
    }
    if (treatment) {
      setTotalSets(treatment.totalSets ? String(treatment.totalSets) : '')
      setDefaultDuration(treatment.defaultSetDurationDays)
    }
  }, [profile, treatment])

  const saveProfile = async () => {
    if (!user) return
    const updates = {
      dailyWearGoalMinutes: Math.round(goalHours * 60),
      reminderThresholdMinutes: reminderMins,
      autoCapMinutes: autoCapMins,
    }
    await update(ref(db, `users/${user.uid}/profile`), updates)
    await localDB.profile.update(user.uid, updates)
  }

  const saveTreatment = async () => {
    await updateTreatment({
      totalSets: totalSets ? parseInt(totalSets) : null,
      defaultSetDurationDays: defaultDuration,
    })
  }

  const handleStartNewSet = async () => {
    const num = parseInt(newSetNumber)
    if (isNaN(num) || num < 1) return
    if (!confirm(`Start Set ${num}? This will close the current set.`)) return
    await startNewSet(num)
    setNewSetNumber('')
  }

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 pt-2">Settings</h1>

      {/* Sync status */}
      <div className="text-xs text-gray-400">
        Sync: {status}{queueCount > 0 ? ` (${queueCount} pending)` : ''}
      </div>

      {/* Wear goal */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-700">Wear Goal</h2>
        <label className="block text-sm text-gray-500">Daily wear goal (hours)</label>
        <input type="number" min="1" max="24" step="0.5" value={goalHours}
          onChange={e => setGoalHours(parseFloat(e.target.value))}
          className="w-full border rounded-xl p-2" />
        <label className="block text-sm text-gray-500">Reminder threshold (minutes)</label>
        <input type="number" min="5" max="120" value={reminderMins}
          onChange={e => setReminderMins(parseInt(e.target.value))}
          className="w-full border rounded-xl p-2" />
        <label className="block text-sm text-gray-500">Auto-cap duration (minutes)</label>
        <input type="number" min="30" max="480" value={autoCapMins}
          onChange={e => setAutoCapMins(parseInt(e.target.value))}
          className="w-full border rounded-xl p-2" />
        <button onClick={saveProfile}
          className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold">
          Save Preferences
        </button>
      </div>

      {/* Treatment */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-700">Treatment Plan</h2>
        <label className="block text-sm text-gray-500">Total aligner sets (leave blank if unknown)</label>
        <input type="number" min="1" value={totalSets}
          onChange={e => setTotalSets(e.target.value)}
          className="w-full border rounded-xl p-2" placeholder="e.g. 30" />
        <label className="block text-sm text-gray-500">Default set duration (days)</label>
        <input type="number" min="1" max="30" value={defaultDuration}
          onChange={e => setDefaultDuration(parseInt(e.target.value))}
          className="w-full border rounded-xl p-2" />
        <button onClick={saveTreatment}
          className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold">
          Save Treatment Settings
        </button>
      </div>

      {/* Start new set */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-700">Switch Aligner Set</h2>
        <label className="block text-sm text-gray-500">New set number</label>
        <input type="number" min="1" value={newSetNumber}
          onChange={e => setNewSetNumber(e.target.value)}
          className="w-full border rounded-xl p-2" placeholder={`e.g. ${(treatment?.currentSetNumber ?? 0) + 1}`} />
        <button onClick={handleStartNewSet}
          className="w-full bg-green-500 text-white rounded-xl py-3 font-semibold">
          Start New Set
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-700">Notifications</h2>
        {notifGranted ? (
          <p className="text-sm text-green-600">Push notifications enabled</p>
        ) : (
          <button onClick={handleRequestNotifications}
            className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold text-sm">
            Enable Push Notifications
          </button>
        )}
      </div>

      {/* Export */}
      <ExportButton />

      {/* Sign out */}
      <button onClick={signOut}
        className="w-full bg-red-100 text-red-600 rounded-xl py-3 font-semibold">
        Sign Out
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: implement Settings view with preferences, treatment config, and export"
```

---

## Phase 9 — PWA, Offline, and Deployment

### Task 23: PWA manifest and icons

**Files:**
- Create: `public/manifest.json` (auto-generated by vite-plugin-pwa via config)
- Create: `public/icon-192.png` (placeholder — replace with real icon)
- Create: `public/icon-512.png`

- [ ] **Step 1: Generate placeholder icons (use any 192x192 and 512x512 PNG)**

```bash
# Quick placeholder using ImageMagick if available:
convert -size 192x192 xc:#6366f1 -fill white -font DejaVu-Sans-Bold \
  -pointsize 48 -gravity center -annotate 0 "AT" public/icon-192.png 2>/dev/null || \
  echo "Add icon-192.png and icon-512.png to public/ manually (any 192x192 and 512x512 PNG)"
```

- [ ] **Step 2: Verify PWA config in `vite.config.ts`**

The manifest is already embedded in `vite.config.ts` (Task 1). Confirm `registerType: 'autoUpdate'` and icon paths are correct.

- [ ] **Step 3: Build and verify PWA manifest**

```bash
npm run build
npx serve dist
```
Open `http://localhost:3000/invisalign/` → Chrome DevTools → Application → Manifest. Verify name, icons, display mode.

- [ ] **Step 4: Commit**

```bash
git add public/
git commit -m "feat: add PWA icons and verify manifest"
```

---

### Task 24: GitHub Actions deploy

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] **Step 2: Add GitHub repository secrets**

In GitHub → Settings → Secrets and Variables → Actions, add:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

- [ ] **Step 3: Commit and push**

```bash
git add .github/
git commit -m "ci: add GitHub Actions deploy workflow to gh-pages"
git push origin main
```

- [ ] **Step 4: Verify deployment**

Check Actions tab in GitHub. Once green, visit `https://<username>.github.io/invisalign/` and verify the app loads.

---

## Phase 10 — Firebase Setup & Integration Testing

### Task 25: Firebase project setup

- [ ] **Step 1: Create Firebase project**

1. Go to `console.firebase.google.com`
2. Create project named `invisalign-tracker`
3. Enable **Google Sign-In**: Authentication → Sign-in method → Google → Enable

- [ ] **Step 2: Create Realtime Database**

1. Firebase Console → Realtime Database → Create Database
2. Start in **test mode** (we'll add rules next)
3. Copy the database URL (ends in `.firebaseio.com`)

- [ ] **Step 3: Apply security rules**

In Firebase Console → Realtime Database → Rules, paste:

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

- [ ] **Step 4: Get Firebase config and populate `.env`**

Firebase Console → Project Settings → Your apps → Web → Config. Copy values to `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

- [ ] **Step 5: Integration smoke test**

```bash
npm run dev
```
1. Click "Sign in with Google" → verify authentication succeeds
2. Click "REMOVE ALIGNERS" → verify timer starts counting
3. Click "PUT BACK" → verify session appears in today's list
4. Open Firebase Console → Realtime Database → verify session record exists under `users/{uid}/sessions/`

---

## Phase 11 — End-to-End Validation

### Task 26: Acceptance criteria verification

Run through each acceptance criterion from the spec (Section 6.1):

- [ ] **AC-1: Google sign-in and cross-device sync**

Sign in on two devices. Start a session on device A. Verify it appears on device B within seconds.

- [ ] **AC-2: Timer accuracy**

Start timer. Wait 10 seconds. Verify display shows `00:00:10`.

- [ ] **AC-3: 30-minute reminder**

Set reminder threshold to 1 minute in Settings. Start a session. Wait 1 minute. Verify audio alert + red flash.

- [ ] **AC-4: Auto-cap**

Set auto-cap to 2 minutes in Settings. Start a session. Wait 2 minutes. Verify session ends with "auto-capped" note.

- [ ] **AC-5: PWA install**

On mobile Chrome: tap "Add to Home Screen". Verify standalone launch.

- [ ] **AC-6: Offline session creation**

1. Put device in airplane mode.
2. Start session → verify timer works.
3. Stop session → verify session appears in list.
4. Restore connectivity.
5. Verify session syncs to Firebase within 5 seconds.

- [ ] **AC-7: Session editing validation**

Edit a session's end time to before start time → verify error message shown.

- [ ] **AC-8: Midnight-spanning sessions**

Manually add a session crossing midnight (e.g., 11:45 PM to 12:15 AM). Check History view — verify session appears in both dates' tallies.

- [ ] **AC-9: Reports accuracy**

Add known sessions for the past 7 days. Open Reports → 7 Days. Verify bar chart and stats match expected values.

- [ ] **AC-10: CSV export**

Go to Settings → Export. Verify CSV downloads with correct headers and session rows.

- [ ] **AC-11: Treatment progress**

Set treatment to 30 sets, current set 14. Verify progress bar shows ~46% filled.

- [ ] **AC-12: Aligner set switch**

In Settings, switch to next set. Verify report card appears comparing stats.

- [ ] **AC-13: Lighthouse PWA score**

```bash
npx lighthouse https://<username>.github.io/invisalign/ --only-categories=pwa --output=html --output-path=./lighthouse-report.html
```
Expected: PWA score ≥ 90.

---

## Phase 12 — Missing Features & Bug Fixes (Review Round 1)

> These tasks address gaps found during plan review. Implement these before final E2E validation.

### Task 27: Tests for csv.ts, useSessions validation, and report computations

**Files:**
- Create: `src/utils/csv.test.ts`
- Create: `src/utils/sessionValidation.test.ts`

- [ ] **Step 1: Write failing test for `sessionsToCSV`**

```typescript
// src/utils/csv.test.ts
import { describe, it, expect } from 'vitest'
import { sessionsToCSV } from './csv'
import { Session } from '../types'

const base: Session = {
  id: 'abc', startTime: '2026-03-17T10:00:00Z', endTime: '2026-03-17T10:30:00Z',
  startTimezoneOffset: 0, endTimezoneOffset: 0,
  setNumber: 1, autoCapped: false, createdOffline: false,
  deviceId: 'dev1', updatedAt: '2026-03-17T10:30:00Z',
}

describe('sessionsToCSV', () => {
  it('includes header row', () => {
    const csv = sessionsToCSV([base])
    expect(csv.split('\n')[0]).toContain('startTime')
  })
  it('outputs correct duration', () => {
    const csv = sessionsToCSV([base])
    expect(csv).toContain('30.0')
  })
  it('excludes sessions with null endTime', () => {
    const active = { ...base, endTime: null }
    const csv = sessionsToCSV([active])
    expect(csv.split('\n').length).toBe(1) // header only
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/utils/csv.test.ts
```

- [ ] **Step 3: Run all tests to verify they pass (csv already implemented)**

```bash
npx vitest run
```
Expected: all tests green including csv tests.

- [ ] **Step 4: Write tests for overlap validation logic**

```typescript
// src/utils/sessionValidation.test.ts
import { describe, it, expect } from 'vitest'
import { validateSessionEdit } from './sessionValidation'

describe('validateSessionEdit', () => {
  it('throws when end before start', () => {
    expect(() => validateSessionEdit(
      '2026-03-17T10:30:00Z', '2026-03-17T10:00:00Z', []
    )).toThrow('End time must be after start time')
  })

  it('throws when session longer than 24h', () => {
    expect(() => validateSessionEdit(
      '2026-03-17T00:00:00Z', '2026-03-18T01:00:00Z', []
    )).toThrow('24 hours')
  })

  it('throws on overlap with existing session', () => {
    const existing = [{
      id: 'x', startTime: '2026-03-17T12:00:00Z', endTime: '2026-03-17T12:30:00Z',
    }]
    expect(() => validateSessionEdit(
      '2026-03-17T12:15:00Z', '2026-03-17T12:45:00Z', existing
    )).toThrow('overlaps')
  })

  it('does not throw for valid non-overlapping times', () => {
    const existing = [{
      id: 'x', startTime: '2026-03-17T12:00:00Z', endTime: '2026-03-17T12:30:00Z',
    }]
    expect(() => validateSessionEdit(
      '2026-03-17T13:00:00Z', '2026-03-17T13:30:00Z', existing
    )).not.toThrow()
  })
})
```

- [ ] **Step 5: Create `src/utils/sessionValidation.ts`**

```typescript
interface SessionLike { id?: string; startTime: string; endTime: string | null }

export function validateSessionEdit(
  startTime: string,
  endTime: string,
  otherSessions: SessionLike[],
  excludeId?: string
): void {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (end <= start) throw new Error('End time must be after start time.')

  const durationMs = end - start
  if (durationMs > 24 * 60 * 60 * 1000) {
    throw new Error('Session cannot be longer than 24 hours.')
  }

  const overlap = otherSessions
    .filter(s => s.endTime !== null && s.id !== excludeId)
    .find(s => {
      const sStart = new Date(s.startTime).getTime()
      const sEnd = new Date(s.endTime!).getTime()
      return start < sEnd && end > sStart
    })

  if (overlap) throw new Error('This session overlaps with an existing session.')
}
```

- [ ] **Step 6: Update `useSessions.ts` to use `validateSessionEdit`**

Replace inline validation in `updateSession` and `addManualSession` with:
```typescript
import { validateSessionEdit } from '../utils/sessionValidation'
// In updateSession — validate even if only one field changes by reading current session:
const current = sessions.find(s => s.id === sessionId)!
const newStart = updates.startTime ?? current.startTime
const newEnd = updates.endTime ?? current.endTime
if (newEnd) validateSessionEdit(newStart, newEnd, sessions, sessionId)
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 8: Write and run tests for report computations (stats.ts end-to-end)**

```typescript
// Add to src/utils/stats.test.ts:
import { computeAverageWear } from './stats'

describe('computeAverageWear', () => {
  it('returns 100 for empty array', () => {
    expect(computeAverageWear([])).toBe(100)
  })
  it('averages wear percentages', () => {
    const stats = [
      { date: '2026-03-16', totalOffMinutes: 60, wearPercentage: 95.8, removals: 2, longestRemovalMinutes: 30, compliant: true },
      { date: '2026-03-17', totalOffMinutes: 120, wearPercentage: 91.7, removals: 3, longestRemovalMinutes: 45, compliant: true },
    ]
    expect(computeAverageWear(stats)).toBeCloseTo(93.75)
  })
})
```

```bash
npx vitest run src/utils/stats.test.ts
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/utils/sessionValidation.ts src/utils/sessionValidation.test.ts src/utils/csv.test.ts src/utils/stats.test.ts src/hooks/useSessions.ts
git commit -m "test: add csv, session validation, report stats tests; extract validateSessionEdit"
```

---

### Task 28: Conflict resolution in syncManager (multi-device)

**Files:**
- Modify: `src/services/syncManager.ts`

- [ ] **Step 1: Add overlap-merge logic to `drainSyncQueue`**

Add this function to `syncManager.ts` and call it before writing sessions to Firebase:

```typescript
import { get, ref, db } from './firebase'

/** Merge two overlapping sessions — keep superset (earlier start, later end). */
async function resolveSessionConflict(uid: string, incoming: Session): Promise<boolean> {
  const { get: fbGet, ref: fbRef, db: fbDb } = await import('./firebase')
  const snap = await fbGet(fbRef(fbDb, `users/${uid}/sessions`))
  const existing: Record<string, Session> = snap.val() ?? {}

  const TOLERANCE_MS = 60_000 // 1 minute
  const inStart = new Date(incoming.startTime).getTime()
  const inEnd = incoming.endTime ? new Date(incoming.endTime).getTime() : null

  for (const [id, s] of Object.entries(existing)) {
    if (id === incoming.id) continue
    if (s.endTime === null && incoming.endTime === null) {
      // Two active sessions: keep earlier start, zero-duration close the other
      if (inStart < new Date(s.startTime).getTime()) {
        // incoming is older — close the remote one
        const { ref: r, update: u, db: d } = await import('./firebase')
        await u(r(d, `users/${uid}/sessions/${id}`), { endTime: s.startTime, updatedAt: new Date().toISOString() })
      }
      return false // write incoming as-is
    }
    const sStart = new Date(s.startTime).getTime()
    const sEnd = s.endTime ? new Date(s.endTime).getTime() : null
    if (!inEnd || !sEnd) continue

    const overlap = inStart < sEnd + TOLERANCE_MS && inEnd > sStart - TOLERANCE_MS
    if (overlap) {
      // Keep superset
      const mergedStart = Math.min(inStart, sStart)
      const mergedEnd = Math.max(inEnd, sEnd)
      const { ref: r, update: u, db: d } = await import('./firebase')
      await u(r(d, `users/${uid}/sessions/${id}`), {
        startTime: new Date(mergedStart).toISOString(),
        endTime: new Date(mergedEnd).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      return true // skip writing incoming — merged into existing
    }
  }
  return false
}
```

- [ ] **Step 2: Call resolver in `drainSyncQueue` for session paths**

In `drainSyncQueue`, before `executeOperation(item)`:
```typescript
if (item.operation === 'set' && item.path.includes('/sessions/')) {
  const uid = item.path.split('/')[1]
  const skip = await resolveSessionConflict(uid, item.data as Session)
  if (skip) { await localDB.syncQueue.delete(item.id!); continue }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/syncManager.ts
git commit -m "feat: add multi-device session conflict resolution in sync manager"
```

---

### Task 29: Sync error badge in UI

**Files:**
- Create: `src/components/layout/SyncBadge.tsx`
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create `src/components/layout/SyncBadge.tsx`**

```typescript
import { useSync } from '../../hooks/useSync'

export default function SyncBadge() {
  const { status, queueCount } = useSync()

  if (status === 'idle' && queueCount === 0) return null

  const color = status === 'error'
    ? 'bg-red-500'
    : status === 'offline'
    ? 'bg-amber-400'
    : 'bg-indigo-400'

  const label = status === 'error'
    ? 'Sync error'
    : status === 'offline'
    ? 'Offline'
    : status === 'syncing'
    ? 'Syncing…'
    : `${queueCount} pending`

  return (
    <div className={`fixed top-2 right-2 z-40 ${color} text-white text-xs px-2 py-1 rounded-full`}>
      {label}
    </div>
  )
}
```

- [ ] **Step 2: Add `SyncBadge` to `AppShell`**

```typescript
// In AppShell.tsx, add inside the root div before <main>:
import SyncBadge from './SyncBadge'
// ...
<SyncBadge />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/SyncBadge.tsx src/components/layout/AppShell.tsx
git commit -m "feat: add sync status badge (offline/error/pending indicator)"
```

---

### Task 30: Timezone setting in Settings + profile

**Files:**
- Modify: `src/views/SettingsView.tsx`

- [ ] **Step 1: Add timezone state and UI to SettingsView**

Add to the profile section of `SettingsView.tsx`:

```typescript
// State:
const [timezone, setTimezone] = useState<string>('auto')

// In useEffect where profile is loaded:
setTimezone(profile.timezone ?? 'auto')

// In saveProfile updates object, add:
timezone,

// In the JSX profile section, add before Save button:
<label className="block text-sm text-gray-500">Home timezone</label>
<select
  value={timezone}
  onChange={e => setTimezone(e.target.value)}
  className="w-full border rounded-xl p-2"
>
  <option value="auto">Auto-detect (device timezone)</option>
  <option value="America/New_York">Eastern (America/New_York)</option>
  <option value="America/Chicago">Central (America/Chicago)</option>
  <option value="America/Denver">Mountain (America/Denver)</option>
  <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
  <option value="Europe/London">London (Europe/London)</option>
  <option value="Europe/Berlin">Berlin (Europe/Berlin)</option>
  <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
  <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
</select>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/SettingsView.tsx
git commit -m "feat: add timezone setting to profile preferences"
```

---

### Task 31: Set-switch report card shown inline

**Files:**
- Modify: `src/views/SettingsView.tsx`

- [ ] **Step 1: Show SetReportCard after switching sets**

```typescript
import SetReportCard from '../components/reports/SetReportCard'
import { useReports } from '../hooks/useReports'

// In SettingsPageView, add state:
const [switchedFromSet, setSwitchedFromSet] = useState<number | null>(null)
const { getSetStats } = useReports(profile?.dailyWearGoalMinutes ?? 1320)

// Update handleStartNewSet to capture previous set number before switching:
const handleStartNewSet = async () => {
  const num = parseInt(newSetNumber)
  if (isNaN(num) || num < 1) return
  if (!confirm(`Start Set ${num}? This will close the current set.`)) return
  const prevSetNum = treatment?.currentSetNumber ?? null
  await startNewSet(num)
  setSwitchedFromSet(prevSetNum)
  setNewSetNumber('')
}

// In JSX after the "Switch Aligner Set" section, add:
{switchedFromSet !== null && treatment && (
  <SetReportCard
    setNumber={switchedFromSet}
    current={getSetStats(switchedFromSet)}
    previous={switchedFromSet > 1 ? getSetStats(switchedFromSet - 1) : null}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/SettingsView.tsx
git commit -m "feat: show set comparison report card after switching aligner sets"
```

---

### Task 32: Add Session button on HomeView + TrendChart

**Files:**
- Modify: `src/views/HomeView.tsx`
- Create: `src/components/reports/TrendChart.tsx`
- Modify: `src/views/ReportsView.tsx`

- [ ] **Step 1: Add "+ Add Session" to HomeView**

In `HomeView.tsx`, add state and button:

```typescript
const [showAdd, setShowAdd] = useState(false)
import AddSessionModal from '../components/sessions/AddSessionModal'

// In JSX, after SessionList heading row:
<button onClick={() => setShowAdd(true)} className="text-sm text-indigo-500 font-semibold">+ Add</button>

// At bottom of JSX:
{showAdd && <AddSessionModal onClose={() => setShowAdd(false)} />}
```

- [ ] **Step 2: Create `src/components/reports/TrendChart.tsx`**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { DailyStats } from '../../types'

interface Props { data: DailyStats[]; windowSize?: number }

export default function TrendChart({ data, windowSize = 7 }: Props) {
  // Rolling average
  const chartData = data.map((d, i) => {
    const window = data.slice(Math.max(0, i - windowSize + 1), i + 1)
    const avg = window.reduce((s, x) => s + x.wearPercentage, 0) / window.length
    return { date: d.date.slice(5), avg: Math.round(avg) }
  })

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v: number) => [`${v}%`, `${windowSize}d avg`]} />
        <ReferenceLine y={91.7} stroke="#ef4444" strokeDasharray="4 2" />
        <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Add TrendChart to ReportsView (below WearChart)**

```typescript
import TrendChart from '../components/reports/TrendChart'

// In non-set period JSX, after WearChart:
{stats.length >= 2 && <TrendChart data={stats} />}
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add manual session button to home, add rolling-average TrendChart to reports"
```

---

### Task 33: Service worker notification (background tab support)

**Files:**
- Modify: `src/services/notifications.ts`

> The spec (US-1.6, section 2.6) requires notifications to fire even if the tab is not focused, via service worker message-passing. The main-thread `setTimeout` approach covers focused tabs. Add SW message-passing for background support.

- [ ] **Step 1: Update `notifications.ts` to post message to SW**

```typescript
export function scheduleReminderNotification(thresholdMinutes: number): void {
  cancelScheduledNotification()
  if (Notification.permission !== 'granted') return

  // Post to service worker for background notification (survives tab blur)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      thresholdMs: thresholdMinutes * 60 * 1000,
      title: 'AlignerTrack Reminder',
      body: `Your aligners have been out for ${thresholdMinutes} minutes!`,
    })
  }

  // Fallback: main-thread timer (works when tab is focused)
  scheduledTimer = setTimeout(() => {
    new Notification('AlignerTrack Reminder', {
      body: `Your aligners have been out for ${thresholdMinutes} minutes!`,
      icon: '/invisalign/icon-192.png',
    })
  }, thresholdMinutes * 60 * 1000)
}

export function cancelScheduledNotification(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer)
    scheduledTimer = null
  }
  // Cancel SW timer too
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_NOTIFICATION' })
  }
}
```

- [ ] **Step 2: Switch vite-plugin-pwa to `injectManifest` mode and create custom SW**

Replace the entire `VitePWA({...})` block in `vite.config.ts` with the following (this replaces the `generateSW` / `registerType` setup from Task 1 — they are incompatible with `injectManifest`):

```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  manifest: {
    name: 'Invisalign Tracker',
    short_name: 'AlignerTrack',
    start_url: '/invisalign/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}),
```

Also add to `tsconfig.json` `compilerOptions.lib`: `"WebWorker"` so the SW types compile.

Create `src/sw.ts`:
```typescript
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

let notificationTimer: ReturnType<typeof setTimeout> | null = null

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    if (notificationTimer) clearTimeout(notificationTimer)
    notificationTimer = setTimeout(() => {
      self.registration.showNotification(event.data.title, {
        body: event.data.body,
        icon: '/invisalign/icon-192.png',
      })
    }, event.data.thresholdMs)
  }

  if (event.data?.type === 'CANCEL_NOTIFICATION') {
    if (notificationTimer) {
      clearTimeout(notificationTimer)
      notificationTimer = null
    }
  }
})
```

> Note: SW `setTimeout` does not survive device restart or OS kill. This is documented in spec section 2.6 as "best effort."

- [ ] **Step 3: Commit**

```bash
git add src/services/notifications.ts src/sw.ts vite.config.ts
git commit -m "feat: add service worker message-passing for background notifications"
```

---

### Task 34: Accessibility pass

**Files:**
- Modify: `src/components/timer/TimerButton.tsx`
- Modify: `src/components/dashboard/SessionList.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Add ARIA to TimerButton**

```typescript
<button
  onClick={onPress}
  disabled={disabled}
  aria-label={isRunning ? 'Put aligners back — stop timer' : 'Remove aligners — start timer'}
  aria-pressed={isRunning}
  // ... existing className
>
```

- [ ] **Step 2: Add ARIA to SessionList items**

Each session `<button>` gets `aria-label`:
```typescript
aria-label={`Session from ${formatLocalTime(s.startTime, s.startTimezoneOffset)} to ${formatLocalTime(s.endTime!, s.endTimezoneOffset ?? s.startTimezoneOffset)}, ${formatDuration(duration)}. Tap to edit.`}
```

- [ ] **Step 3: Add ARIA to BottomNav**

```typescript
<nav aria-label="Main navigation" ...>
  // Each NavLink:
  aria-label={t.label}
  aria-current={isActive ? 'page' : undefined}
```

- [ ] **Step 4: Run Lighthouse accessibility check**

```bash
npx lighthouse http://localhost:5173/invisalign/ --only-categories=accessibility --output=html --output-path=./lighthouse-a11y.html
```
Expected: score ≥ 85.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add ARIA labels and roles for accessibility"
```

---

### Task 35: SessionCard component (canonical location)

**Files:**
- Create: `src/components/sessions/SessionCard.tsx`
- Modify: `src/components/dashboard/SessionList.tsx`

- [ ] **Step 1: Extract SessionCard from inline SessionList rows**

```typescript
// src/components/sessions/SessionCard.tsx
import { Session } from '../../types'
import { formatDuration, diffMinutes } from '../../utils/time'

interface Props {
  session: Session
  onEdit: (session: Session) => void
  formatTime: (iso: string, offset: number) => string
}

export default function SessionCard({ session: s, onEdit, formatTime }: Props) {
  const duration = diffMinutes(s.startTime, s.endTime!)
  return (
    <button
      onClick={() => onEdit(s)}
      aria-label={`Session ${formatTime(s.startTime, s.startTimezoneOffset)} to ${formatTime(s.endTime!, s.endTimezoneOffset ?? s.startTimezoneOffset)}, ${formatDuration(duration)}. Tap to edit.`}
      className="w-full flex items-center justify-between bg-white rounded-xl p-3 shadow-sm text-left hover:bg-gray-50 active:bg-gray-100"
    >
      <span className="text-sm text-gray-600">
        {formatTime(s.startTime, s.startTimezoneOffset)} –{' '}
        {formatTime(s.endTime!, s.endTimezoneOffset ?? s.startTimezoneOffset)}
      </span>
      <div className="flex items-center gap-2">
        {s.autoCapped && <span className="text-xs text-amber-500">auto</span>}
        <span className="text-sm font-semibold text-gray-700">{formatDuration(duration)}</span>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Update SessionList to use SessionCard**

Replace inline button rendering with `<SessionCard session={s} onEdit={onEdit} formatTime={formatLocalTime} />`.

- [ ] **Step 3: Commit**

```bash
git add src/components/sessions/SessionCard.tsx src/components/dashboard/SessionList.tsx
git commit -m "refactor: extract SessionCard component to canonical location"
```

---

## Validation Summary (per Phase)

| Phase | How to Verify |
|-------|--------------|
| 1 — Scaffolding | `npm run dev` loads blank Vite app; `npx tsc --noEmit` passes |
| 2 — Utils | `npx vitest run` → all tests pass (time, stats, csv, sessionValidation) |
| 3 — Services | No TS errors; Firebase module imports resolve; IndexedDB visible in DevTools |
| 4 — Contexts | App loads, login screen renders, SyncBadge appears when offline |
| 5 — Core Hooks | Timer ticks; sessions appear in IndexedDB (DevTools → Application → IndexedDB) |
| 6 — Shell | Bottom nav routes work; all 4 views render without errors |
| 7 — Home | Timer, daily summary, session list, "+ Add" button, treatment bar all render |
| 8 — Other Views | History groups by date; Reports shows bar + trend charts; Settings saves preferences |
| 9 — PWA | `npm run build && npx serve dist`; Lighthouse PWA ≥ 90; install prompt appears |
| 10 — Firebase | Sessions appear in Firebase Console < 1s online; SyncBadge shows "Offline" when network off |
| 11 — E2E | All AC checkboxes in Task 26 pass |
| 12 — Fixes | All vitest tests green; ARIA labels present; set-switch shows report card; timezone saves |
