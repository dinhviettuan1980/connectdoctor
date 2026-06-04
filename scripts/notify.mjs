/**
 * Notify helper — sends a message to Telegram + email when a task is done.
 * Used by the agent at the end of a run.
 *
 * Usage:
 *   node scripts/notify.mjs "<subject>" "<body text>"
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — chat id of the recipient (auto-resolved if omitted)
 *   RESEND_API_KEY      — API key from resend.com
 *   NOTIFY_EMAIL        — recipient email (default: tuandv@gmail.com)
 */

const subject = process.argv[2] ?? "ConnectDoctor Agent";
const body = process.argv[3] ?? "";
const EMAIL = process.env.NOTIFY_EMAIL ?? "tuandv@gmail.com";

async function resolveChatId(token) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  // Fall back: take the most recent chat that messaged the bot
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const json = await res.json();
  const updates = json.result ?? [];
  const last = updates[updates.length - 1];
  return last?.message?.chat?.id ?? last?.my_chat_member?.chat?.id ?? null;
}

async function sendTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log("[notify] TELEGRAM_BOT_TOKEN missing, skipping Telegram"); return; }
  const chatId = await resolveChatId(token);
  if (!chatId) { console.log("[notify] no Telegram chat_id (send /start to the bot first)"); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `🤖 ${subject}\n\n${body}` }),
  });
  const json = await res.json();
  console.log(json.ok ? "[notify] Telegram sent" : `[notify] Telegram failed: ${JSON.stringify(json)}`);
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
