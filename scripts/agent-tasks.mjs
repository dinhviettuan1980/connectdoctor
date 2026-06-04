/**
 * Agent task helper — reads and updates tasks from Firestore via REST API.
 * Used by the Claude Code agent loop to pick up and complete tasks.
 *
 * Usage:
 *   node scripts/agent-tasks.mjs list          → list all tasks
 *   node scripts/agent-tasks.mjs next          → get next pending task (JSON)
 *   node scripts/agent-tasks.mjs waiting <id> <result>  → mark task as waiting
 *   node scripts/agent-tasks.mjs done <id>     → mark task as done
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { notify } from "./notify.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));

// Accept credentials from env vars (remote agent) or .env file (local)
let fileEnv = {};
const envPath = resolve(__dir, "../.env");
if (existsSync(envPath)) {
  fileEnv = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
  );
}

const API_KEY = process.env.FIREBASE_API_KEY ?? fileEnv.EXPO_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? fileEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const ADMIN_EMAIL = "admin@connectdoctor.app";
const ADMIN_PASS = "123456";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS, returnSecureToken: true }) },
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.idToken;
}

function fsField(val) {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return { integerValue: String(val) };
  return { stringValue: String(val) };
}

function parseDoc(doc) {
  const id = doc.name.split("/").pop();
  const fields = doc.fields ?? {};
  return {
    id,
    title: fields.title?.stringValue ?? "",
    description: fields.description?.stringValue ?? "",
    status: fields.status?.stringValue ?? "pending",
    result: fields.result?.stringValue,
    createdAt: Number(fields.createdAt?.integerValue ?? 0),
    updatedAt: Number(fields.updatedAt?.integerValue ?? 0),
  };
}

async function listTasks(idToken) {
  const res = await fetch(`${FS_BASE}/tasks?orderBy=createdAt`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const json = await res.json();
  return (json.documents ?? []).map(parseDoc);
}

async function updateTask(id, fields, idToken) {
  const fieldPaths = Object.keys(fields).join(",");
  const url = `${FS_BASE}/tasks/${id}?updateMask.fieldPaths=${Object.keys(fields).join("&updateMask.fieldPaths=")}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fsField(v)])) }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json;
}

const [,, cmd, ...args] = process.argv;

(async () => {
  const idToken = await signIn();
  const tasks = await listTasks(idToken);

  if (cmd === "list") {
    console.log("\n📋 TASKS\n");
    for (const t of tasks) {
      const icon = t.status === "pending" ? "⏳" : t.status === "waiting" ? "👀" : "✅";
      console.log(`${icon} [${t.id.slice(0, 8)}] ${t.title} — ${t.status.toUpperCase()}`);
      if (t.description) console.log(`   ${t.description}`);
      if (t.result) console.log(`   ✍ ${t.result}`);
    }
    console.log();
    return;
  }

  if (cmd === "next") {
    const next = tasks.find((t) => t.status === "pending");
    if (!next) { console.log("NO_PENDING_TASKS"); return; }
    console.log(JSON.stringify(next));
    return;
  }

  if (cmd === "waiting") {
    const [id, ...resultParts] = args;
    const result = resultParts.join(" ");
    if (!id) { console.error("Usage: agent-tasks.mjs waiting <id> <result>"); process.exit(1); }
    await updateTask(id, { status: "waiting", result, updatedAt: Date.now() }, idToken);
    console.log(`✅ Task ${id} → waiting`);
    const task = tasks.find((t) => t.id === id);
    await notify("Task chờ duyệt", `${task?.title ?? id}\n\n${result}`);
    return;
  }

  if (cmd === "done") {
    const [id] = args;
    if (!id) { console.error("Usage: agent-tasks.mjs done <id>"); process.exit(1); }
    await updateTask(id, { status: "done", updatedAt: Date.now() }, idToken);
    console.log(`✅ Task ${id} → done`);
    return;
  }

  console.error("Unknown command:", cmd);
  process.exit(1);
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
