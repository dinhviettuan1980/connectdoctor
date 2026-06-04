/**
 * Notify helper — pings the backend /notify endpoint when a task is done.
 * The backend sends email (Resend) + best-effort Telegram. Used by the agent.
 *
 * Usage:
 *   node scripts/notify.mjs "<subject>" "<body text>"
 *
 * Config from env vars (remote agent) or .env file (local):
 *   NOTIFY_API_BASE     — backend base url (default: https://api.tuandv.id.vn)
 *   NOTIFY_SECRET       — shared secret, must match backend (sent as x-notify-secret)
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// api.tuandv.id.vn presents a cert that doesn't verify from some machines;
// this is an internal agent helper, so skip TLS verification (matches backend).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dir = dirname(fileURLToPath(import.meta.url));

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

const API_BASE = process.env.NOTIFY_API_BASE ?? fileEnv.NOTIFY_API_BASE ?? "https://api.tuandv.id.vn";
// Prototype: default baked in so any machine that pulls the code works without a local .env.
const SECRET = process.env.NOTIFY_SECRET ?? fileEnv.NOTIFY_SECRET ?? "c3a526524e98a56e26a9f7b04e26e74b99cdac75c980b9db";

export async function notify(subject = "ConnectDoctor Agent", body = "") {
  try {
    const res = await fetch(`${API_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-secret": SECRET },
      body: JSON.stringify({ subject, body }),
    });
    const json = await res.json();
    console.log(json.ok
      ? `[notify] sent (email=${json.email}, telegram=${json.telegram})`
      : `[notify] failed: ${JSON.stringify(json)}`);
  } catch (err) {
    console.log(`[notify] request failed: ${err.message}`);
  }
}

// Run as CLI when invoked directly: node scripts/notify.mjs "<subject>" "<body>"
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await notify(process.argv[2], process.argv[3] ?? "");
}
