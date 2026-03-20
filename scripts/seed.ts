#!/usr/bin/env node

import { readFileSync } from "fs";
import { join } from "path";

// ── Types (self-contained — intentionally not imported from src/types to avoid bundler deps) ──
// Note: endTime and endTimezoneOffset are non-nullable here because all seeded sessions
// are completed. The app's src/types/index.ts defines them as `string | null` / `number | null`.

interface Session {
  id: string;
  startTime: string;
  endTime: string; // always non-null for seeded data
  startTimezoneOffset: number;
  endTimezoneOffset: number; // always non-null for seeded data
  setNumber: number;
  autoCapped: boolean;
  createdOffline: boolean;
  deviceId: string;
  updatedAt: string;
}

interface AlignerSet {
  id: string;
  setNumber: number;
  startDate: string;
  endDate: string | null;
  note: null;
}

interface UserProfile {
  displayName: string;
  email: string;
  timezone: string;
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

interface SeedPayload {
  profile: UserProfile;
  treatment: Treatment;
  sets: Record<string, AlignerSet>;
  sessions: Record<string, Session>;
  seedVersion: number;
}

// ── Preset config ──

type Preset = "minimal" | "history" | "full";

const PRESETS: Record<Preset, { sets: number; totalSets: number | null }> = {
  minimal: { sets: 2,  totalSets: 10   },
  history: { sets: 5,  totalSets: 20   },
  full:    { sets: 20, totalSets: 62   },
};

const DEVICE_ID = "seed-device-001";
const AUTH_HOST = "http://localhost:9099";
const RTDB_HOST = "http://localhost:9000";
const RTDB_NS = resolveRtdbNamespace();
const SEED_EMAIL = "seed@test.com";
const SEED_PASSWORD = "password123";

// ── Tweak these to change generated session patterns ──
const MIN_REMOVALS_PER_DAY = 2;
const MAX_REMOVALS_PER_DAY = 4;
const MIN_SESSION_MINUTES = 15;
const MAX_SESSION_MINUTES = 45;

/**
 * Derives the RTDB namespace from VITE_FIREBASE_DATABASE_URL in .env/.env.local.
 * e.g. https://my-project-default-rtdb.firebasedatabase.app → my-project-default-rtdb
 * Falls back to 'demo-invisalign' if not found.
 */
function resolveRtdbNamespace(): string {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(join(process.cwd(), file), "utf8");
      const match = content.match(/VITE_FIREBASE_DATABASE_URL=(.+)/);
      if (match) {
        const nsMatch = match[1].trim().match(/https?:\/\/([^.]+)\./);
        if (nsMatch) return nsMatch[1];
      }
    } catch {
      /* file not found, try next */
    }
  }
  return "demo-invisalign";
}

// ── Date helpers ──

/** Returns 'YYYY-MM-DD' for a Date object in UTC */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Adds N calendar days to a 'YYYY-MM-DD' string, returns 'YYYY-MM-DD' */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

/** Today's date as 'YYYY-MM-DD' in UTC */
function todayUTC(): string {
  return toDateStr(new Date());
}

// ── Set generator ──

/**
 * Generates `count` AlignerSets ending at today.
 * Sets are numbered 1..count. The last set is in progress (endDate: null).
 * Each set spans 7 days.
 */
function generateSets(count: number): AlignerSet[] {
  const SET_DURATION = 7;
  const today = todayUTC();

  // Walk backwards: last set started (count-1)*7 days before today
  let startDate = addDays(today, -(count - 1) * SET_DURATION);

  const sets: AlignerSet[] = [];
  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const endDate = isLast ? null : addDays(startDate, SET_DURATION);
    sets.push({
      id: crypto.randomUUID(),
      setNumber: i,
      startDate,
      endDate,
      note: null,
    });
    startDate = addDays(startDate, SET_DURATION);
  }
  return sets;
}

// ── Session generator ──

/**
 * Generates sessions for all days in [sets[0].startDate, yesterday] (inclusive).
 * 2–4 removal windows per day, each 20–90 min, within waking hours (7am–11pm UTC).
 * All sessions are completed (non-null endTime).
 */
function generateSessions(sets: AlignerSet[]): Session[] {
  const yesterday = addDays(todayUTC(), -1);

  function getSetNumber(dateStr: string): number {
    for (const s of sets) {
      const afterStart = dateStr >= s.startDate;
      const beforeEnd = s.endDate === null || dateStr < s.endDate;
      if (afterStart && beforeEnd) return s.setNumber;
    }
    return sets[sets.length - 1].setNumber;
  }

  const firstDate = sets[0].startDate;
  const sessions: Session[] = [];

  let cursor = firstDate;
  while (cursor <= yesterday) {
    const removalsToday =
      MIN_REMOVALS_PER_DAY +
      Math.floor(
        Math.random() * (MAX_REMOVALS_PER_DAY - MIN_REMOVALS_PER_DAY + 1),
      );
    const usedSlots: Array<[number, number]> = [];

    for (let r = 0; r < removalsToday; r++) {
      // Waking hours: 7am (420 min) – 11pm (1380 min).
      // Pick startMin in [420, 1360] so a minimum 20-min session still ends by 23:00.
      // Then clamp duration so endMin never exceeds 1380.
      let attempts = 0;
      let startMin: number;
      let endMin: number;
      do {
        startMin =
          420 +
          Math.floor(Math.random() * (1380 - MAX_SESSION_MINUTES - 420 + 1)); // within waking hours
        const maxDuration = Math.min(MAX_SESSION_MINUTES, 1380 - startMin);
        const duration =
          MIN_SESSION_MINUTES +
          Math.floor(Math.random() * (maxDuration - MIN_SESSION_MINUTES + 1));
        endMin = startMin + duration;
        attempts++;
      } while (
        attempts < 20 &&
        usedSlots.some(([s, e]) => startMin < e && endMin > s)
      );
      if (attempts >= 20) continue;

      usedSlots.push([startMin, endMin]);

      const startTime = new Date(cursor + "T00:00:00Z");
      startTime.setUTCMinutes(startTime.getUTCMinutes() + startMin);

      const endTime = new Date(cursor + "T00:00:00Z");
      endTime.setUTCMinutes(endTime.getUTCMinutes() + endMin);

      const startISO = startTime.toISOString();
      const endISO = endTime.toISOString();

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
      });
    }

    cursor = addDays(cursor, 1);
  }

  return sessions;
}

// ── Payload builder ──

function buildPayload(preset: Preset): SeedPayload {
  const config = PRESETS[preset];
  const sets = generateSets(config.sets);
  const sessions = generateSessions(sets);

  const currentSet = sets[sets.length - 1];

  const profile: UserProfile = {
    displayName: "Seed User",
    email: SEED_EMAIL,
    timezone: "UTC",
    dailyWearGoalMinutes: 1320,
    reminderThresholdMinutes: 30,
    autoCapMinutes: 120,
    createdAt: sets[0].startDate + "T00:00:00.000Z",
  };

  const treatment: Treatment = {
    totalSets: config.totalSets,
    defaultSetDurationDays: 7,
    currentSetNumber: currentSet.setNumber,
    currentSetStartDate: currentSet.startDate,
  };

  const setsMap: Record<string, AlignerSet> = {};
  for (const s of sets) setsMap[s.id] = s;

  const sessionsMap: Record<string, Session> = {};
  for (const s of sessions) sessionsMap[s.id] = s;

  return { profile, treatment, sets: setsMap, sessions: sessionsMap, seedVersion: Date.now() };
}

// ── Auth emulator helper ──

/** Creates seed@test.com, or signs in if it already exists. Returns uid. */
async function getOrCreateSeedUser(photoURL: string): Promise<string> {
  const post = async (path: string, body: object) => {
    try {
      return await fetch(`${AUTH_HOST}${path}?key=fake-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(
        `Could not connect to Firebase Auth emulator at ${AUTH_HOST}.\n` +
          `Is 'npm run emulators' running?`,
      );
    }
  };

  const signUpRes = await post(
    "/identitytoolkit.googleapis.com/v1/accounts:signUp",
    { email: SEED_EMAIL, password: SEED_PASSWORD, displayName: "Seed User", photoUrl: photoURL, returnSecureToken: true },
  );

  if (signUpRes.ok) {
    const data = (await signUpRes.json()) as { localId: string };
    return data.localId;
  }

  const signUpBody = (await signUpRes.json()) as {
    error?: { message?: string };
  };
  if (signUpBody?.error?.message !== "EMAIL_EXISTS") {
    throw new Error(
      `Auth emulator sign-up failed: ${signUpBody?.error?.message ?? "unknown error"}`,
    );
  }

  // User already exists — sign in to get idToken, then update photoUrl
  const signInRes = await post(
    "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
    { email: SEED_EMAIL, password: SEED_PASSWORD, returnSecureToken: true },
  );
  if (!signInRes.ok) {
    const b = (await signInRes.json()) as { error?: { message?: string } };
    throw new Error(
      `Auth emulator sign-in failed: ${b?.error?.message ?? "unknown error"}`,
    );
  }
  const signInData = (await signInRes.json()) as { localId: string; idToken: string };

  const updateRes = await post(
    "/identitytoolkit.googleapis.com/v1/accounts:update",
    { idToken: signInData.idToken, displayName: "Seed User", photoUrl: photoURL },
  );
  if (!updateRes.ok) {
    const b = (await updateRes.json()) as { error?: { message?: string } };
    throw new Error(
      `Auth emulator profile update failed: ${b?.error?.message ?? "unknown error"}`,
    );
  }

  return signInData.localId;
}

// ── RTDB write ──

async function writeToRTDB(uid: string, payload: SeedPayload): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${RTDB_HOST}/users/${uid}.json?ns=${RTDB_NS}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Could not connect to Firebase RTDB emulator at ${RTDB_HOST}.\n` +
        `Is 'npm run emulators' running?`,
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RTDB write failed (${res.status}): ${text}`);
  }
}

// ── Main ──

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse --preset
  const presetIdx = args.indexOf("--preset");
  const presetArg = presetIdx !== -1 ? args[presetIdx + 1] : "minimal";
  if (!["minimal", "history", "full"].includes(presetArg ?? "")) {
    console.error(
      `Invalid preset '${presetArg}'. Choose: minimal | history | full`,
    );
    process.exit(1);
  }
  const preset = (presetArg ?? "minimal") as Preset;

  const avatarSeed = crypto.randomUUID();
  const photoURL = `https://i.pravatar.cc/300?u=${avatarSeed}`;

  console.log(`Getting seed user ${SEED_EMAIL}...`);
  const uid = await getOrCreateSeedUser(photoURL);
  console.log(`✓ uid: ${uid}`);

  console.log(`\nBuilding '${preset}' preset...`);
  const payload = buildPayload(preset);

  const setCount = Object.keys(payload.sets).length;
  const sessionCount = Object.keys(payload.sessions).length;
  console.log(`  ${setCount} sets, ${sessionCount} sessions`);

  console.log(`\nWriting to RTDB emulator (users/${uid})...`);
  await writeToRTDB(uid, payload);

  console.log(`✓ Done! Open http://localhost:4000 to inspect the data.`);
  console.log(`\nTo log in, use: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main().catch((err) => {
  console.error(`\n✗ ${(err as Error).message}`);
  process.exit(1);
});
