/**
 * One-time script: creates the default admin account and seeds knowledge tracks.
 * Run: node scripts/seedAdmin.mjs
 *
 * Requirements: Node 18+ (fetch built-in)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
const envPath = resolve(__dir, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

const ADMIN_EMAIL = "admin@connectdoctor.app";
const ADMIN_PASS = "123456";
const ADMIN_NAME = "Super Admin";

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function signUp(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data; // { localId, idToken, ... }
}

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

function fsValue(val) {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return { integerValue: String(val) };
  if (typeof val === "boolean") return { booleanValue: val };
  throw new Error(`Unsupported type: ${typeof val}`);
}

function fsDoc(obj) {
  return {
    fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fsValue(v)])),
  };
}

async function setDocument(collection, docId, data, idToken) {
  const url = `${FS_BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(fsDoc(data)),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json;
}

async function addDocument(collection, data, idToken) {
  const url = `${FS_BASE}/${collection}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(fsDoc(data)),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json;
}

async function listCollection(collection, idToken) {
  const url = `${FS_BASE}/${collection}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  const json = await res.json();
  return json.documents ?? [];
}

// ── Default tracks ───────────────────────────────────────────────────────────

const DEFAULT_TRACKS = [
  { file: "knowledge/01-forest-rain.m4a", title: "Forest Rain – Deep Calm", duration: "30:23", durationMs: 1823000, category: "Thiên nhiên" },
  { file: "knowledge/02-ocean-waves.m4a", title: "Ocean Waves – Coastal Peace", duration: "45:10", durationMs: 2710000, category: "Thiên nhiên" },
  { file: "knowledge/03-night-crickets.m4a", title: "Night Crickets – Summer Night", duration: "35:15", durationMs: 2115000, category: "Thiên nhiên" },
  { file: "knowledge/04-morning-birds.m4a", title: "Morning Birds – Dawn Chorus", duration: "28:40", durationMs: 1720000, category: "Thiên nhiên" },
  { file: "knowledge/05-flowing-stream.m4a", title: "Flowing Stream – Gentle Current", duration: "40:00", durationMs: 2400000, category: "Thiên nhiên" },
  { file: "knowledge/06-body-scan.m4a", title: "Body Scan – Full Relaxation", duration: "25:30", durationMs: 1530000, category: "Thiền định" },
  { file: "knowledge/07-breath-focus.m4a", title: "Breath Focus – 4-7-8 Technique", duration: "15:00", durationMs: 900000, category: "Thiền định" },
  { file: "knowledge/08-loving-kindness.m4a", title: "Loving Kindness – Metta", duration: "20:00", durationMs: 1200000, category: "Thiền định" },
  { file: "knowledge/09-sleep-story.m4a", title: "Sleep Story – Quiet Forest Walk", duration: "33:45", durationMs: 2025000, category: "Thiền định" },
  { file: "knowledge/10-gratitude.m4a", title: "Gratitude Meditation – Morning", duration: "12:00", durationMs: 720000, category: "Thiền định" },
  { file: "knowledge/11-piano-sleep.m4a", title: "Piano Lullaby – Soft Sleep", duration: "50:00", durationMs: 3000000, category: "Âm nhạc" },
  { file: "knowledge/12-ambient-space.m4a", title: "Ambient Space – Floating", duration: "60:00", durationMs: 3600000, category: "Âm nhạc" },
  { file: "knowledge/13-lo-fi-study.m4a", title: "Lo-fi Chill – Focus Mode", duration: "1:00:00", durationMs: 3600000, category: "Âm nhạc" },
  { file: "knowledge/14-binaural-theta.m4a", title: "Binaural Theta – Deep Relax", duration: "45:00", durationMs: 2700000, category: "Âm nhạc" },
  { file: "knowledge/15-classical-calm.m4a", title: "Classical Calm – Slow Strings", duration: "38:20", durationMs: 2300000, category: "Âm nhạc" },
];

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("ConnectDoctor – Admin seed script\n");

  // 1. Create or sign in admin user
  let uid, idToken;
  try {
    console.log(`Creating admin account: ${ADMIN_EMAIL}`);
    const cred = await signUp(ADMIN_EMAIL, ADMIN_PASS);
    uid = cred.localId;
    idToken = cred.idToken;
    console.log(`  ✓ Account created (uid: ${uid})`);
  } catch (e) {
    if (e.message.includes("EMAIL_EXISTS")) {
      console.log("  Account already exists, signing in…");
      const cred = await signIn(ADMIN_EMAIL, ADMIN_PASS);
      uid = cred.localId;
      idToken = cred.idToken;
      console.log(`  ✓ Signed in (uid: ${uid})`);
    } else {
      throw e;
    }
  }

  // 2. Set/update user document with role=admin
  console.log("\nWriting user document with role=admin…");
  await setDocument("users", uid, {
    uid,
    email: ADMIN_EMAIL,
    phone: "",
    displayName: ADMIN_NAME,
    role: "admin",
    createdAt: Date.now(),
  }, idToken);
  console.log("  ✓ /users/" + uid + " saved");

  // 3. Seed knowledge tracks (skip if already exist)
  console.log("\nChecking knowledgeTracks collection…");
  const existing = await listCollection("knowledgeTracks", idToken);
  if (existing.length > 0) {
    console.log(`  ℹ ${existing.length} tracks already exist, skipping seed.`);
  } else {
    console.log(`  Seeding ${DEFAULT_TRACKS.length} default tracks…`);
    for (let i = 0; i < DEFAULT_TRACKS.length; i++) {
      const t = DEFAULT_TRACKS[i];
      await addDocument("knowledgeTracks", { ...t, order: i + 1, createdAt: Date.now() }, idToken);
      process.stdout.write(`  [${i + 1}/${DEFAULT_TRACKS.length}] ${t.title}\n`);
    }
    console.log("  ✓ Tracks seeded");
  }

  console.log("\n✅ Done!\n");
  console.log("  Email   : " + ADMIN_EMAIL);
  console.log("  Password: " + ADMIN_PASS);
  console.log("  Role    : admin\n");
})().catch((e) => {
  console.error("✗ Error:", e.message);
  process.exit(1);
});
