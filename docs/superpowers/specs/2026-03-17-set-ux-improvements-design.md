# Set UX Improvements — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Overview

Four improvements to the set management UX: a bug fix for the "Current" badge on future sets, disabling Save when nothing has changed, editing a set's number, and deleting a set.

---

## 1. Fix "Current" Badge on Future Sets

**Problem:** The "Current" badge is driven solely by `treatment.currentSetNumber`. A future set whose number matches this value (possible via edge cases) incorrectly shows the badge.

**Fix:** Add a date guard to the `isCurrent` condition in both `HistoryView` and `SetEditModal`:

```ts
const isCurrent = s.setNumber === treatment?.currentSetNumber
  && s.startDate.slice(0, 10) <= todayLocalDate()
```

A set with a start date in the future must never show as Current regardless of `treatment.currentSetNumber`.

**Files changed:** `src/views/HistoryView.tsx`, `src/components/sets/SetEditModal.tsx`

---

## 2. Disable Save When No Changes

**Problem:** The Save button in `SetEditModal` is enabled as soon as the modal opens, even when the user has not changed anything.

**Fix:** Introduce a `hasChanges` boolean that is `true` only when at least one field differs from the saved set. Add it as a requirement in `canSave`.

```ts
const noteChanged = (note.trim() || null) !== set.note
const setNumberChanged = setNumberVal !== set.setNumber  // added in feature 3
const hasChanges = startChanged || endChanged || noteChanged || setNumberChanged

const canSave = hasChanges && !saving && !durationError && !startDateError && !adjacencyError
```

**Files changed:** `src/components/sets/SetEditModal.tsx`

---

## 3. Edit Set Number

**Problem:** `SetEditModal` does not expose the set number as an editable field. Users cannot correct a set number without deleting and recreating the set.

**Design:**

- Add a **Set Number** input field at the top of `SetEditModal`, above Start Date.
- Validate that the entered number is a positive integer and does not already exist in `sets` (excluding the current set being edited).
- On save, include `setNumber` in the `updateSet` call.
- If the edited set is the current set (`set.setNumber === treatment?.currentSetNumber`), also call `updateTreatment({ currentSetNumber: newNumber })`.

**Validation:**
- Must be a positive integer ≥ 1.
- Must not match any other set's `setNumber`.
- Error message: `"Set {n} already exists"`.

**Data layer:** Extend `updateSet` in `useSets.ts` to accept `setNumber` in its updates:

```ts
updates: Partial<Pick<AlignerSet, 'startDate' | 'endDate' | 'note' | 'setNumber'>>
```

**Files changed:** `src/components/sets/SetEditModal.tsx`, `src/hooks/useSets.ts`

---

## 4. Delete a Set

**Problem:** There is no way to delete a set. Users who create sets by mistake (wrong dates, wrong number, accidental future set) have no recourse.

**Design:**

### Delete button placement
A **Delete Set** button sits below the Cancel/Save row in `SetEditModal`, styled with a red border and red text. It is always visible (not gated by whether the set has sessions).

### Confirmation
Tapping Delete replaces the modal content with an inline confirmation:

- Shows set number and a session count warning: `"{n} sessions during this set will remain in history but won't be grouped under a set."` (omit if 0 sessions).
- Two buttons: **Cancel** (go back to edit view) and **Delete** (proceed).

### After deletion — non-current set
- Delete the set from Firebase and IndexedDB.
- Close the modal.
- Adjacent sets are not auto-merged; gaps in the date sequence remain for the user to resolve via editing.

### After deletion — current set
- Delete the set from Firebase and IndexedDB.
- Do **not** update `treatment.currentSetNumber` automatically.
- Replace the modal content with a **"Pick New Current Set"** screen:
  - Shows all remaining sets sorted by set number descending.
  - Each row shows: set number, date range, duration.
  - Tapping a set calls `updateTreatment({ currentSetNumber, currentSetStartDate })` and closes the modal.

### Data layer
Add `deleteSet(setId: string)` to `useSets.ts`:

```ts
const deleteSet = useCallback(async (setId: string) => {
  const path = `users/${uid}/sets/${setId}`
  await localDB.sets.delete(setId)
  if (online) await remove(ref(db, path))
  else await queueWrite({ operation: 'delete', path, data: null, timestamp: nowISO(), deviceId })
}, [uid, online, deviceId])
```

Note: verify that `queueWrite` / `syncManager` supports a `'delete'` operation; add it if not.

**Files changed:** `src/components/sets/SetEditModal.tsx`, `src/hooks/useSets.ts`, `src/services/syncManager.ts` (if delete op is missing)

---

## Out of Scope

- Auto-merging adjacent sets when a set is deleted.
- Cascading set number renumbering when a set number changes.
- Deleting sessions associated with a deleted set.
