# Sync Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all identified gaps in the local-DB ↔ Firebase sync layer: offline writes, conflict resolution for sets, atomic multi-step operations, load race, and context API hygiene.

**Architecture:** Each write goes local-first (IndexedDB) then fires Firebase without blocking — the Firebase SDK queues writes in memory when offline and flushes on reconnect. DataContext listens to Firebase pushes and merges with local state using `updatedAt` timestamps for conflict resolution. The current pattern already works for sessions; this plan extends it to sets and hardens the edges.

**Tech Stack:** React + Dexie.js (IndexedDB) + Firebase Realtime Database (RTDB) + Vitest + TypeScript

---

## Files Modified / Created

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `updatedAt` to `AlignerSet` |
| `src/services/db.ts` | Add version 3 migration to index `updatedAt` on `sets` |
| `src/hooks/useSessions.ts` | Fire-and-forget Firebase writes; fix deleteSession rollback |
| `src/hooks/useSets.ts` | Fire-and-forget Firebase writes; add `updatedAt`; atomic multi-path startNewSet |
| `src/contexts/DataContext.tsx` | Fire Firebase subscriptions after IndexedDB loaded; add `updatedAt` merge for sets; remove `setSessions` from context; clarify timeout semantics |
| `src/hooks/useSessions.test.ts` | Add tests for offline behavior and rollback fix |
| `src/hooks/useSets.test.ts` | Add tests for offline behavior and updatedAt merge |

---

## Task 1: Fire-and-forget Firebase writes in useSessions

**Problem A:** Firebase `await` hangs indefinitely when offline — the local write succeeds but the hook never returns, leaving UI stuck.

**Files:**
- Modify: `src/hooks/useSessions.ts`
- Test: `src/hooks/useSessions.test.ts`

- [ ] **Step 1: Write failing tests for offline write behavior**

Add to `useSessions.test.ts`. Use a `resolved` flag rather than a real-timer race to avoid flakiness in CI:

```ts
describe('offline write behavior', () => {
  it('startSession resolves immediately even when Firebase is unavailable', async () => {
    // Firebase hangs (never resolves) — simulates offline
    vi.mocked(fbSet).mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useSessions())

    let resolved = false
    const p = act(async () => { await result.current.startSession(1) })
    p.then(() => { resolved = true })

    // Flush microtasks — the hook must resolve without the Firebase promise
    await Promise.resolve()
    await Promise.resolve()

    expect(resolved).toBe(true)
    expect(localDB.sessions.put).toHaveBeenCalled()
  })

  it('stopSession resolves immediately even when Firebase is unavailable', async () => {
    vi.mocked(fbUpdate).mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useSessions())

    let resolved = false
    const p = act(async () => { await result.current.stopSession('s1') })
    p.then(() => { resolved = true })

    await Promise.resolve()
    await Promise.resolve()

    expect(resolved).toBe(true)
    expect(localDB.sessions.update).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/hooks/useSessions.test.ts
```
Expected: both new tests FAIL (currently awaits Firebase)

- [ ] **Step 3: Change useSessions to fire-and-forget Firebase writes**

In `src/hooks/useSessions.ts`, change `writeToFirebase` helper and all callers so Firebase is not awaited:

```ts
// Replace the writeToFirebase callback with a fire-and-forget helper
const fireToFirebase = useCallback((
  path: string,
  data: unknown,
  operation: 'set' | 'update'
) => {
  const fbRef = ref(db, path)
  const p = operation === 'set' ? set(fbRef, data) : update(fbRef, data as object)
  p.catch(err => console.error('Firebase write failed, will retry when online:', err))
}, [])
```

Update `startSession`:
```ts
await localDB.sessions.put({ ...session, uid })
fireToFirebase(`users/${uid}/sessions/${id}`, session, 'set')
return id
```

Update `stopSession`:
```ts
await localDB.sessions.update(sessionId, updates)
fireToFirebase(`users/${uid}/sessions/${sessionId}`, updates, 'update')
```

Update `updateSession`:
```ts
await localDB.sessions.update(sessionId, payload)
fireToFirebase(`users/${uid}/sessions/${sessionId}`, payload, 'update')
```

Update `addManualSession`:
```ts
await localDB.sessions.put({ ...session, uid })
fireToFirebase(`users/${uid}/sessions/${id}`, session, 'set')
```

Note: `deleteSession` is handled separately in Task 2 — keep its Firebase call as `await remove(...)` for now.

- [ ] **Step 4: Run all useSessions tests**

```bash
npx vitest run src/hooks/useSessions.test.ts
```
Expected: all PASS including the two new offline tests

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSessions.ts src/hooks/useSessions.test.ts
git commit -m "fix: fire-and-forget Firebase writes in useSessions — resolves offline hang"
```

---

## Task 2: Fix deleteSession rollback (restore IndexedDB on failure)

**Problem B:** If local delete succeeds but Firebase delete fails, the session is gone from IndexedDB. When Firebase's `onValue` fires next, it pushes the session back — causing it to reappear. The existing rollback only restores React state, not IndexedDB.

**Files:**
- Modify: `src/hooks/useSessions.ts`
- Test: `src/hooks/useSessions.test.ts`

- [ ] **Step 1: Write failing test**

Add to `useSessions.test.ts`:

```ts
it('deleteSession restores session to IndexedDB if Firebase remove fails', async () => {
  const session = makeSession('s1', '2026-03-17T09:00:00.000Z', null)
  vi.mocked(useDataContext).mockReturnValue({
    sessions: [session],
    setSessions: vi.fn(),
  } as never)
  vi.mocked(localDB.sessions.delete).mockResolvedValue(undefined as never)
  vi.mocked(fbRemove).mockRejectedValue(new Error('Firebase error'))

  // localDB.sessions.put must be available for the rollback
  vi.mocked(localDB.sessions.put).mockResolvedValue(undefined as never)

  const { result } = renderHook(() => useSessions())

  await expect(
    act(async () => { await result.current.deleteSession('s1') })
  ).rejects.toThrow('Firebase error')

  // Should have tried to restore to IndexedDB
  expect(localDB.sessions.put).toHaveBeenCalledWith(
    expect.objectContaining({ id: 's1', uid: 'user1' })
  )
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/hooks/useSessions.test.ts --reporter=verbose
```
Expected: new test FAIL

- [ ] **Step 3: Fix rollback in deleteSession**

In `src/hooks/useSessions.ts`, update `deleteSession`:

```ts
const deleteSession = useCallback(async (sessionId: string) => {
  const session = sessions.find(s => s.id === sessionId)
  setSessions(prev => prev.filter(s => s.id !== sessionId))
  try {
    await localDB.sessions.delete(sessionId)
    await remove(ref(db, `users/${uid}/sessions/${sessionId}`))
  } catch (e) {
    if (session) {
      await localDB.sessions.put({ ...session, uid }).catch(() => {})
      setSessions(prev => [...prev, session])
    }
    throw e
  }
}, [uid, sessions, setSessions])
```

- [ ] **Step 4: Run all useSessions tests**

```bash
npx vitest run src/hooks/useSessions.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSessions.ts src/hooks/useSessions.test.ts
git commit -m "fix: restore IndexedDB on deleteSession Firebase failure"
```

---

## Task 3: Add updatedAt to AlignerSet and fix sets merge conflict

**Problem C:** `AlignerSet` has no `updatedAt` timestamp, so DataContext blindly overwrites local sets with Firebase data. If a user edits a set offline, the change is lost when Firebase's `onValue` fires.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useSets.ts`
- Modify: `src/contexts/DataContext.tsx`
- Test: `src/hooks/useSets.test.ts`

- [ ] **Step 1: Add `updatedAt` to AlignerSet type and add Dexie schema migration**

In `src/types/index.ts`:

```ts
export interface AlignerSet {
  id: string
  setNumber: number
  startDate: string
  endDate: string | null
  note: string | null
  updatedAt: string   // add this line
}
```

In `src/services/db.ts`, add a version 3 migration to index `updatedAt` on sets (matching the existing sessions index):

```ts
this.version(3).stores({
  sets: 'id, uid, setNumber, startDate, updatedAt',
})
```

This keeps the schema consistent with sessions and enables future indexed queries on `updatedAt` for sets.

- [ ] **Step 2: Update useSets to stamp updatedAt on all writes**

In `src/hooks/useSets.ts`, add `nowISO` import and stamp all mutations.

Import:
```ts
import { nowISO, addDays, todayLocalDate } from '../utils/time'
```

In `startNewSet`, add `updatedAt` to `newSet`:
```ts
const newSet: AlignerSet = {
  id,
  setNumber,
  startDate: startDateStr,
  endDate,
  note: null,
  updatedAt: nowISO(),
}
```

Also stamp when closing the previous set in `startNewSet`:
```ts
const updates = { endDate: startDateStr, updatedAt: nowISO() }
```

In `updateSet`, add `updatedAt` to updates:
```ts
const updateSet = useCallback(async (
  setId: string,
  updates: Partial<Pick<AlignerSet, 'startDate' | 'endDate' | 'note' | 'setNumber'>>
) => {
  const payload = { ...updates, updatedAt: nowISO() }
  await localDB.sets.update(setId, payload)
  fireToFirebase(`users/${uid}/sets/${setId}`, payload, 'update')
}, [uid, fireToFirebase])
```

Also switch to fire-and-forget in useSets (same pattern as Task 1). Add `fireToFirebase` helper at the top of `useSets`:
```ts
const fireToFirebase = useCallback((path: string, data: unknown, operation: 'set' | 'update') => {
  const fbRef = ref(db, path)
  const p = operation === 'set' ? set(fbRef, data) : update(fbRef, data as object)
  p.catch(err => console.error('Firebase write failed:', err))
}, [])
```

Update all Firebase write calls in `useSets` to use `fireToFirebase` (non-awaited). Keep `startNewSet`'s multi-step Firebase operations as they will be refactored in Task 4.

- [ ] **Step 3: Write failing tests and update existing fixtures**

First, update `makeSet` and the inline `setWithEndDate` literal in `useSets.test.ts` to include the now-required `updatedAt` field (otherwise TypeScript compile fails):

```ts
const makeSet = (id: string, setNumber: number): AlignerSet => ({
  id,
  setNumber,
  startDate: '2026-03-10',
  endDate: null,
  note: null,
  updatedAt: '2026-03-10T00:00:00.000Z',  // add this
})

// Also update the inline literal around line 129:
const setWithEndDate: AlignerSet = {
  id: 's1', setNumber: 3, startDate: '2026-03-10', endDate: '2026-03-17',
  note: null, updatedAt: '2026-03-10T00:00:00.000Z',  // add this
}
```

Then, in the mock setup add `nowISO`:
```ts
vi.mock('../utils/time', () => ({
  nowISO: vi.fn(() => '2026-03-17T10:00:00.000Z'),
  todayLocalDate: vi.fn(() => '2026-03-17'),
  addDays: vi.fn((dateStr: string, days: number) => {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }),
}))
```

Add tests:
```ts
it('startNewSet stamps updatedAt on new set', async () => {
  const { result } = renderHook(() => useSets())
  await act(async () => { await result.current.startNewSet(1, '2026-03-17', 7) })

  expect(localDB.sets.put).toHaveBeenCalledWith(
    expect.objectContaining({ updatedAt: '2026-03-17T10:00:00.000Z' })
  )
})

it('updateSet stamps updatedAt', async () => {
  const { result } = renderHook(() => useSets())
  await act(async () => { await result.current.updateSet('s1', { note: 'hello' }) })

  expect(localDB.sets.update).toHaveBeenCalledWith(
    's1',
    expect.objectContaining({ updatedAt: '2026-03-17T10:00:00.000Z' })
  )
})
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
npx vitest run src/hooks/useSets.test.ts
```

- [ ] **Step 5: Implement the updatedAt changes in useSets**

(Implement the changes described in Step 2.)

- [ ] **Step 6: Add merge logic for sets in DataContext**

In `src/contexts/DataContext.tsx`, replace the simple-replace sets handler:

```ts
const unsubSets = onValue(setsRef(uid), snap => {
  const data = snap.val() ?? {}
  const firebaseSets: AlignerSet[] = Object.entries(data).map(
    ([id, v]) => ({ id, ...(v as object) } as AlignerSet)
  )

  setSets(prev => {
    const firebaseIds = new Set(firebaseSets.map(s => s.id))
    const localOnly = prev.filter(s => !firebaseIds.has(s.id))
    return [...firebaseSets, ...localOnly]
  })

  firebaseSets.forEach(async s => {
    try {
      const existing = await localDB.sets.get(s.id)
      if (!existing || (existing.updatedAt ?? '') < (s.updatedAt ?? '')) {
        await localDB.sets.put({ ...s, uid })
      }
    } catch (err) {
      console.error('Failed to persist set to IndexedDB:', err)
    }
  })
})
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run src/hooks/useSets.test.ts src/hooks/useSessions.test.ts
```
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/hooks/useSets.ts src/hooks/useSets.test.ts src/contexts/DataContext.tsx
git commit -m "feat: add updatedAt to AlignerSet and fix multi-device conflict resolution for sets"
```

---

## Task 4: Make startNewSet atomic with Firebase multi-path update

**Problem D:** `startNewSet` makes 3-4 independent Firebase writes. A failure mid-way leaves the database in an inconsistent state (e.g. old set closed but new set never created).

Firebase RTDB supports atomic multi-path updates: `update(ref(db, '/'), { 'path/a': val, 'path/b': val })` — either all paths are written or none.

**Files:**
- Modify: `src/hooks/useSets.ts`
- Test: `src/hooks/useSets.test.ts`

- [ ] **Step 1: Add `localDB.transaction` to the mock and write the failing test**

The `localDB` mock in `useSets.test.ts` does not include `transaction`. The refactored `startNewSet` calls it, so add it to the mock — the mock simply invokes the callback immediately:

```ts
vi.mock('../services/db', () => ({
  localDB: {
    sets: { put: vi.fn(), update: vi.fn(), delete: vi.fn() },
    treatment: { update: vi.fn() },
    transaction: vi.fn((_mode: string, _tables: unknown[], fn: () => Promise<void>) => fn()),
  },
}))
```

Then add to `useSets.test.ts`:

```ts
it('startNewSet uses a single Firebase multi-path update for atomicity', async () => {
  vi.mocked(useDataContext).mockReturnValue({
    sets: [makeSet('s1', 3)],
    treatment: makeTreatment(3),
  } as never)

  const { result } = renderHook(() => useSets())
  await act(async () => { await result.current.startNewSet(4, '2026-03-17', 7) })

  // Should have called fbUpdate exactly once (multi-path) for Firebase
  expect(fbUpdate).toHaveBeenCalledTimes(1)
  // The single call should contain all three paths
  const [, updatePayload] = vi.mocked(fbUpdate).mock.calls[0]
  expect(updatePayload).toMatchObject({
    [`users/user1/sets/s1`]: expect.objectContaining({ endDate: '2026-03-17' }),
    [`users/user1/sets/new-set-id`]: expect.objectContaining({ setNumber: 4 }),
    [`users/user1/treatment`]: expect.objectContaining({ currentSetNumber: 4 }),
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/hooks/useSets.test.ts --reporter=verbose
```

- [ ] **Step 3: Refactor startNewSet to use multi-path Firebase update and Dexie transaction**

In `src/hooks/useSets.ts`, replace `startNewSet`:

```ts
const startNewSet = useCallback(async (setNumber: number, startDateStr: string, durationDays: number) => {
  const alreadyExists = sets.find(s => s.setNumber === setNumber)
  if (alreadyExists) throw new Error(`Set ${setNumber} already exists.`)

  const endDate = addDays(startDateStr, durationDays)
  const now = nowISO()
  const newRef = push(setsRef(uid))
  const id = newRef.key!

  const newSet: AlignerSet = {
    id,
    setNumber,
    startDate: startDateStr,
    endDate,
    note: null,
    updatedAt: now,
  }

  const isToday = startDateStr <= todayLocalDate()
  const currentSet = treatment?.currentSetNumber
    ? sets.find(s => s.setNumber === treatment.currentSetNumber)
    : null
  const shouldClosePrev = isToday && currentSet?.endDate === null

  // 1. Atomic IndexedDB transaction
  await localDB.transaction('rw', [localDB.sets, localDB.treatment], async () => {
    if (shouldClosePrev && currentSet) {
      await localDB.sets.update(currentSet.id, { endDate: startDateStr, updatedAt: now })
    }
    await localDB.sets.put({ ...newSet, uid })
    if (isToday) {
      await localDB.treatment.update(uid, {
        currentSetNumber: setNumber,
        currentSetStartDate: startDateStr,
      })
    }
  })

  // 2. Atomic Firebase multi-path update (fire-and-forget)
  const firebaseUpdates: Record<string, unknown> = {}
  if (shouldClosePrev && currentSet) {
    firebaseUpdates[`users/${uid}/sets/${currentSet.id}`] = {
      ...currentSet,
      endDate: startDateStr,
      updatedAt: now,
    }
  }
  firebaseUpdates[`users/${uid}/sets/${id}`] = newSet
  if (isToday) {
    firebaseUpdates[`users/${uid}/treatment`] = {
      ...treatment,
      currentSetNumber: setNumber,
      currentSetStartDate: startDateStr,
    }
  }

  update(ref(db, '/'), firebaseUpdates)
    .catch(err => console.error('Firebase multi-path update failed:', err))

}, [uid, sets, treatment])
```

- [ ] **Step 4: Run all useSets tests**

```bash
npx vitest run src/hooks/useSets.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSets.ts src/hooks/useSets.test.ts
git commit -m "fix: make startNewSet atomic with Dexie transaction and Firebase multi-path update"
```

---

## Task 5: Fix Firebase/IndexedDB load race in DataContext

**Problem F:** Both `useEffect`s in DataContext run in parallel. Firebase's `onValue` may fire and overwrite React state before IndexedDB finishes loading, then IndexedDB overwrites Firebase data, then Firebase overwrites again — a stale data flash for sets/profile/treatment.

Fix: subscribe to Firebase only after IndexedDB has loaded.

**Files:**
- Modify: `src/contexts/DataContext.tsx`

- [ ] **Step 1: Gate Firebase subscription on `loaded`**

In `DataContext.tsx`, add `loaded` as a dependency to the Firebase subscription `useEffect`:

```ts
// Subscribe to Firebase real-time updates (only after IndexedDB has loaded)
useEffect(() => {
  if (!loaded) return

  const unsubSessions = onValue(sessionsRef(uid), snap => {
    // ... existing sessions handler
  })

  const unsubSets = onValue(setsRef(uid), snap => {
    // ... existing sets handler
  })

  const unsubProfile = onValue(profileRef(uid), snap => {
    // ... existing profile handler
  })

  const unsubTreatment = onValue(treatmentRef(uid), snap => {
    // ... existing treatment handler
  })

  return () => { unsubSessions(); unsubSets(); unsubProfile(); unsubTreatment() }
}, [uid, loaded])  // ← add loaded to deps
```

This ensures Firebase listeners only start once local data is in state. The `loaded` flag goes `false → true` once and never reverts, so there is no listener cycling.

- [ ] **Step 2: Verify app still works**

```bash
npx vitest run
```
Expected: all tests PASS (no tests directly test DataContext effects, but nothing should break)

- [ ] **Step 3: Commit**

```bash
git add src/contexts/DataContext.tsx
git commit -m "fix: gate Firebase subscriptions on IndexedDB load to eliminate state race"
```

---

## Task 6: Remove setSessions from DataContext public API

**Problem G:** `setSessions` is a raw React state setter exposed on the context, allowing any component to bypass the write hooks and mutate sessions without touching IndexedDB or Firebase.

Fix: remove `setSessions` from context. `deleteSession` (the only consumer) gets a `onSessionDeleted` callback via the hook's own closure.

**Files:**
- Modify: `src/contexts/DataContext.tsx`
- Modify: `src/hooks/useSessions.ts`
- Test: `src/hooks/useSessions.test.ts`
- Test: `src/views/HomeView.test.tsx` (5 mock literals with stale `setSessions`)

- [ ] **Step 1: Remove setSessions from context value and interface**

In `DataContext.tsx`, remove `setSessions` from `DataContextValue` interface and from the Provider value:

```ts
interface DataContextValue {
  sessions: Session[]
  sets: AlignerSet[]
  profile: UserProfile | null
  treatment: Treatment | null
  loaded: boolean
  firebaseTreatmentLoaded: boolean
  // setSessions removed
}
```

And expose it internally only:
```ts
// Keep the useState setter but don't export it
const [sessions, setSessions] = useState<Session[]>([])
```

Add an `onSessionDeleted` action to the context instead:
```ts
interface DataContextValue {
  // ... existing fields
  onSessionDeleted: (sessionId: string) => void
}
```

In the Provider, implement it:
```ts
const onSessionDeleted = useCallback((sessionId: string) => {
  setSessions(prev => prev.filter(s => s.id !== sessionId))
}, [])
```

And expose:
```ts
<DataContext.Provider value={{ sessions, sets, profile, treatment, loaded, firebaseTreatmentLoaded, onSessionDeleted }}>
```

Also add an `onSessionRestored` for rollback:
```ts
interface DataContextValue {
  onSessionDeleted: (sessionId: string) => void
  onSessionRestored: (session: Session) => void
}

const onSessionRestored = useCallback((session: Session) => {
  setSessions(prev => [...prev, session])
}, [])
```

- [ ] **Step 2: Update useSessions to use the new context actions**

In `src/hooks/useSessions.ts`:

```ts
const { sessions, onSessionDeleted, onSessionRestored } = useDataContext()
```

Update `deleteSession`:
```ts
const deleteSession = useCallback(async (sessionId: string) => {
  const session = sessions.find(s => s.id === sessionId)
  onSessionDeleted(sessionId)
  try {
    await localDB.sessions.delete(sessionId)
    await remove(ref(db, `users/${uid}/sessions/${sessionId}`))
  } catch (e) {
    if (session) {
      await localDB.sessions.put({ ...session, uid }).catch(() => {})
      onSessionRestored(session)
    }
    throw e
  }
}, [uid, sessions, onSessionDeleted, onSessionRestored])
```

- [ ] **Step 3: Update tests**

In `useSessions.test.ts`, update the top-level DataContext mock to use the new API (replacing the old `setSessions` mock):

```ts
vi.mock('../contexts/DataContext', () => ({
  useDataContext: vi.fn(() => ({
    sessions: [],
    onSessionDeleted: vi.fn(),
    onSessionRestored: vi.fn(),
  })),
}))
```

Update the deleteSession optimistic removal test to check `onSessionDeleted` instead of `setSessions`:
```ts
it('optimistically removes session from React state when deleted', async () => {
  const onSessionDeleted = vi.fn()
  vi.mocked(useDataContext).mockReturnValue({
    sessions: [makeSession('s1', '2026-03-17T09:00:00.000Z', null)],
    onSessionDeleted,
    onSessionRestored: vi.fn(),
  } as never)

  const { result } = renderHook(() => useSessions())
  await act(async () => { await result.current.deleteSession('s1') })

  expect(onSessionDeleted).toHaveBeenCalledWith('s1')
})
```

Also update the Task 2 rollback test (`deleteSession restores session to IndexedDB if Firebase remove fails`) — it currently provides `setSessions` which no longer exists on context. Replace with `onSessionDeleted` and `onSessionRestored`:
```ts
it('deleteSession restores session to IndexedDB if Firebase remove fails', async () => {
  const session = makeSession('s1', '2026-03-17T09:00:00.000Z', null)
  vi.mocked(useDataContext).mockReturnValue({
    sessions: [session],
    onSessionDeleted: vi.fn(),
    onSessionRestored: vi.fn(),  // ← replaces the old setSessions rollback
  } as never)
  vi.mocked(localDB.sessions.delete).mockResolvedValue(undefined as never)
  vi.mocked(fbRemove).mockRejectedValue(new Error('Firebase error'))
  vi.mocked(localDB.sessions.put).mockResolvedValue(undefined as never)

  const { result } = renderHook(() => useSessions())

  await expect(
    act(async () => { await result.current.deleteSession('s1') })
  ).rejects.toThrow('Firebase error')

  expect(localDB.sessions.put).toHaveBeenCalledWith(
    expect.objectContaining({ id: 's1', uid: 'user1' })
  )
})
```

- [ ] **Step 4: Update HomeView.test.tsx mock literals**

In `/Users/andrey/SideProjects/invisalign/src/views/HomeView.test.tsx`, there are 5 `useDataContext` mock return values (around lines 78, 89, 102, 113, 125). In each one:
- Remove: `setSessions: vi.fn()`
- Add: `onSessionDeleted: vi.fn(), onSessionRestored: vi.fn()`

Example — change from:
```ts
useDataContext: vi.fn(() => ({ sessions: [...], ..., setSessions: vi.fn() }))
```
to:
```ts
useDataContext: vi.fn(() => ({ sessions: [...], ..., onSessionDeleted: vi.fn(), onSessionRestored: vi.fn() }))
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/contexts/DataContext.tsx src/hooks/useSessions.ts src/hooks/useSessions.test.ts src/views/HomeView.test.tsx
git commit -m "refactor: remove setSessions from DataContext public API, expose named actions"
```

---

## Task 7: Clarify firebaseTreatmentLoaded timeout semantics

**Problem H:** `firebaseTreatmentLoaded` becomes `true` after a 5s timeout even when Firebase never responded — callers receive a "loaded" signal but treatment may be `null`. The name implies "Firebase data was loaded" when it actually means "Firebase had its chance".

Fix: rename to `treatmentReady` throughout.

**Files:**
- Modify: `src/contexts/DataContext.tsx`
- Modify: `src/contexts/DataContext.test.tsx` (6 usages of `firebaseTreatmentLoaded`)
- Modify: `src/views/HomeView.test.tsx` (5 usages of `firebaseTreatmentLoaded`)
- Modify: any other file surfaced by the grep in Step 1

- [ ] **Step 1: Find all usages**

```bash
grep -r "firebaseTreatmentLoaded" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 2: Rename in DataContext and all consumers**

In `DataContext.tsx`:
- Rename `firebaseTreatmentLoaded` state to `treatmentReady`
- Rename in `DataContextValue` interface
- Add clarifying comment:
  ```ts
  // treatmentReady: true when Firebase treatment was received OR 5s timeout elapsed.
  // Callers should guard against treatment being null even when this is true.
  ```

In all consumer files, update the destructured name.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename firebaseTreatmentLoaded to treatmentReady with clarifying comment"
```

---

## Final verification

- [ ] **Run full test suite**

```bash
npx vitest run
```
Expected: all PASS, no regressions

- [ ] **Manual smoke test**
  - Open app, create a session — should work
  - Open browser DevTools > Network > set Offline — create another session, should succeed immediately
  - Go back online — session should appear in Firebase (RTDB emulator or console)
  - Open app on second browser tab — changes from one tab should appear in the other within ~1s
