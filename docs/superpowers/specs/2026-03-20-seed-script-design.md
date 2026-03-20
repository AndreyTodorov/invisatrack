# Seed Script Design

**Date:** 2026-03-20
**Status:** Approved

## Overview

A Node.js CLI script (`scripts/seed.ts`) to quickly populate the local Firebase emulator with realistic sessions and aligner sets for development and manual testing. Run via `npx tsx scripts/seed.ts`.

## Goals

- Fast dev environment setup — one command to go from empty emulator to realistic data state
- Three named presets covering different testing scenarios
- Works against the existing Docker-based Firebase emulator (`demo-invisalign` project)
- No new runtime or devDependencies — uses Node's built-in `fetch` and the emulator REST APIs

## Non-Goals

- Does not run against production Firebase
- Does not seed any data into IndexedDB (Dexie) — app syncs from Firebase on load
- Does not support multiple users in a single run

## CLI Interface

```
npx tsx scripts/seed.ts [--preset minimal|history|full] [--uid <uid>]
```

- `--preset` defaults to `minimal`
- `--uid` skips user creation and performs a full overwrite of all four nodes (profile, treatment, sets, sessions) for the given uid
- Without `--uid`, creates `seed@test.com` / `password123` in the Auth emulator and prints the uid + credentials

## Presets

| Preset   | Sets | Sessions | Span      | Purpose                              |
|----------|------|----------|-----------|--------------------------------------|
| minimal  | 2    | ~10      | 2 weeks   | Get past onboarding, quick smoke test |
| history  | 5    | ~70      | 5 weeks   | Dashboard, streak, daily summary     |
| full     | 20   | ~500     | 5 months  | Reports, charts, long treatment arc  |

## Requirements

- Node.js ≥ 18 (required for native `fetch`)

## Data Seeded

All four RTDB nodes under `users/{uid}/`:

### `profile`
Seeded with sensible defaults matching `UserProfile`:
- `displayName`: "Seed User"
- `email`: "seed@test.com"
- `timezone`: "UTC"
- `dailyWearGoalMinutes`: 1320 (22h)
- `reminderThresholdMinutes`: 30
- `autoCapMinutes`: 120
- `createdAt`: first set's start date

### `treatment`
- `totalSets`: number of sets in preset (or `null` for `full` to simulate unknown)
- `defaultSetDurationDays`: 7
- `currentSetNumber`: last set number
- `currentSetStartDate`: last set's start date

### `sets` (`AlignerSet[]`)
- Sequential set numbers starting at 1
- Each past set: `startDate = previousSet.endDate`, `endDate = startDate + 7 days`
- Last set (current, in progress): `endDate` is `null` — matches the data model's convention for an active set
- `note`: null

### `sessions` (`Session[]`)
- All seeded sessions are completed — `endTime` and `endTimezoneOffset` are always non-null
- Distributed across set durations, anchored so the most recent session ends no later than the start of today (no future timestamps)
- Realistic daily pattern: 2–4 removals per day, each 20–90 minutes
- Fields per session: `startTime`, `endTime` (UTC ISO 8601), `startTimezoneOffset`, `endTimezoneOffset` (both `0` for UTC), `setNumber`, `autoCapped: false`, `createdOffline: false`, `deviceId: "seed-device-001"`, `updatedAt` (same value as `endTime`)
- Sessions always reference a valid `setNumber`

## Implementation

### Auth emulator — user creation
```
POST http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key
Body: { email, password, returnSecureToken: true }
```
Returns `localId` (uid). If user already exists (email taken), the script exits with a clear message.

### RTDB emulator — bulk write
```
PUT http://localhost:9000/users/{uid}.json?ns=demo-invisalign
Headers: Authorization: Bearer owner
Body: { profile, treatment, sets: { [id]: set, ... }, sessions: { [id]: session, ... } }
```
Single atomic write — **this is a full destructive overwrite** of the entire `users/{uid}` node. Running the script twice against the same uid will replace all previous data. IDs generated via `crypto.randomUUID()`.

### Session generation algorithm
Working backwards from today:
1. Build an ordered list of sets with their `startDate`–`endDate` ranges (last set: `startDate` to today)
2. For each calendar day in the preset's span (ending yesterday), generate 2–4 removal windows
3. Each window: random start minute within waking hours (7am–11pm), random duration 20–90 min
4. Ensure windows don't overlap within the same day
5. Derive `setNumber` for each window: find the set whose `startDate ≤ day < endDate` (or `startDate ≤ day` for the current set)
6. Map each removal window to a `Session` record

## Error Handling

- Emulator not running → clear error: "Could not connect to Firebase Auth emulator at localhost:9099. Is `npm run emulators` running?"
- Email already in use → exit with message + suggest `--uid <uid>` (uid from previous run's output)
- Invalid preset name → exit with usage message
- `--uid` provided but uid not found in Auth emulator → exit with clear message: "No Auth user found for uid <uid>. Did you mean to omit --uid and create a fresh user?" (verified via `GET /identitytoolkit.googleapis.com/v1/accounts:lookup`)

## Running

```bash
# Start emulators first
npm run emulators

# In another terminal
npx tsx scripts/seed.ts                        # minimal preset, creates test user
npx tsx scripts/seed.ts --preset full          # full preset
npx tsx scripts/seed.ts --uid abc123           # seed into existing uid
npx tsx scripts/seed.ts --preset history --uid abc123
```
