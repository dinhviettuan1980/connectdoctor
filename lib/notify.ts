const API_BASE = "https://api.tuandv.id.vn";
// Prototype: secret baked in so the app works without extra config. Must match backend.
const SECRET = "c3a526524e98a56e26a9f7b04e26e74b99cdac75c980b9db";

export async function notifyTelegram(subject: string, body = ""): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-secret": SECRET },
      body: JSON.stringify({ text: `🤖 ${subject}\n\n${body}` }),
    });
    const json = await res.json();
    return !!json.ok;
  } catch (err) {
    console.error("[notify]", err);
    return false;
  }
}
