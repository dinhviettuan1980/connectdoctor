import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

const GITHUB_REPO = "dinhviettuan1980/connectdoctor";
const META_DOC = "meta/commitReview";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

function ghHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "connectdoctor-bot",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchRecentCommits(token?: string): Promise<GitHubCommit[]> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=20`,
    { headers: ghHeaders(token) }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<GitHubCommit[]>;
}

async function fetchDiff(sha: string, token?: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits/${sha}`,
    { headers: { ...ghHeaders(token), Accept: "application/vnd.github.diff" } }
  );
  if (!res.ok) return "(diff unavailable)";
  const text = await res.text();
  return text.length > 8000 ? text.slice(0, 8000) + "\n...(truncated)" : text;
}

async function reviewWithClaude(
  diff: string,
  commitMsg: string,
  author: string,
  apiKey: string
): Promise<string | null> {
  const prompt =
    `You are a senior developer reviewing a Git commit for ConnectDoctor ` +
    `(React Native + Expo + Firebase telemedicine app).\n\n` +
    `Commit: "${commitMsg}" by ${author}\n\nDiff:\n\`\`\`\n${diff.slice(0, 6000)}\n\`\`\`\n\n` +
    `Give a concise code review (max 5 bullets). Check for:\n` +
    `- Bugs or logic errors\n- Security issues\n- Performance concerns\n` +
    `- Convention violations (NativeWind className only, no StyleSheet.create, use Card/Button/Chip/Input/AppBar)\n` +
    `- Overall code quality\n\n` +
    `Reply in Vietnamese. Use emoji bullets. Be direct and brief.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("[review] Claude API error:", res.status);
      return null;
    }
    const data = (await res.json()) as { content?: { text: string }[] };
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("[review] Claude request failed:", err);
    return null;
  }
}

async function sendTelegram(token: string, chatId: string, text: string): Promise<void> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const json = (await res.json()) as { ok: boolean };
    if (!json.ok) console.error("[notify] Telegram failed:", JSON.stringify(json));
    else console.log("[notify] Telegram sent");
  } catch (err) {
    console.error("[notify] Telegram error:", err);
  }
}

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ConnectDoctor Bot <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    const json = (await res.json()) as { id?: string };
    if (json.id) console.log(`[notify] email sent (${json.id})`);
    else console.error("[notify] email failed:", JSON.stringify(json));
  } catch (err) {
    console.error("[notify] email error:", err);
  }
}

export const autoReviewCommits = onSchedule(
  { schedule: "every 10 minutes", timeZone: "Asia/Ho_Chi_Minh" },
  async () => {
    const db = admin.firestore();
    const githubToken = process.env.GITHUB_TOKEN;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID ?? "5689839645";
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL ?? "tuandv@gmail.com";

    let commits: GitHubCommit[];
    try {
      commits = await fetchRecentCommits(githubToken);
    } catch (err) {
      console.error("[review] Failed to fetch commits:", err);
      return;
    }

    if (!commits.length) return;

    const metaSnap = await db.doc(META_DOC).get();
    const lastSha = metaSnap.data()?.lastSha as string | undefined;

    const newCommits: GitHubCommit[] = [];
    for (const c of commits) {
      if (c.sha === lastSha) break;
      newCommits.push(c);
    }

    if (!newCommits.length) {
      console.log(`[review] No new commits since ${lastSha?.slice(0, 7) ?? "beginning"}`);
      return;
    }

    console.log(`[review] Processing ${newCommits.length} new commit(s)`);

    for (const commit of newCommits.reverse()) {
      const { sha, commit: { message, author: { name, date } }, html_url } = commit;
      const shortSha = sha.slice(0, 7);
      const commitMsg = message.split("\n")[0];

      if (name === "ConnectDoctor Agent") {
        console.log(`[review] Skipping agent commit ${shortSha}`);
        continue;
      }

      const diff = await fetchDiff(sha, githubToken);
      const review = anthropicKey
        ? await reviewWithClaude(diff, commitMsg, name, anthropicKey)
        : null;

      const timeStr = new Date(date).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      const teleMsg = [
        `🔍 <b>Code Review — connectdoctor</b>`,
        ``,
        `👤 <b>Author:</b> ${name}`,
        `💬 <b>Commit:</b> ${commitMsg}`,
        `🔑 <b>SHA:</b> <code>${shortSha}</code>`,
        `🕐 <b>Time:</b> ${timeStr}`,
        `🔗 <a href="${html_url}">Xem trên GitHub</a>`,
        ``,
        review
          ? `📋 <b>AI Review:</b>\n${review}`
          : `📋 Commit mới — thêm <code>ANTHROPIC_API_KEY</code> vào Firebase config để bật AI review.`,
      ].join("\n");

      const safeMsg = commitMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const emailHtml = `
<h2>🔍 Code Review — connectdoctor</h2>
<table style="border-collapse:collapse;font-family:sans-serif">
  <tr><td style="padding:4px 12px;font-weight:bold">Author</td><td>${name}</td></tr>
  <tr><td style="padding:4px 12px;font-weight:bold">Commit</td><td>${safeMsg}</td></tr>
  <tr><td style="padding:4px 12px;font-weight:bold">SHA</td><td><code>${shortSha}</code></td></tr>
  <tr><td style="padding:4px 12px;font-weight:bold">Time</td><td>${timeStr}</td></tr>
  <tr><td style="padding:4px 12px;font-weight:bold">Link</td><td><a href="${html_url}">${html_url}</a></td></tr>
</table>
${
  review
    ? `<h3>📋 AI Review</h3><p style="white-space:pre-wrap;font-family:sans-serif">${review}</p>`
    : `<p>Chưa cấu hình ANTHROPIC_API_KEY để bật AI review.</p>`
}
<details>
  <summary style="cursor:pointer;margin-top:16px">📄 Diff (click để xem)</summary>
  <pre style="font-size:12px;background:#f4f4f4;padding:12px;overflow:auto">${diff
    .slice(0, 4000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>
</details>`;

      await Promise.allSettled([
        telegramToken
          ? sendTelegram(telegramToken, telegramChatId, teleMsg)
          : Promise.resolve(),
        resendKey
          ? sendEmail(resendKey, notifyEmail, `[ConnectDoctor Review] ${commitMsg} (${shortSha})`, emailHtml)
          : Promise.resolve(),
      ]);

      console.log(`[review] Notified for commit ${shortSha} by ${name}`);
    }

    await db.doc(META_DOC).set({ lastSha: commits[0].sha, updatedAt: Date.now() });
  }
);
