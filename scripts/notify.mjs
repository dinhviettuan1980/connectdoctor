/**
 * Notify helper — sends Telegram + email directly when a task is done.
 * Used by the agent at the end of a run. Sends straight from the local machine
 * (which can reach both api.telegram.org and api.resend.com); the AWS backend is
 * blocked from Telegram, so we don't route through it for the agent path.
 *
 * Usage:
 *   node scripts/notify.mjs "<subject>" "<body text>"
 *
 * Keys are baked in (prototype) so any clone works without setup; override via
 * env vars or scripts/.env if needed: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
 * RESEND_API_KEY, NOTIFY_EMAIL.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const cfg = (k, fallback) => process.env[k] ?? fileEnv[k] ?? fallback;

const TELEGRAM_TOKEN = cfg("TELEGRAM_BOT_TOKEN", "8000475351:AAHFDCHXk9MxHvw0TWnwVhJjaYpuORQLNqk");
const TELEGRAM_CHAT_ID = cfg("TELEGRAM_CHAT_ID", "5689839645");
const RESEND_API_KEY = cfg("RESEND_API_KEY", "re_edUJcpZr_D3FMaXSPhRn152zds4Fox3XS");
const EMAIL = cfg("NOTIFY_EMAIL", "tuandv@gmail.com");

async function sendTelegram(subject, body) {
  if (!TELEGRAM_TOKEN) { console.log("[notify] no Telegram token, skipping"); return; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `🤖 ${subject}\n\n${body}` }),
    });
    const json = await res.json();
    console.log(json.ok ? "[notify] Telegram sent" : `[notify] Telegram failed: ${JSON.stringify(json)}`);
  } catch (err) {
    console.log(`[notify] Telegram request failed: ${err.message}`);
  }
}

async function sendEmail(subject, body) {
  if (!RESEND_API_KEY) { console.log("[notify] no Resend key, skipping email"); return; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "ConnectDoctor Agent <onboarding@resend.dev>",
        to: [EMAIL],
        subject,
        html: `<h2>${subject}</h2><pre style="font-family:inherit;white-space:pre-wrap">${body}</pre>`,
      }),
    });
    const json = await res.json();
    console.log(json.id ? `[notify] email sent (${json.id})` : `[notify] email failed: ${JSON.stringify(json)}`);
  } catch (err) {
    console.log(`[notify] email request failed: ${err.message}`);
  }
}

export async function notify(subject = "ConnectDoctor Agent", body = "") {
  await Promise.allSettled([sendTelegram(subject, body), sendEmail(subject, body)]);
}

// Run as CLI when invoked directly: node scripts/notify.mjs "<subject>" "<body>"
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await notify(process.argv[2], process.argv[3] ?? "");
}
