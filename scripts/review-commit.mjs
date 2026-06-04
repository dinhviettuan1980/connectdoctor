/**
 * Auto commit reviewer — gets the latest commit diff, asks Claude to review it,
 * then sends the summary to Telegram + email.
 *
 * Run by GitHub Actions on every push. Can also be run locally:
 *   node scripts/review-commit.mjs
 */

import { execSync } from "child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL = process.env.NOTIFY_EMAIL ?? "tuandv@gmail.com";

function git(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const commitSha = process.env.COMMIT_SHA ?? git("git rev-parse HEAD");
const commitMsg = process.env.COMMIT_MESSAGE ?? git("git log -1 --pretty=%s");
const commitAuthor = process.env.COMMIT_AUTHOR ?? git("git log -1 --pretty=%an");
const branch = process.env.BRANCH_NAME ?? git("git rev-parse --abbrev-ref HEAD");
const repoName = process.env.REPO_NAME ?? "connectdoctor";
const shortSha = commitSha.slice(0, 7);

// Skip automated agent commits to avoid noise loops
if (commitAuthor === "ConnectDoctor Agent") {
  console.log("Skipping review for automated agent commit.");
  process.exit(0);
}

function getDiff() {
  try {
    const parentCount = parseInt(git("git rev-list --count HEAD"), 10);
    if (parentCount < 2) return git("git show --stat HEAD").slice(0, 8000);
    const stat = git("git diff HEAD^ HEAD --stat");
    const full = git("git diff HEAD^ HEAD");
    const combined = stat + "\n\n" + full;
    return combined.length > 8000 ? combined.slice(0, 8000) + "\n...(truncated)" : combined;
  } catch {
    return "(diff unavailable)";
  }
}

const diff = getDiff();

async function reviewWithClaude(diff, commitMsg, author) {
  if (!ANTHROPIC_API_KEY) return null;
  const prompt = `You are a senior developer reviewing a Git commit for ConnectDoctor (React Native + Expo + Firebase telemedicine app).

Commit: "${commitMsg}" by ${author}

Diff:
\`\`\`
${diff.slice(0, 6000)}
\`\`\`

Give a concise code review (max 5 bullet points). Check for:
- Bugs or logic errors
- Security issues
- Performance concerns
- Convention violations (must use NativeWind className, no StyleSheet.create, use project components Card/Button/Chip/Input/AppBar)
- Code quality

Reply in Vietnamese. Use emoji bullets. Be direct and short.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("Claude API error:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Claude request failed:", err.message);
    return null;
  }
}

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[notify] no Telegram config, skipping");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
    const json = await res.json();
    console.log(json.ok ? "[notify] Telegram sent" : `[notify] Telegram failed: ${JSON.stringify(json)}`);
  } catch (err) {
    console.error("[notify] Telegram error:", err.message);
  }
}

async function sendEmail(subject, htmlBody) {
  if (!RESEND_API_KEY) {
    console.log("[notify] no Resend key, skipping email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ConnectDoctor Bot <onboarding@resend.dev>",
        to: [EMAIL],
        subject,
        html: htmlBody,
      }),
    });
    const json = await res.json();
    console.log(json.id ? `[notify] email sent (${json.id})` : `[notify] email failed: ${JSON.stringify(json)}`);
  } catch (err) {
    console.error("[notify] email error:", err.message);
  }
}

const review = await reviewWithClaude(diff, commitMsg, commitAuthor);

const noReviewNote = "Commit mới được push. Thêm <code>ANTHROPIC_API_KEY</code> vào GitHub Secrets để bật AI review.";

const teleMsg = [
  `🔍 <b>Code Review — ${repoName}</b>`,
  ``,
  `🌿 <b>Branch:</b> ${branch}`,
  `👤 <b>Author:</b> ${commitAuthor}`,
  `💬 <b>Commit:</b> ${commitMsg}`,
  `🔑 <b>SHA:</b> <code>${shortSha}</code>`,
  ``,
  review
    ? `📋 <b>AI Review:</b>\n${review}`
    : `📋 ${noReviewNote}`,
].join("\n");

const escapedDiff = diff
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const emailHtml = `
<h2>🔍 Code Review — ${repoName}</h2>
<table style="font-family:sans-serif;border-collapse:collapse">
  <tr><td style="padding:4px 8px;font-weight:bold">Branch</td><td>${branch}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:bold">Author</td><td>${commitAuthor}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:bold">Commit</td><td>${commitMsg}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:bold">SHA</td><td><code>${shortSha}</code></td></tr>
</table>

${
  review
    ? `<h3>📋 AI Review:</h3><p style="white-space:pre-wrap;font-family:sans-serif">${review}</p>`
    : `<p>${noReviewNote}</p>`
}

<details>
  <summary style="cursor:pointer;margin-top:16px">📄 Diff (click to expand)</summary>
  <pre style="font-size:12px;background:#f4f4f4;padding:12px;overflow:auto">${escapedDiff.slice(0, 4000)}</pre>
</details>
`;

await Promise.allSettled([
  sendTelegram(teleMsg),
  sendEmail(`[ConnectDoctor Review] ${commitMsg} (${shortSha})`, emailHtml),
]);

console.log(`Review complete for commit ${shortSha} by ${commitAuthor}.`);
