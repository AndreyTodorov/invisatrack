# Seed Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/seed.ts`, a Node.js CLI script that seeds sessions and aligner sets into the local Firebase emulator with three named presets.

**Architecture:** Single self-contained script. Pure generator functions build the data payloads; two async functions handle the emulator HTTP calls (Auth user creation, RTDB bulk write). A `main()` function parses CLI args and orchestrates the flow.

**Tech Stack:** Node.js ≥ 18 (native fetch), TypeScript via tsx, Firebase Auth emulator REST API, Firebase RTDB emulator REST API.

---

## File Structure

- **Create:** `scripts/seed.ts` — the entire script (types, generators, HTTP helpers, main)

The existing `scripts/generate-icons.ts` is the reference pattern for how scripts are structured in this project.

---

### Task 1: Scaffold, types, and preset config

**Files:**
- Create: `scripts/seed.ts`

This task establishes the shape of all data and the preset parameters. Nothing runs yet — just types and constants.

- [ ] **Step 1: Create the file with types and preset config**

```typescript
#!/usr/bin/env node

// ── Types (self-contained — intentionally not imported from src/types to avoid bundler deps) ──
// Note: endTime and endTimezoneOffset are non-nullable here because all seeded sessions
// are completed. The app's src/types/index.ts defines them as `string | null` / `number | null`.

interface Session {
  id: string
  startTime: string
  endTime: string           // always non-null for seeded data
  startTimezoneOffset: number
  endTimezoneOffset: number  // always non-null for seeded data
  setNumber: number
  autoCapped: boolean
  createdOffline: boolean
  deviceId: string
  updatedAt: string
}

interface AlignerSet {
  id: string
  setNumber: number
  startDate: string
  endDate: string | null
  note: null
}

interface UserProfile {
  displayName: string
  email: string
  timezone: string
  dailyWearGoalMinutes: number
  reminderThresholdMinutes: number
  autoCapMinutes: number
  createdAt: string
}

interface Treatment {
  totalSets: number | null
  defaultSetDurationDays: number
  currentSetNumber: number
  currentSetStartDate: string
}

interface SeedPayload {
  profile: UserProfile
  treatment: Treatment
  sets: Record<string, AlignerSet>
  sessions: Record<string, Session>
}

// ── Preset config ──

type Preset = 'minimal' | 'history' | 'full'

const PRESETS: Record<Preset, { sets: number; spanDays: number; totalSets: number | null }> = {
  minimal: { sets: 2,  spanDays: 14,  totalSets: 10  },
  history: { sets: 5,  spanDays: 35,  totalSets: 20  },
  full:    { sets: 20, spanDays: 140, totalSets: null },
}

const DEVICE_ID = 'seed-device-001'
const AUTH_HOST = 'http://localhost:9099'
const RTDB_HOST = 'http://localhost:9000'
const RTDB_NS   = 'demo-invisalign'
const SEED_EMAIL = 'seed@test.com'
const SEED_PASSWORD = 'password123'
```

- [ ] **Step 2: Verify the file parses — run tsx type-check**

```bash
npx tsx --no-cache scripts/seed.ts 2>&1 | head -20
```

Expected: script exits (no `main()` yet) with no TypeScript errors.

---

### Task 2: Date helpers and set generator

**Files:**
- Modify: `scripts/seed.ts`

Pure functions — no I/O, easy to reason about in isolation.

- [ ] **Step 1: Add `addDays` date helper and `generateSets`**

```typescript
// ── Date helpers ──

/** Returns 'YYYY-MM-DD' for a Date object in UTC */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Adds N calendar days to a 'YYYY-MM-DD' string, returns 'YYYY-MM-DD' */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return toDateStr(d)
}

/** Today's date as 'YYYY-MM-DD' in UTC */
function todayUTC(): string {
  return toDateStr(new Date())
}

// ── Set generator ──

/**
 * Generates `count` AlignerSets ending at today.
 * Sets are numbered 1..count. The last set is in progress (endDate: null).
 * Each set spans SET_DURATION_DAYS days.
 */
function generateSets(count: number): AlignerSet[] {
  const SET_DURATION = 7
  const today = todayUTC()

  // Last set started (count-1)*7 days before today's start
  // Walk backwards to find set 1's startDate
  let startDate = addDays(today, -(count - 1) * SET_DURATION)

  const sets: AlignerSet[] = []
  for (let i = 1; i <= count; i++) {
    const isLast = i === count
    const endDate = isLast ? null : addDays(startDate, SET_DURATION)
    sets.push({
      id: crypto.randomUUID(),
      setNumber: i,
      startDate,
      endDate,
      note: null,
    })
    startDate = addDays(startDate, SET_DURATION)
  }
  return sets
}
```

- [ ] **Step 2: Verify — quick sanity check via tsx eval**

```bash
npx tsx -e "
import { generateSets } from './scripts/seed.ts' // won't work yet — just checking compilation
" 2>&1 | head -5
```

Note: `generateSets` isn't exported yet. Instead just confirm the file still compiles cleanly by running:

```bash
npx tsx --no-cache scripts/seed.ts 2>&1 | head -5
```

Expected: no errors.

---

### Task 3: Session generator

**Files:**
- Modify: `scripts/seed.ts`

Generates realistic removal sessions per day, working backwards from yesterday.

- [ ] **Step 1: Add `generateSessions`**

```typescript
// ── Session generator ──

/**
 * Generates sessions for all days in [startDate, yesterday] (inclusive).
 * 2–4 removal windows per day, each 20–90 min, within waking hours (7am–11pm UTC).
 * Sessions are all completed (non-null endTime).
 */
function generateSessions(sets: AlignerSet[]): Session[] {
  const yesterday = addDays(todayUTC(), -1)

  // Build lookup: given a date string, which setNumber owns it?
  function getSetNumber(dateStr: string): number {
    for (const s of sets) {
      const afterStart = dateStr >= s.startDate
      const beforeEnd = s.endDate === null || dateStr < s.endDate
      if (afterStart && beforeEnd) return s.setNumber
    }
    // Fallback: use last set (shouldn't happen with valid input)
    return sets[sets.length - 1].setNumber
  }

  // Find earliest set start date
  const firstDate = sets[0].startDate

  const sessions: Session[] = []

  // Iterate day by day from firstDate to yesterday
  let cursor = firstDate
  while (cursor <= yesterday) {
    const removalsToday = 2 + Math.floor(Math.random() * 3) // 2–4
    const usedSlots: Array<[number, number]> = [] // [startMin, endMin] pairs

    for (let r = 0; r < removalsToday; r++) {
      // Waking hours: 7am–11pm = minutes 420–1380
      // Each removal is 20–90 min; pick a non-overlapping slot
      // Waking hours: 7am (420 min) – 11pm (1380 min).
      // Pick startMin in [420, 1360] so a minimum 20-min session still ends by 23:00.
      // Then clamp duration so endMin never exceeds 1380.
      let attempts = 0
      let startMin: number
      let endMin: number
      do {
        startMin = 420 + Math.floor(Math.random() * (1360 - 420 + 1)) // 420–1360
        const maxDuration = Math.min(90, 1380 - startMin)
        const duration = 20 + Math.floor(Math.random() * (maxDuration - 20 + 1))
        endMin = startMin + duration
        attempts++
      } while (
        attempts < 20 &&
        usedSlots.some(([s, e]) => startMin < e && endMin > s)
      )
      if (attempts >= 20) continue // couldn't fit; skip

      usedSlots.push([startMin, endMin])

      const startTime = new Date(cursor + 'T00:00:00Z')
      startTime.setUTCMinutes(startTime.getUTCMinutes() + startMin)

      const endTime = new Date(cursor + 'T00:00:00Z')
      endTime.setUTCMinutes(endTime.getUTCMinutes() + endMin)

      const startISO = startTime.toISOString()
      const endISO = endTime.toISOString()

      sessions.push({
        id: crypto.randomUUID(),
        startTime: startISO,
        endTime: endISO,
        startTimezoneOffset: 0,
        endTimezoneOffset: 0,
        setNumber: getSetNumber(cursor),
        autoCapped: false,
        createdOffline: false,
        deviceId: DEVICE_ID,
        updatedAt: endISO,
      })
    }

    cursor = addDays(cursor, 1)
  }

  return sessions
}
```

---

### Task 4: Payload builder

**Files:**
- Modify: `scripts/seed.ts`

Combines sets + sessions into the full `SeedPayload` ready for the RTDB write.

- [ ] **Step 1: Add `buildPayload`**

```typescript
// ── Payload builder ──

function buildPayload(preset: Preset, uid: string): SeedPayload {
  const config = PRESETS[preset]
  const sets = generateSets(config.sets)
  const sessions = generateSessions(sets)

  const currentSet = sets[sets.length - 1]

  const profile: UserProfile = {
    displayName: 'Seed User',
    email: SEED_EMAIL,
    timezone: 'UTC',
    dailyWearGoalMinutes: 1320,
    reminderThresholdMinutes: 30,
    autoCapMinutes: 120,
    createdAt: sets[0].startDate + 'T00:00:00.000Z',
  }

  const treatment: Treatment = {
    totalSets: config.totalSets,
    defaultSetDurationDays: 7,
    currentSetNumber: currentSet.setNumber,
    currentSetStartDate: currentSet.startDate,
  }

  const setsMap: Record<string, AlignerSet> = {}
  for (const s of sets) setsMap[s.id] = s

  const sessionsMap: Record<string, Session> = {}
  for (const s of sessions) sessionsMap[s.id] = s

  // uid unused in payload values but kept in signature for potential future use
  void uid

  return { profile, treatment, sets: setsMap, sessions: sessionsMap }
}
```

---

### Task 5: Auth emulator helpers

**Files:**
- Modify: `scripts/seed.ts`

Two functions: create a new user, verify an existing uid.

- [ ] **Step 1: Add `createSeedUser` and `verifyUid`**

```typescript
// ── Auth emulator helpers ──

async function createSeedUser(): Promise<string> {
  let res: Response
  try {
    res = await fetch(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD, returnSecureToken: true }),
      }
    )
  } catch {
    throw new Error(
      `Could not connect to Firebase Auth emulator at ${AUTH_HOST}.\n` +
      `Is 'npm run emulators' running?`
    )
  }

  if (!res.ok) {
    const body = await res.json() as { error?: { message?: string } }
    const msg = body?.error?.message ?? 'unknown error'
    if (msg === 'EMAIL_EXISTS') {
      throw new Error(
        `Email ${SEED_EMAIL} already exists in the Auth emulator.\n` +
        `Look up the uid in the Emulator UI (http://localhost:4000) and re-run with:\n` +
        `  npx tsx scripts/seed.ts --uid <uid>`
      )
    }
    throw new Error(`Auth emulator sign-up failed: ${msg}`)
  }

  const data = await res.json() as { localId: string }
  return data.localId
}

async function verifyUid(uid: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=fake-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer owner',   // required by emulator for uid lookups
        },
        body: JSON.stringify({ localId: [uid] }),
      }
    )
  } catch {
    throw new Error(
      `Could not connect to Firebase Auth emulator at ${AUTH_HOST}.\n` +
      `Is 'npm run emulators' running?`
    )
  }

  const body = await res.json() as { users?: unknown[] }
  if (!res.ok || !body.users?.length) {
    throw new Error(
      `No Auth user found for uid '${uid}'.\n` +
      `Did you mean to omit --uid and create a fresh user?`
    )
  }
}
```

---

### Task 6: RTDB write helper

**Files:**
- Modify: `scripts/seed.ts`

Single bulk PUT to the emulator.

- [ ] **Step 1: Add `writeToRTDB`**

```typescript
// ── RTDB write ──

async function writeToRTDB(uid: string, payload: SeedPayload): Promise<void> {
  let res: Response
  try {
    res = await fetch(
      `${RTDB_HOST}/users/${uid}.json?ns=${RTDB_NS}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer owner',
        },
        body: JSON.stringify(payload),
      }
    )
  } catch {
    throw new Error(
      `Could not connect to Firebase RTDB emulator at ${RTDB_HOST}.\n` +
      `Is 'npm run emulators' running?`
    )
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RTDB write failed (${res.status}): ${text}`)
  }
}
```

---

### Task 7: `main()` — CLI parsing and orchestration

**Files:**
- Modify: `scripts/seed.ts`

Parses `--preset` and `--uid`, runs the flow, prints a summary.

- [ ] **Step 1: Add `main()` and the entry point call**

```typescript
// ── Main ──

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Parse --preset
  const presetIdx = args.indexOf('--preset')
  const presetArg = presetIdx !== -1 ? args[presetIdx + 1] : 'minimal'
  if (!['minimal', 'history', 'full'].includes(presetArg)) {
    console.error(`Invalid preset '${presetArg}'. Choose: minimal | history | full`)
    process.exit(1)
  }
  const preset = presetArg as Preset

  // Parse --uid
  const uidIdx = args.indexOf('--uid')
  const uidArg = uidIdx !== -1 ? args[uidIdx + 1] : null

  let uid: string

  if (uidArg) {
    console.log(`Verifying uid '${uidArg}' in Auth emulator...`)
    await verifyUid(uidArg)
    uid = uidArg
    console.log(`✓ uid verified`)
  } else {
    console.log(`Creating test user ${SEED_EMAIL} in Auth emulator...`)
    uid = await createSeedUser()
    console.log(`✓ User created`)
    console.log(`  uid:      ${uid}`)
    console.log(`  email:    ${SEED_EMAIL}`)
    console.log(`  password: ${SEED_PASSWORD}`)
  }

  console.log(`\nBuilding '${preset}' preset...`)
  const payload = buildPayload(preset, uid)

  const setCount = Object.keys(payload.sets).length
  const sessionCount = Object.keys(payload.sessions).length
  console.log(`  ${setCount} sets, ${sessionCount} sessions`)

  console.log(`\nWriting to RTDB emulator (users/${uid})...`)
  await writeToRTDB(uid, payload)

  console.log(`✓ Done! Open http://localhost:4000 to inspect the data.`)
  console.log(`\nTo log in, use: ${SEED_EMAIL} / ${SEED_PASSWORD}`)
}

main().catch(err => {
  console.error(`\n✗ ${(err as Error).message}`)
  process.exit(1)
})
```

- [ ] **Step 2: Verify the full script compiles**

```bash
npx tsx --no-cache scripts/seed.ts --help 2>&1 | head -5
```

Expected: script starts (may error on emulator connection, which is fine — means it compiled and ran).

- [ ] **Step 3: Smoke test against running emulators**

With emulators running (`npm run emulators` in another terminal):

```bash
# Minimal preset — creates seed user
npx tsx scripts/seed.ts

# Full preset with the uid printed from the step above
npx tsx scripts/seed.ts --preset full --uid <uid-from-above>

# Verify history preset
npx tsx scripts/seed.ts --preset history
```

Expected output for a fresh run:
```
Creating test user seed@test.com in Auth emulator...
✓ User created
  uid:      <some-uid>
  email:    seed@test.com
  password: password123

Building 'minimal' preset...
  2 sets, ~10 sessions

Writing to RTDB emulator (users/<uid>)...
✓ Done! Open http://localhost:4000 to inspect the data.

To log in, use: seed@test.com / password123
```

Inspect data at http://localhost:4000.
