/**
 * Notify helper — sends a message to Telegram + email when a task is done.
 * Used by the agent at the end of a run.
 *
 * Usage:
 *   node scripts/notify.mjs "<subject>" "<body text>"
 *
 * Telegram goes through the backend /notify endpoint, which already has the
 * bot + chat_id + SOCKS5 proxy configured (telegram.js). No token needed locally.
 *
 * Env vars:
 *   NOTIFY_API_BASE     — backend base url (default: https://api.tuandv.id.vn)
 *   NOTIFY_SECRET       — shared secret, must match backend (sent as x-notify-secret)
 *   RESEND_API_KEY      — API key from resend.com (optional email channel)
 *   NOTIFY_EMAIL        — recipient email (default: tuandv@gmail.com)
 */

const subject = process.argv[2] ?? "ConnectDoctor Agent";
const body = process.argv[3] ?? "";
const EMAIL = process.env.NOTIFY_EMAIL ?? "tuandv@gmail.com";
const API_BASE = process.env.NOTIFY_API_BASE ?? "https://api.tuandv.id.vn";
const SECRET = process.env.NOTIFY_SECRET ?? "";

async function sendTelegram() {
  if (!SECRET) { console.log("[notify] NOTIFY_SECRET missing, skipping Telegram"); return; }
  try {
    const res = await fetch(`${API_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-secret": SECRET },
      body: JSON.stringify({ text: `🤖 ${subject}\n\n${body}` }),
    });
    const json = await res.json();
    console.log(json.ok ? "[notify] Telegram sent" : `[notify] Telegram failed: ${JSON.stringify(json)}`);
  } catch (err) {
    console.log(`[notify] Telegram request failed: ${err.message}`);
  }
}

async function sendEmail() {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log("[notify] RESEND_API_KEY missing, skipping email"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: "ConnectDoctor Agent <onboarding@resend.dev>",
      to: [EMAIL],
      subject,
      html: `<h2>${subject}</h2><pre style="font-family:inherit;white-space:pre-wrap">${body}</pre>`,
    }),
  });
  const json = await res.json();
  console.log(json.id ? `[notify] email sent (${json.id})` : `[notify] email failed: ${JSON.stringify(json)}`);
}

await Promise.allSettled([sendTelegram(), sendEmail()]);
